#!/usr/bin/env python3
import argparse
import importlib.metadata
import json
from pathlib import Path

import numpy
from pykeen.models import TransE
from pykeen.predict import predict_target
from pykeen.training import SLCWATrainingLoop
from pykeen.triples import TriplesFactory

from graph_export import (
    build_labeled_triples,
    graph_tasks,
    load_graph_export,
    node_entity,
    task_details,
)


def positive_integer(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return number


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train TransE and suggest parents for Pavucina inbox tasks.",
    )
    parser.add_argument("backup", type=Path, help="Pavucina backup ZIP")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--epochs", type=positive_integer, default=100)
    parser.add_argument("--embedding-dim", type=positive_integer, default=50)
    parser.add_argument("--top-k", type=positive_integer, default=5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def prepare_output(path, overwrite):
    if path.exists() and not path.is_dir():
        raise ValueError(f"Output path is not a directory: {path}")
    if path.exists() and any(path.iterdir()) and not overwrite:
        raise ValueError("Output directory is not empty; pass --overwrite to reuse it")
    path.mkdir(parents=True, exist_ok=True)


def parent_suggestions(model, factory, nodes, edges, inbox, top_k):
    candidates = graph_tasks(nodes)
    labels = [node_entity(task["id"]) for task in candidates]
    details = {
        node_entity(task["id"]): task_details(nodes, edges, task["id"])
        for task in candidates
    }
    suggestions = []
    for task in inbox:
        frame = predict_target(
            model=model,
            relation="child",
            tail=node_entity(task["id"]),
            triples_factory=factory,
            targets=labels,
        ).df.sort_values(["score", "head_label"], ascending=[False, True])
        parents = []
        for rank, row in enumerate(frame.head(top_k).itertuples(), start=1):
            parents.append({**details[row.head_label], "rank": rank, "score": float(row.score)})
        suggestions.append({
            "inboxTask": {"id": task["id"], "name": task["properties"]["name"]},
            "suggestedParents": parents,
        })
    return suggestions


def write_json(path, value):
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main():
    args = parse_args()
    try:
        prepare_output(args.output, args.overwrite)
        nodes, edges, inbox = load_graph_export(args.backup)
        triples = build_labeled_triples(nodes, edges, inbox)
        if not triples:
            raise ValueError("The export does not contain trainable triples")
        if not graph_tasks(nodes):
            raise ValueError("The export does not contain candidate parent tasks")
        if not any(relation == "child" for _, relation, _ in triples):
            raise ValueError("The export does not contain a child relationship")
    except ValueError as error:
        raise SystemExit(str(error)) from error

    factory = TriplesFactory.from_labeled_triples(numpy.asarray(triples, dtype=str))
    model = TransE(
        triples_factory=factory,
        embedding_dim=args.embedding_dim,
        random_seed=args.seed,
    )
    losses = SLCWATrainingLoop(
        model=model,
        triples_factory=factory,
        optimizer="Adam",
        optimizer_kwargs={"lr": 0.001},
    ).train(triples_factory=factory, num_epochs=args.epochs)
    suggestions = parent_suggestions(
        model, factory, nodes, edges, inbox, args.top_k,
    )

    model.save_state(args.output / "model.pt")
    factory.to_path_binary(args.output / "training_triples")
    write_json(args.output / "suggestions.json", {"suggestions": suggestions})
    write_json(args.output / "metadata.json", {
        "formatVersion": 1,
        "library": {"pykeen": importlib.metadata.version("pykeen")},
        "model": "TransE",
        "configuration": {
            "embeddingDimension": args.embedding_dim,
            "epochs": args.epochs,
            "learningRate": 0.001,
            "seed": args.seed,
        },
        "counts": {"triples": len(triples), "graphTasks": len(graph_tasks(nodes)),
                   "inboxTasks": len(inbox)},
        "losses": losses or [],
    })
    print(f"Saved model and {len(suggestions)} inbox prediction sets to {args.output}")


if __name__ == "__main__":
    main()
