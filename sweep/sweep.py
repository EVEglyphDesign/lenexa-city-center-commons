#!/usr/bin/env python3
"""Propose-only sweep — STUB.

Contract (see sweep/README.md and docs/canon.md rule 5):

  * Output goes to archive/reports/YYYY-MM-DD/ only.
  * This script must never write to notes/ and must never modify data/tiles.json.
  * Nothing it produces appears on the public map until a human moves it by pull request.
  * No owner / landlord / management fields, at any stage.

Right now it fetches nothing. It creates the dated directory and an empty
proposals.jsonl so the shape of the pipeline is visible and reviewable.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPORTS = ROOT / "archive" / "reports"
FORBIDDEN_FIELDS = {"owner", "landlord", "management", "management_company", "property_manager"}


def guard(rows: list[dict]) -> None:
    """Refuse to emit anything carrying a forbidden field. Canon rule 4."""
    for row in rows:
        bad = FORBIDDEN_FIELDS & set(row)
        if bad:
            sys.exit(f"canon violation: forbidden field(s) {sorted(bad)} in proposal row")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--date", default=dt.date.today().isoformat())
    args = ap.parse_args()

    outdir = REPORTS / args.date
    outdir.mkdir(parents=True, exist_ok=True)

    rows: list[dict] = []  # no collectors wired yet
    guard(rows)

    (outdir / "proposals.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows)
    )
    (outdir / "README.md").write_text(
        f"# Sweep report {args.date}\n\n"
        f"{len(rows)} proposed row(s). Nothing here is published. "
        "A human review pass moves accepted rows into `notes/` by pull request.\n"
    )
    print(f"wrote {outdir} ({len(rows)} proposals, none published)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
