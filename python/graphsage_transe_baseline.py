"""Evaluate the existing TransE approach on the same detached leaf tasks."""

import importlib.util

from graph_export import build_labeled_triples, node_entity
from graphsage_data import ranking_metrics


def evaluate_transe(nodes, edges, test_ids, candidates, true_parents, epochs, seed):
    if importlib.util.find_spec("pykeen") is None:
        return None

    import numpy
    from pykeen.models import TransE
    from pykeen.predict import predict_target
    from pykeen.training import SLCWATrainingLoop
    from pykeen.triples import TriplesFactory

    tests = set(test_ids)
    inbox = [node for node in nodes if node["id"] in tests]
    training_nodes = [node for node in nodes if node["id"] not in tests]
    training_edges = [
        edge for edge in edges
        if edge["type"] == "child" and edge["targetId"] not in tests
    ]
    triples = build_labeled_triples(training_nodes, training_edges, inbox)
    factory = TriplesFactory.from_labeled_triples(numpy.asarray(triples, dtype=str))
    model = TransE(triples_factory=factory, embedding_dim=50, random_seed=seed)
    SLCWATrainingLoop(
        model=model, triples_factory=factory, optimizer="Adam",
        optimizer_kwargs={"lr": 0.001},
    ).train(triples_factory=factory, num_epochs=epochs)

    labels = [node_entity(candidate) for candidate in candidates]
    rankings = {}
    for task_id in test_ids:
        frame = predict_target(
            model=model, relation="child", tail=node_entity(task_id),
            triples_factory=factory, targets=labels,
        ).df.sort_values(["score", "head_label"], ascending=[False, True])
        rankings[task_id] = [row.head_label.removeprefix("node:") for row in frame.itertuples()]
    return ranking_metrics(rankings, true_parents)
