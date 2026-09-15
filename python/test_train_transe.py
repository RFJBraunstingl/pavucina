import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

PYKEEN_AVAILABLE = (
    sys.version_info >= (3, 10) and importlib.util.find_spec("pykeen") is not None
)


@unittest.skipUnless(PYKEEN_AVAILABLE, "requires Python 3.10+ and PyKEEN")
class TrainTransESmokeTest(unittest.TestCase):
    def test_one_epoch_writes_model_and_suggestions(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            backup = temporary / "backup.zip"
            output = temporary / "artifacts"
            nodes = [
                {"id": "root", "type": "root", "properties": {}},
                {"id": "parent", "type": "task", "properties": {"name": "Plan"}},
                {"id": "child", "type": "task", "properties": {"name": "Research"}},
            ]
            edges = [
                {
                    "id": "one",
                    "type": "child",
                    "sourceId": "root",
                    "targetId": "parent",
                },
                {
                    "id": "two",
                    "type": "child",
                    "sourceId": "parent",
                    "targetId": "child",
                },
            ]
            inbox = [
                {"id": "inbox", "type": "task", "properties": {"name": "Research plan"}},
            ]
            with ZipFile(backup, "w") as archive:
                archive.writestr("nodes.json", json.dumps(nodes))
                archive.writestr("edges.json", json.dumps(edges))
                archive.writestr("inbox.json", json.dumps(inbox))

            result = subprocess.run(
                [
                    sys.executable,
                    str(Path(__file__).with_name("train_transe.py")),
                    str(backup),
                    "--output",
                    str(output),
                    "--epochs",
                    "1",
                    "--top-k",
                    "1",
                ],
                check=False,
                capture_output=True,
                text=True,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((output / "model.pt").is_file())
            self.assertTrue((output / "training_triples").is_dir())
            self.assertTrue((output / "metadata.json").is_file())
            suggestions = json.loads(
                (output / "suggestions.json").read_text(encoding="utf-8")
            )
            self.assertEqual(suggestions["suggestions"][0]["inboxTask"]["id"], "inbox")
            self.assertEqual(len(suggestions["suggestions"][0]["suggestedParents"]), 1)


if __name__ == "__main__":
    unittest.main()
