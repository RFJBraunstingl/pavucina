# Running
```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train_transe.py --output out --overwrite --epochs 300 --seed 42 --top 3 pavucina-example-backup.zip
cat out/suggestions.json
```
