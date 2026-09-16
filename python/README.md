# Offline graph experiments

## Vadalog: find projects with overdue work

Download a backup from Preferences, then generate a self-contained Vadalog
program using only the Python standard library:

```sh
python3 python/reason_overdue.py pavucina-backup.zip --today 2026-09-16 --program overdue.vada
```

Omit `--program` to print the program. `--today` defaults to your computer's
local date. An unfinished leaf task is overdue when its planned end date is
before that date; the rules propagate it to every ancestor task. Parent tasks,
inbox tasks, and events do not cause alerts. The program uses numeric task IDs;
the original names and paths stay in the backup.

When a [Vadalog engine](https://docs.prometheux.ai/vadalog/engine-api) is
available, pass its base URL to run the program and print a JSON report with
each affected project's overdue tasks:

```sh
python3 python/reason_overdue.py pavucina-backup.zip --engine-url http://localhost:8080
```

`--engine-url` sends graph structure, deadlines, and completion facts to that
endpoint. This workspace does not include a Vadalog engine, so the program can
be generated and tested here, but engine execution requires one separately.

## Inbox-parent suggestions

These experiments rank existing graph tasks as possible parents for inbox tasks.
They read a Pavucina backup locally and never change the backup or app graph.

## Setup

Use Python 3.11. The GraphSAGE experiment uses PyTorch Geometric's
[SAGEConv](https://pytorch-geometric.readthedocs.io/en/stable/generated/torch_geometric.nn.conv.SAGEConv.html)
with only its base PyTorch dependency; optional PyG acceleration packages are
not needed.

```sh
python3.11 -m venv python/.venv
source python/.venv/bin/activate
python -m pip install -r python/requirements.txt
```

## GraphSAGE: predict new inbox items without retraining

```sh
python python/train_graphsage.py pavucina-backup.zip --output python/artifacts/graphsage
python python/predict_graphsage.py fresh-backup.zip --model-dir python/artifacts/graphsage
```

Training writes `model.pt`, `metadata.json`, `metrics.json`, and
`suggestions.json`. Prediction prints the same suggestions JSON for a fresh
backup; add `--output suggestions.json` to save it. Each candidate includes its
full task path and a ranking score, not a probability. `--epochs`,
`--embedding-dim`, `--top-k`, and `--seed` are available for training.

The model uses task names and descriptions as fixed-size text features, plus
the existing task hierarchy. It trains by detaching leaf tasks, then predicting
their original parent from the remaining graph. The held-out leaves in
`metrics.json` are excluded from training. The file reports Recall@3 and mean
reciprocal rank for GraphSAGE, a text-matching baseline, and TransE when PyKEEN
is installed (`null` otherwise). This is a snapshot proxy, not a historical
future-task test. The bundled eight-task seed is too small to establish quality;
do not integrate suggestions into the app unless real-workspace tests beat the
text baseline. Top-level root placement is outside this first experiment.

## TransE: retrain for new inbox items

Download a backup from Pavucina's Preferences page, then run:

```sh
python python/train_transe.py pavucina-backup.zip --output python/artifacts
```

Useful options are `--epochs`, `--embedding-dim`, `--top-k`, and `--seed`.
The command refuses to reuse a non-empty output directory unless `--overwrite`
is supplied.

The output contains the trained `model.pt`, PyKEEN's `training_triples/`, model
and training `metadata.json`, and `suggestions.json`. Each suggestion contains
the inbox task, ranked candidate parents, their full paths, and raw model scores.
Scores are useful only for ranking; they are not probabilities.

TransE is transductive: it cannot embed a task that was absent during training.
Run the command again with a fresh backup whenever new inbox tasks need
suggestions. Name and description words are added as training triples so inbox
tasks have embeddings even though they have no graph relationships yet.

## Test

The export conversion tests use only the Python standard library:

```sh
python3 -m unittest discover -s python -p 'test_*.py'
```

After installing the requirements, the same command also runs one-epoch
GraphSAGE and TransE smoke tests.
