"""Find projects with overdue leaf tasks in a Pavucina graph snapshot."""

from datetime import date

from pyDatalog import pyDatalog

from graph_export import graph_tasks, task_details

RULES = """
overdue(T) <= open_leaf(T) & due(T,D) & today_date(N) & (D < N)
needs_attention(P,T) <= child(P,T) & overdue(T)
needs_attention(P,T) <= child(P,C) & needs_attention(C,T)
"""


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


def reason_overdue(nodes, edges, today):
    task_ids = {task["id"] for task in graph_tasks(nodes)}
    children = {
        (edge["sourceId"], edge["targetId"])
        for edge in edges
        if edge["type"] == "child"
        and edge["sourceId"] in task_ids
        and edge["targetId"] in task_ids
    }
    leaf_ids = task_ids - {parent for parent, _ in children}
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
        if edge["type"] != "plannedEndDate" or task_id not in task_ids:
            continue
        if task_id in due_by_id:
            raise ValueError(f"Task {task_id} has multiple planned end dates")
        due_by_id[task_id] = date_nodes.get(edge["targetId"])
        _date_number(due_by_id[task_id])

    pyDatalog.clear()
    pyDatalog.load(RULES)
    pyDatalog.assert_fact("today_date", int(today.strftime("%Y%m%d")))
    for parent, child in sorted(children):
        pyDatalog.assert_fact("child", parent, child)
    for task_id in sorted(leaf_ids - completed_ids):
        pyDatalog.assert_fact("open_leaf", task_id)
    for task_id in sorted(leaf_ids & due_by_id.keys()):
        pyDatalog.assert_fact("due", task_id, _date_number(due_by_id[task_id]))

    answer = pyDatalog.ask("needs_attention(P,T)")
    grouped = {}
    for project_id, task_id in (answer.answers if answer else ()):
        grouped.setdefault(project_id, set()).add(task_id)

    reported_ids = set(grouped)
    for overdue_ids in grouped.values():
        reported_ids.update(overdue_ids)
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
