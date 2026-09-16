import json
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

from graph_export import build_labeled_triples, load_graph_export, node_entity, task_details


class GraphExportTest(unittest.TestCase):
    def write_backup(self, edges=None):
        nodes = [
            {"id": "root", "type": "root", "properties": {}},
            {"id": "parent", "type": "task", "properties": {"name": "Launch Plan"}},
            {"id": "child", "type": "task", "properties": {"name": "Research"}},
        ]
        inbox = [{
            "id": "inbox",
            "type": "task",
            "properties": {
                "name": "Research launch",
                "description": "Plan details\n\nReview launch notes",
            },
        }]
        relationships = edges or [
            {"id": "one", "type": "child", "sourceId": "root", "targetId": "parent"},
            {"id": "two", "type": "child", "sourceId": "parent", "targetId": "child"},
        ]
        path = Path(self.directory.name) / "backup.zip"
        with ZipFile(path, "w") as archive:
            archive.writestr("nodes.json", json.dumps(nodes))
            archive.writestr("edges.json", json.dumps(relationships))
            archive.writestr("inbox.json", json.dumps(inbox))
        return path

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.directory.cleanup()

    def test_export_becomes_structural_and_text_triples(self):
        nodes, edges, inbox = load_graph_export(self.write_backup())
        triples = build_labeled_triples(nodes, edges, inbox)

        self.assertIn((node_entity("parent"), "child", node_entity("child")), triples)
        self.assertIn((node_entity("inbox"), "pavucina:nameToken", "token:research"), triples)
        self.assertIn((node_entity("inbox"), "pavucina:descriptionToken", "token:details"), triples)
        self.assertIn((node_entity("inbox"), "pavucina:descriptionToken", "token:notes"), triples)
        self.assertNotIn((node_entity("parent"), "pavucina:descriptionToken", "token:details"), triples)
        self.assertEqual(task_details(nodes, edges, "child")["path"], "Launch Plan › Research")

    def test_relationship_endpoints_must_exist(self):
        path = self.write_backup(edges=[{
            "id": "bad", "type": "child", "sourceId": "missing", "targetId": "child",
        }])

        with self.assertRaisesRegex(ValueError, "missing endpoint"):
            load_graph_export(path)


if __name__ == "__main__":
    unittest.main()
