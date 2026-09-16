#!/usr/bin/env python3
"""Report overdue projects from a Pavucina backup using local pyDatalog."""

import argparse
import json
from datetime import date
from pathlib import Path

from graph_export import load_graph_export
from overdue_reasoning import reason_overdue


def iso_day(value):
    try:
        day = date.fromisoformat(value)
        if day.isoformat() == value:
            return day
    except ValueError:
        pass
    raise argparse.ArgumentTypeError("expected a date in YYYY-MM-DD format")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", type=Path, help="Pavucina backup ZIP")
    parser.add_argument("--today", type=iso_day, default=date.today(), help="YYYY-MM-DD")
    args = parser.parse_args()

    try:
        nodes, edges, _ = load_graph_export(args.backup)
        print(json.dumps(reason_overdue(nodes, edges, args.today), indent=2, ensure_ascii=False))
    except (ValueError, OSError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
