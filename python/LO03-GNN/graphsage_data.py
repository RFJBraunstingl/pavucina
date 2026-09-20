"""Task-only features and evaluation helpers for inbox placement."""

from hashlib import blake2b
from math import sqrt
from random import Random

from graph_export import TOKEN_PATTERN, graph_tasks, task_details

FEATURE_DIM = 512


def task_text(task):
    properties = task["properties"]
    return f'{properties["name"]} {properties.get("description") or ""}'


def text_features(value):
    """A fixed vocabulary lets a trained model accept newly captured text."""
    features = [0.0] * FEATURE_DIM
    for token in TOKEN_PATTERN.findall(value.casefold()):
        digest = blake2b(token.encode(), digest_size=4).digest()
        slot = int.from_bytes(digest, "big") % FEATURE_DIM
        features[slot] += 1.0
    length = sqrt(sum(number * number for number in features))
    return [number / length for number in features] if length else features


def task_child_edges(nodes, edges):
    ids = {task["id"] for task in graph_tasks(nodes)}
    return [
        (edge["sourceId"], edge["targetId"])
        for edge in edges
        if edge["type"] == "child" and edge["sourceId"] in ids and edge["targetId"] in ids
    ]


def detached_pairs(pairs, excluded_children):
    excluded = set(excluded_children)
    return [(parent, child) for parent, child in pairs if child not in excluded]


def leaf_examples(nodes, edges):
    pairs = task_child_edges(nodes, edges)
    parents = {child: parent for parent, child in pairs}
    non_leaves = {parent for parent, _ in pairs}
    return {child: parent for child, parent in parents.items() if child not in non_leaves}


def split_leaves(examples, seed):
    leaves = sorted(examples)
    if len(leaves) < 2:
        raise ValueError("At least two nested leaf tasks are needed for evaluation")
    Random(seed).shuffle(leaves)
    test_size = max(1, round(len(leaves) * 0.2))
    return leaves[test_size:], leaves[:test_size]


def text_baseline(nodes, edges, child_id, candidates):
    tasks = {task["id"]: task for task in graph_tasks(nodes)}
    child_vector = text_features(task_text(tasks[child_id]))
    scores = {}
    for parent_id in candidates:
        parent = tasks[parent_id]
        context = task_details(nodes, edges, parent_id)["path"]
        description = parent["properties"].get("description") or ""
        parent_vector = text_features(f"{context} {description}")
        scores[parent_id] = sum(a * b for a, b in zip(child_vector, parent_vector))
    return scores


def ranked_parents(scores, nodes, edges, top_k):
    ordered = sorted(scores, key=lambda task_id: (-scores[task_id], task_id))
    return [
        {**task_details(nodes, edges, task_id), "rank": rank, "score": float(scores[task_id])}
        for rank, task_id in enumerate(ordered[:top_k], start=1)
    ]


def ranking_metrics(rankings, true_parents):
    ranks = [ranking.index(true_parents[child]) + 1 for child, ranking in rankings.items()]
    return {
        "queries": len(ranks),
        "recallAt3": sum(rank <= 3 for rank in ranks) / len(ranks),
        "meanReciprocalRank": sum(1 / rank for rank in ranks) / len(ranks),
    }
