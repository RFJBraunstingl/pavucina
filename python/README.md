# TransE inbox-parent suggestions

This directory contains an offline experiment that trains a
[PyKEEN TransE](https://pykeen.readthedocs.io/en/stable/api/pykeen.models.TransE.html)
model from a Pavucina backup and ranks existing graph tasks as possible parents
for each inbox task. It never changes the backup or the application graph.

## Setup

PyKEEN 1.11.1 requires Python 3.10 or newer.

```sh
python3.10 -m venv python/.venv
source python/.venv/bin/activate
python -m pip install -r python/requirements.txt
```

## Train and predict

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

After installing the requirements in Python 3.10+, use `--epochs 1` for a quick
end-to-end smoke run.
