import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

DEPENDENCIES_AVAILABLE = (
    sys.version_info >= (3, 10)
    and importlib.util.find_spec("torch") is not None
    and importlib.util.find_spec("torch_geometric") is not None
)


@unittest.skipUnless(DEPENDENCIES_AVAILABLE, "requires Python 3.10+, Torch, and PyG")
class TrainGraphSageSmokeTest(unittest.TestCase):
    def test_train_then_predict_a_new_inbox_task_without_retraining(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            nodes = [
                {"id": "root", "type": "root", "properties": {}},
                *[
                    {"id": name, "type": "task", "properties": {"name": name}}
                    for name in ("research", "release", "interview", "survey", "deploy", "announce")
                ],
            ]
            edges = [
                {"type": "child", "sourceId": parent, "targetId": child}
                for parent, child in (
                    ("root", "research"), ("root", "release"),
                    ("research", "interview"), ("research", "survey"),
                    ("release", "deploy"), ("release", "announce"),
                )
            ]

            def backup(path, inbox_id):
                with ZipFile(path, "w") as archive:
                    archive.writestr("nodes.json", json.dumps(nodes))
                    archive.writestr("edges.json", json.dumps(edges))
                    archive.writestr("inbox.json", json.dumps([{
                        "id": inbox_id, "type": "task",
                        "properties": {"name": "New research", "description": "Interview participants"},
                    }]))

            first_backup = temporary / "first.zip"
            second_backup = temporary / "second.zip"
            output = temporary / "artifacts"
            backup(first_backup, "inbox-first")
            backup(second_backup, "inbox-new")
            train = subprocess.run([
                sys.executable, str(Path(__file__).with_name("train_graphsage.py")),
                str(first_backup), "--output", str(output), "--epochs", "1",
            ], capture_output=True, text=True, check=False)
            self.assertEqual(train.returncode, 0, train.stderr)
            self.assertTrue((output / "model.pt").is_file())
            metrics = json.loads((output / "metrics.json").read_text(encoding="utf-8"))
            self.assertIn("graphSage", metrics)
            self.assertIn("textMatching", metrics)

            predict = subprocess.run([
                sys.executable, str(Path(__file__).with_name("predict_graphsage.py")),
                str(second_backup), "--model-dir", str(output), "--top-k", "2",
            ], capture_output=True, text=True, check=False)
            self.assertEqual(predict.returncode, 0, predict.stderr)
            suggestions = json.loads(predict.stdout)["suggestions"]
            self.assertEqual(suggestions[0]["inboxTask"]["id"], "inbox-new")
            self.assertEqual(len(suggestions[0]["suggestedParents"]), 2)


if __name__ == "__main__":
    unittest.main()
