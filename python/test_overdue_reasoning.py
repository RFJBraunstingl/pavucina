import io
import json
import subprocess
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs
from zipfile import ZipFile

from overdue_reasoning import build_program, project_report
from reason_overdue import evaluate_program

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
    def test_generates_leaf_facts_and_recursive_rules(self):
        nodes, edges = graph()
        program, ids_by_number, due_by_id = build_program(nodes, edges, TODAY)
        numbers = {task_id: number for number, task_id in ids_by_number.items()}

        self.assertIn("today_date(20260916).", program)
        self.assertIn(f"child({numbers['project']},{numbers['sub']}).", program)
        self.assertIn(f"open_leaf({numbers['late']}).", program)
        self.assertIn(f"open_leaf({numbers['reopened']}).", program)
        self.assertIn(f"due({numbers['late']},20260915).", program)
        self.assertIn(f"due({numbers['today']},20260916).", program)
        self.assertNotIn(f"open_leaf({numbers['done']}).", program)
        self.assertNotIn(f"open_leaf({numbers['sub']}).", program)
        self.assertNotIn(f"due({numbers['undated']}", program)
        self.assertNotIn("child(root", program)
        self.assertIn("D<N.", program)
        self.assertIn("needs_attention(P,T) <- child(P,C), needs_attention(C,T).", program)
        self.assertEqual(due_by_id["top"], "2026-09-15")

    def test_reports_each_ancestor_and_explaining_task(self):
        nodes, edges = graph()
        _, ids_by_number, due_by_id = build_program(nodes, edges, TODAY)
        numbers = {task_id: number for number, task_id in ids_by_number.items()}
        response = {"resultSet": {"needs_attention": [
            [numbers["sub"], numbers["late"]],
            [numbers["project"], numbers["late"]],
            [numbers["project"], numbers["reopened"]],
            [numbers["project"], numbers["late"]],
        ]}}

        report = project_report(response, nodes, edges, ids_by_number, due_by_id, TODAY)

        self.assertEqual(report["asOf"], "2026-09-16")
        self.assertEqual([item["id"] for item in report["projects"]], ["project", "sub"])
        self.assertEqual(
            [item["id"] for item in report["projects"][0]["overdueTasks"]],
            ["reopened", "late"],
        )
        self.assertEqual(report["projects"][0]["overdueTasks"][1], {
            "id": "late", "path": "Launch › Build › Timeline", "due": "2026-09-15",
        })
        self.assertEqual(project_report({"resultSet": {}}, nodes, edges,
                                        ids_by_number, due_by_id, TODAY)["projects"], [])
        with self.assertRaisesRegex(ValueError, "unknown task ID"):
            project_report({"resultSet": {"needs_attention": [[999, 1]]}},
                           nodes, edges, ids_by_number, due_by_id, TODAY)

    def test_rejects_invalid_or_ambiguous_due_dates(self):
        nodes, edges = graph()
        nodes[-2]["properties"]["value"] = "2026-09-31"
        with self.assertRaisesRegex(ValueError, "Invalid planned end date"):
            build_program(nodes, edges, TODAY)

        nodes, edges = graph()
        edges.append(edge("plannedEndDate", "late", "today-date"))
        with self.assertRaisesRegex(ValueError, "multiple planned end dates"):
            build_program(nodes, edges, TODAY)

    def test_posts_form_encoded_program_and_reads_result(self):
        response = {"resultSet": {"needs_attention": [[1, 2]]}}
        with patch("reason_overdue.urlopen", return_value=io.BytesIO(
            json.dumps(response).encode("utf-8")
        )) as request_mock:
            result = evaluate_program("today_date(20260916).", "http://localhost:8080")

        request = request_mock.call_args.args[0]
        self.assertEqual(request.full_url, "http://localhost:8080/evaluate")
        self.assertEqual(parse_qs(request.data.decode()), {
            "program": ["today_date(20260916)."],
        })
        self.assertEqual(result, response)

    def test_cli_generates_program_from_backup(self):
        nodes, edges = graph()
        with tempfile.TemporaryDirectory() as directory:
            backup = Path(directory) / "backup.zip"
            program = Path(directory) / "overdue.vada"
            with ZipFile(backup, "w") as archive:
                archive.writestr("nodes.json", json.dumps(nodes))
                archive.writestr("edges.json", json.dumps(edges))
            command = [
                sys.executable, str(Path(__file__).with_name("reason_overdue.py")),
                str(backup), "--today", TODAY.isoformat(), "--program", str(program),
            ]

            result = subprocess.run(command, capture_output=True, text=True, check=False)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, "")
            self.assertIn("@output(\"needs_attention\").", program.read_text())


if __name__ == "__main__":
    unittest.main()
