import json
import subprocess
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from zipfile import ZipFile

from overdue_reasoning import reason_overdue

TODAY = date(2026, 9, 16)


def task(task_id, name):
    return {"id": task_id, "type": "task", "properties": {"name": name}}


def edge(kind, source, target):
    return {"type": kind, "sourceId": source, "targetId": target}


def graph():
    nodes = [
        {"id": "root", "type": "root", "properties": {}},
        task("project", "Launch"),
        task("sub", "Build"),
        task("late", "Timeline"),
        task("reopened", "Review"),
        task("done", "Finished"),
        task("today", "Today"),
        task("undated", "Undated"),
        task("top", "Top-level"),
        {"id": "old-date", "type": "date", "properties": {"value": "2026-09-15"}},
        {"id": "today-date", "type": "date", "properties": {"value": "2026-09-16"}},
    ]
    edges = [
        edge("child", "root", "project"),
        edge("child", "project", "sub"),
        *(edge("child", "sub", task_id) for task_id in
          ("late", "reopened", "done", "today", "undated")),
        edge("child", "root", "top"),
        *(edge("plannedEndDate", task_id, "old-date") for task_id in
          ("late", "reopened", "done", "top")),
        edge("plannedEndDate", "today", "today-date"),
        edge("markedAsDone", "done", "old-date"),
        edge("wasMarkedAsDone", "reopened", "old-date"),
        edge("markedAsReopened", "reopened", "today-date"),
    ]
    return nodes, edges


class OverdueReasoningTest(unittest.TestCase):
    def test_reports_each_ancestor_and_explaining_task(self):
        nodes, edges = graph()
        report = reason_overdue(nodes, edges, TODAY)

        self.assertEqual(report["asOf"], TODAY.isoformat())
        self.assertEqual([item["id"] for item in report["projects"]], ["project", "sub"])
        for project in report["projects"]:
            self.assertEqual(
                [item["id"] for item in project["overdueTasks"]],
                ["reopened", "late"],
            )
        self.assertEqual(report["projects"][0]["overdueTasks"][1], {
            "id": "late", "path": "Launch › Build › Timeline", "due": "2026-09-15",
        })
        self.assertEqual(report["projects"][1]["path"], "Launch › Build")

    def test_excludes_today_and_clears_facts_between_runs(self):
        nodes, edges = graph()
        self.assertEqual(reason_overdue(nodes, edges, date(2026, 9, 15))["projects"], [])
        self.assertEqual(reason_overdue(nodes, edges, TODAY)["projects"][0]["id"], "project")
        self.assertEqual(reason_overdue([], [], TODAY)["projects"], [])
        self.assertEqual(reason_overdue(nodes, edges, TODAY)["projects"][0]["id"], "project")

    def test_rejects_invalid_or_ambiguous_due_dates(self):
        nodes, edges = graph()
        nodes[-2]["properties"]["value"] = "2026-09-31"
        with self.assertRaisesRegex(ValueError, "Invalid planned end date"):
            reason_overdue(nodes, edges, TODAY)

        nodes, edges = graph()
        edges.append(edge("plannedEndDate", "late", "today-date"))
        with self.assertRaisesRegex(ValueError, "multiple planned end dates"):
            reason_overdue(nodes, edges, TODAY)

    def test_cli_reports_json_from_backup(self):
        nodes, edges = graph()
        with tempfile.TemporaryDirectory() as directory:
            backup = Path(directory) / "backup.zip"
            with ZipFile(backup, "w") as archive:
                archive.writestr("nodes.json", json.dumps(nodes))
                archive.writestr("edges.json", json.dumps(edges))
            command = [
                sys.executable, str(Path(__file__).with_name("reason_overdue.py")),
                str(backup), "--today", TODAY.isoformat(),
            ]

            result = subprocess.run(command, capture_output=True, text=True, check=False)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout), reason_overdue(nodes, edges, TODAY))


if __name__ == "__main__":
    unittest.main()
