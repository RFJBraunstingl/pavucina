"""Small inductive GraphSAGE ranker for parent-child links."""

from random import Random

import torch
from torch import nn
from torch.nn import functional as F
from torch_geometric.nn import SAGEConv

from graph_export import graph_tasks
from graphsage_data import (
    detached_pairs, ranked_parents, task_child_edges, task_text, text_features,
)


class ParentRanker(nn.Module):
    def __init__(self, feature_dim, embedding_dim):
        super().__init__()
        self.first = SAGEConv(feature_dim, embedding_dim)
        self.second = SAGEConv(embedding_dim, embedding_dim)

    def forward(self, features, edge_index):
        return self.second(self.first(features, edge_index).relu(), edge_index)


def graph_tensors(tasks, pairs, excluded_children=()):
    indices = {task["id"]: index for index, task in enumerate(tasks)}
    features = torch.tensor(
        [text_features(task_text(task)) for task in tasks], dtype=torch.float32,
    )
    return features, indices, edge_tensor(pairs, indices, excluded_children)


def edge_tensor(pairs, indices, excluded_children=()):
    arcs = [
        (indices[parent], indices[child])
        for parent, child in detached_pairs(pairs, excluded_children)
        if parent in indices and child in indices
    ]
    arcs += [(child, parent) for parent, child in arcs]
    if not arcs:
        return torch.empty((2, 0), dtype=torch.long)
    return torch.tensor(arcs, dtype=torch.long).T.contiguous()


def parent_scores(model, features, edge_index, indices, child_id, candidates):
    embeddings = model(features, edge_index)
    child = embeddings[indices[child_id]]
    scores = embeddings[[indices[candidate] for candidate in candidates]] @ child
    return dict(zip(candidates, scores.detach().tolist()))


def train_ranker(
    tasks, pairs, examples, training_ids, hidden_ids, candidate_ids,
    epochs, embedding_dim, seed,
):
    torch.manual_seed(seed)
    features, indices, _ = graph_tensors(tasks, pairs)
    candidates = [task_id for task_id in candidate_ids if task_id not in hidden_ids]
    cases = {}
    for child_id in training_ids:
        choices = [candidate for candidate in candidates if candidate != child_id]
        cases[child_id] = (
            edge_tensor(pairs, indices, [*hidden_ids, child_id]),
            torch.tensor([indices[choice] for choice in choices]),
            choices.index(examples[child_id]),
        )
    model = ParentRanker(features.shape[1], embedding_dim)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    random = Random(seed)
    # ponytail: one full-graph pass per detached leaf; batch episodes if real exports make this slow.
    for _ in range(epochs):
        order = list(training_ids)
        random.shuffle(order)
        for child_id in order:
            edge_index, choice_indices, answer = cases[child_id]
            optimizer.zero_grad()
            embeddings = model(features, edge_index)
            logits = embeddings[choice_indices] @ embeddings[indices[child_id]]
            loss = F.cross_entropy(logits.unsqueeze(0), torch.tensor([answer]))
            loss.backward()
            optimizer.step()
    return model


def inbox_suggestions(model, nodes, edges, inbox, top_k):
    graph_nodes = graph_tasks(nodes)
    candidates = [task["id"] for task in graph_nodes]
    features, indices, edge_index = graph_tensors(
        graph_nodes + inbox, task_child_edges(nodes, edges),
    )
    model.eval()
    with torch.no_grad():
        return [
            {
                "inboxTask": {"id": task["id"], "name": task["properties"]["name"]},
                "suggestedParents": ranked_parents(
                    parent_scores(model, features, edge_index, indices, task["id"], candidates),
                    nodes, edges, top_k,
                ),
            }
            for task in inbox
        ]
