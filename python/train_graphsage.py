#!/usr/bin/env python3
"""Train an offline GraphSAGE parent ranker from a Pavucina backup."""

import argparse
import json
from pathlib import Path

import torch

from graph_export import graph_tasks, load_graph_export
from graphsage_data import (
    FEATURE_DIM, leaf_examples, ranking_metrics, split_leaves,
    task_child_edges, text_baseline,
)
from graphsage_model import graph_tensors, inbox_suggestions, parent_scores, train_ranker
from graphsage_transe_baseline import evaluate_transe


def positive_integer(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return number


def parse_args():
    parser = argparse.ArgumentParser(
        description="Evaluate GraphSAGE and suggest parents for new inbox tasks.",
    )
    parser.add_argument("backup", type=Path, help="Pavucina backup ZIP")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--epochs", type=positive_integer, default=30)
    parser.add_argument("--embedding-dim", type=positive_integer, default=32)
    parser.add_argument("--top-k", type=positive_integer, default=5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def ordered_ids(scores):
    return sorted(scores, key=lambda task_id: (-scores[task_id], task_id))


def evaluate(model, tasks, pairs, nodes, edges, candidates, test_ids, examples):
    features, indices, edge_index = graph_tensors(tasks, pairs, test_ids)
    model.eval()
    with torch.no_grad():
        graph_rankings = {
            task_id: ordered_ids(
                parent_scores(model, features, edge_index, indices, task_id, candidates)
            )
            for task_id in test_ids
        }
    text_rankings = {
        task_id: ordered_ids(text_baseline(nodes, edges, task_id, candidates))
        for task_id in test_ids
    }
    return {
        "graphSage": ranking_metrics(graph_rankings, examples),
        "textMatching": ranking_metrics(text_rankings, examples),
    }


def main():
    args = parse_args()
    try:
        nodes, edges, inbox = load_graph_export(args.backup)
        graph_tasks_only = graph_tasks(nodes)
        examples = leaf_examples(nodes, edges)
        train_ids, test_ids = split_leaves(examples, args.seed)
        if args.output.exists() and not args.output.is_dir():
            raise ValueError(f"Output path is not a directory: {args.output}")
        if args.output.exists() and any(args.output.iterdir()) and not args.overwrite:
            raise ValueError("Output directory is not empty; pass --overwrite to reuse it")
    except ValueError as error:
        raise SystemExit(str(error)) from error

    torch.set_num_threads(1)
    tasks = graph_tasks_only
    pairs = task_child_edges(nodes, edges)
    graph_ids = [task["id"] for task in graph_tasks_only]
    candidates = [task_id for task_id in graph_ids if task_id not in test_ids]
    evaluation_model = train_ranker(
        tasks, pairs, examples, train_ids, test_ids, graph_ids,
        args.epochs, args.embedding_dim, args.seed,
    )
    metrics = evaluate(
        evaluation_model, tasks, pairs, nodes, edges,
        candidates, test_ids, examples,
    )
    metrics["transE"] = evaluate_transe(
        nodes, edges, test_ids, candidates, examples, args.epochs, args.seed,
    )
    metrics["heldOutTaskIds"] = test_ids

    model = train_ranker(
        tasks, pairs, examples, list(examples), [], graph_ids,
        args.epochs, args.embedding_dim, args.seed,
    )
    suggestions = inbox_suggestions(model, nodes, edges, inbox, args.top_k)

    args.output.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), args.output / "model.pt")
    write_json(args.output / "suggestions.json", {"suggestions": suggestions})
    write_json(args.output / "metrics.json", metrics)
    write_json(args.output / "metadata.json", {
        "model": "GraphSAGE", "epochs": args.epochs,
        "embeddingDimension": args.embedding_dim,
        "featureDimension": FEATURE_DIM, "seed": args.seed,
        "graphTasks": len(graph_ids), "inboxTasks": len(inbox),
        "trainingLeaves": len(examples), "evaluationHeldOutLeaves": len(test_ids),
    })
    print(f"Saved model, metrics, and {len(suggestions)} inbox suggestion sets to {args.output}")


if __name__ == "__main__":
    main()
