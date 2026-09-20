import unittest

from graphsage_data import (
    detached_pairs, leaf_examples, ranked_parents, ranking_metrics, split_leaves,
    task_child_edges, task_text, text_baseline, text_features,
)


class GraphSageDataTest(unittest.TestCase):
    def setUp(self):
        self.nodes = [
            {"id": "root", "type": "root", "properties": {}},
            {"id": "parent", "type": "task", "properties": {"name": "Research"}},
            {"id": "other", "type": "task", "properties": {"name": "Release"}},
            {"id": "leaf-a", "type": "task", "properties": {"name": "Interview users", "description": "Research goals"}},
            {"id": "leaf-b", "type": "task", "properties": {"name": "Analyze interviews"}},
            {"id": "leaf-c", "type": "task", "properties": {"name": "Ship update"}},
        ]
        self.edges = [
            {"type": "child", "sourceId": "root", "targetId": "parent"},
            {"type": "child", "sourceId": "root", "targetId": "other"},
            {"type": "child", "sourceId": "parent", "targetId": "leaf-a"},
            {"type": "child", "sourceId": "parent", "targetId": "leaf-b"},
            {"type": "child", "sourceId": "other", "targetId": "leaf-c"},
            {"type": "plannedStartDate", "sourceId": "leaf-a", "targetId": "date"},
        ]

    def test_only_nested_leaf_links_become_examples(self):
        examples = leaf_examples(self.nodes, self.edges)
        self.assertEqual(examples, {"leaf-a": "parent", "leaf-b": "parent", "leaf-c": "other"})
        pairs = task_child_edges(self.nodes, self.edges)
        self.assertNotIn(("root", "parent"), pairs)
        self.assertNotIn(("parent", "leaf-a"), detached_pairs(pairs, ["leaf-a"]))
        self.assertIn(("parent", "leaf-b"), detached_pairs(pairs, ["leaf-a"]))
        training, held_out = split_leaves(examples, 42)
        self.assertEqual(set(training) | set(held_out), set(examples))
        self.assertFalse(set(training) & set(held_out))

    def test_descriptions_and_paths_contribute_to_text_baseline(self):
        task = self.nodes[3]
        self.assertNotEqual(text_features(task["properties"]["name"]), text_features(task_text(task)))
        scores = text_baseline(self.nodes, self.edges, "leaf-a", ["parent", "other"])
        self.assertGreater(scores["parent"], scores["other"])

    def test_metrics_use_the_full_parent_ranking(self):
        rankings = {"leaf-a": ["parent", "other"], "leaf-c": ["parent", "other"]}
        metrics = ranking_metrics(rankings, {"leaf-a": "parent", "leaf-c": "other"})
        self.assertEqual(metrics, {"queries": 2, "recallAt3": 1.0, "meanReciprocalRank": 0.75})
        suggestions = ranked_parents({"other": 0.1, "parent": 0.8}, self.nodes, self.edges, 1)
        self.assertEqual(suggestions[0]["path"], "Research")
        self.assertEqual(suggestions[0]["rank"], 1)


if __name__ == "__main__":
    unittest.main()
