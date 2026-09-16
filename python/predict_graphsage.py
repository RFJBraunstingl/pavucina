#!/usr/bin/env python3
"""Rank newly captured inbox tasks without retraining GraphSAGE."""

import argparse
import json
from pathlib import Path

import torch

from graph_export import load_graph_export
from graphsage_data import FEATURE_DIM
from graphsage_model import ParentRanker, inbox_suggestions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", type=Path, help="A fresh Pavucina backup ZIP")
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--output", type=Path, help="Write JSON here instead of stdout")
    args = parser.parse_args()
    if args.top_k < 1:
        parser.error("--top-k must be positive")
    if args.output and args.output.exists():
        parser.error("Output already exists; choose a new file")

    nodes, edges, inbox = load_graph_export(args.backup)
    if not any(node["type"] == "task" for node in nodes):
        parser.error("The backup contains no candidate parent tasks")
    metadata = json.loads((args.model_dir / "metadata.json").read_text(encoding="utf-8"))
    if (
        metadata.get("model") != "GraphSAGE"
        or metadata.get("featureDimension") != FEATURE_DIM
    ):
        parser.error("The model directory does not contain a GraphSAGE model")
    model = ParentRanker(FEATURE_DIM, metadata["embeddingDimension"])
    weights = torch.load(args.model_dir / "model.pt", map_location="cpu", weights_only=True)
    model.load_state_dict(weights)
    result = {"suggestions": inbox_suggestions(model, nodes, edges, inbox, args.top_k)}
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.write_text(payload, encoding="utf-8")
    else:
        print(payload, end="")


if __name__ == "__main__":
    main()
