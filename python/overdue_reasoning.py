"""Turn a Pavucina graph snapshot into overdue-project Vadalog facts."""

from datetime import date
from pathlib import Path

from graph_export import graph_tasks, task_details

RULES = Path(__file__).with_name("overdue.vada").read_text(encoding="utf-8")


def _date_number(value):
    if not isinstance(value, str):
        raise ValueError("A planned end date is missing or invalid")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"Invalid planned end date: {value}") from error
    if parsed.isoformat() != value:
        raise ValueError(f"Invalid planned end date: {value}")
    return int(value.replace("-", ""))


def build_program(nodes, edges, today):
    task_ids = sorted(task["id"] for task in graph_tasks(nodes))
    numbers = {task_id: number for number, task_id in enumerate(task_ids, 1)}
    ids_by_number = {number: task_id for task_id, number in numbers.items()}
    child_pairs = sorted({
        (edge["sourceId"], edge["targetId"])
        for edge in edges
        if edge["type"] == "child"
        and edge["sourceId"] in numbers
        and edge["targetId"] in numbers
    })
    leaf_ids = set(task_ids) - {parent for parent, _ in child_pairs}
    completed_ids = {
        edge["sourceId"] for edge in edges if edge["type"] == "markedAsDone"
    }
    date_nodes = {
        node["id"]: node["properties"].get("value")
        for node in nodes if node["type"] == "date"
    }
    due_by_id = {}
    for edge in edges:
        task_id = edge["sourceId"]
        if edge["type"] != "plannedEndDate" or task_id not in numbers:
            continue
        if task_id in due_by_id:
            raise ValueError(f"Task {task_id} has multiple planned end dates")
        due_by_id[task_id] = date_nodes.get(edge["targetId"])
        _date_number(due_by_id[task_id])

    facts = [f"today_date({int(today.strftime('%Y%m%d'))})."]
    facts.extend(f"child({numbers[parent]},{numbers[child]})." for parent, child in child_pairs)
    facts.extend(f"open_leaf({numbers[task_id]})." for task_id in sorted(leaf_ids - completed_ids))
    facts.extend(
        f"due({numbers[task_id]},{_date_number(due_by_id[task_id])})."
        for task_id in sorted(leaf_ids & due_by_id.keys())
    )
    return "\n".join([*facts, "", RULES]), ids_by_number, due_by_id


def project_report(response, nodes, edges, ids_by_number, due_by_id, today):
    result_set = response.get("resultSet") if isinstance(response, dict) else None
    rows = result_set.get("needs_attention", []) if isinstance(result_set, dict) else None
    if not isinstance(rows, list):
        raise ValueError("Vadalog returned an invalid needs_attention result")

    grouped = {}
    for row in rows:
        if (not isinstance(row, list) or len(row) != 2
                or any(type(number) is not int or number not in ids_by_number for number in row)):
            raise ValueError("Vadalog returned an unknown task ID")
        project_id, task_id = (ids_by_number[number] for number in row)
        if task_id not in due_by_id:
            raise ValueError("Vadalog returned a task without a due date")
        grouped.setdefault(project_id, set()).add(task_id)

    reported_ids = set(grouped)
    for task_ids in grouped.values():
        reported_ids.update(task_ids)
    details = {task_id: task_details(nodes, edges, task_id) for task_id in reported_ids}
    ordered = lambda task_id: (details[task_id]["path"].casefold(), task_id)
    return {
        "asOf": today.isoformat(),
        "projects": [
            {
                "id": project_id,
                "path": details[project_id]["path"],
                "overdueTasks": [
                    {"id": task_id, "path": details[task_id]["path"], "due": due_by_id[task_id]}
                    for task_id in sorted(grouped[project_id], key=ordered)
                ],
            }
            for project_id in sorted(grouped, key=ordered)
        ],
    }
