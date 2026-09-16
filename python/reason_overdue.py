#!/usr/bin/env python3
"""Generate or run overdue-project reasoning from a Pavucina backup."""

import argparse
import json
from datetime import date
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

from graph_export import load_graph_export
from overdue_reasoning import build_program, project_report


def iso_day(value):
    try:
        day = date.fromisoformat(value)
        if day.isoformat() == value:
            return day
    except ValueError:
        pass
    raise argparse.ArgumentTypeError("expected a date in YYYY-MM-DD format")


def evaluate_program(program, engine_url):
    parsed = urlsplit(engine_url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError("Engine URL must be an HTTP(S) base URL without a query or fragment")
    request = Request(
        engine_url.rstrip("/") + "/evaluate",
        data=urlencode({"program": program}).encode("utf-8"),
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as error:
        detail = error.read(2048).decode("utf-8", errors="replace").strip()
        raise ValueError(f"Vadalog HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise ValueError(f"Could not reach Vadalog: {error.reason}") from error
    except json.JSONDecodeError as error:
        raise ValueError("Vadalog returned invalid JSON") from error


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", type=Path, help="Pavucina backup ZIP")
    parser.add_argument("--today", type=iso_day, default=date.today(), help="YYYY-MM-DD")
    parser.add_argument("--program", type=Path, help="Save the generated Vadalog program")
    parser.add_argument("--engine-url", help="Vadalog engine base URL, such as http://localhost:8080")
    args = parser.parse_args()

    try:
        nodes, edges, _ = load_graph_export(args.backup)
        program, ids_by_number, due_by_id = build_program(nodes, edges, args.today)
        if args.program:
            args.program.write_text(program, encoding="utf-8")
        if args.engine_url:
            result = evaluate_program(program, args.engine_url)
            report = project_report(result, nodes, edges, ids_by_number, due_by_id, args.today)
            print(json.dumps(report, indent=2, ensure_ascii=False))
        elif not args.program:
            print(program, end="")
    except (ValueError, OSError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
