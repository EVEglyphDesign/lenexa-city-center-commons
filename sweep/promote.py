#!/usr/bin/env python3
"""Show what a promotion would do. Never does it. Canon rule 5.

Reads a day's proposals and prints the diff that a human would be applying to
`data/tiles.json` if they accepted them. It writes nothing, ever — there is no
`--apply` flag and adding one would break the canon this repo runs on.

    python3 sweep/promote.py                 # today
    python3 sweep/promote.py --date 2026-07-25
    python3 sweep/promote.py --tile lenexa-public-market
"""

from __future__ import annotations

import argparse
import copy
import datetime as dt
import difflib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPORTS = ROOT / "archive" / "reports"
TILES = ROOT / "data" / "tiles.json"

FORBIDDEN_FIELDS = {
    "owner", "landlord", "management", "management_company", "property_manager",
    "tenant_name", "resident_name", "complaint_count", "score", "rank",
}

# only these keys are ever allowed into a tile's `external` object
PROMOTABLE = {
    "google_place_id", "google_rating", "google_reviews", "google_primary_type",
    "yelp_id", "yelp_url", "yelp_rating", "yelp_reviews", "yelp_categories",
    "osm_type", "hours", "hours_source",
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--date", default=dt.date.today().isoformat())
    ap.add_argument("--tile", default=None, help="limit to one tile id")
    args = ap.parse_args()

    path = REPORTS / args.date / "proposals.jsonl"
    if not path.exists():
        print(f"no proposals at {path.relative_to(ROOT)} — nothing to review")
        return 0

    rows = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
    rows = [r for r in rows if r.get("status") == "proposed"]
    if args.tile:
        rows = [r for r in rows if r.get("tile") == args.tile]

    doc = json.loads(TILES.read_text())
    before = json.dumps(doc, indent=1).splitlines(keepends=True)
    after_doc = copy.deepcopy(doc)
    index = {f["properties"]["id"]: f for f in after_doc["features"]}

    new_tiles, skipped, applied = [], [], 0
    for r in rows:
        tid = r.get("tile", "")
        fields = {k: v for k, v in (r.get("fields") or {}).items() if v not in (None, "", [])}

        bad = FORBIDDEN_FIELDS & set(fields)
        if bad:
            skipped.append((tid, f"forbidden field(s) {sorted(bad)} — canon rule 4"))
            continue

        if tid.startswith("NEW::"):
            new_tiles.append((tid[5:], r.get("source", ""), fields))
            continue

        feat = index.get(tid)
        if not feat:
            skipped.append((tid, "no such tile"))
            continue

        keep = {k: v for k, v in fields.items() if k in PROMOTABLE}
        dropped = sorted(set(fields) - set(keep))
        if dropped:
            skipped.append((tid, f"not promotable, left in the archive: {dropped}"))
        if not keep:
            continue
        feat["properties"].setdefault("external", {}).update(keep)
        applied += 1

    after = json.dumps(after_doc, indent=1).splitlines(keepends=True)

    print(f"# promotion preview — {args.date}")
    print(f"# {len(rows)} proposed row(s) read, {applied} would touch an existing tile")
    print("# NOTHING IS WRITTEN. This script has no apply mode, on purpose.\n")

    diff = list(difflib.unified_diff(before, after, "data/tiles.json (now)",
                                     "data/tiles.json (if promoted)"))
    if diff:
        print("".join(diff))
    else:
        print("(no change to data/tiles.json)\n")

    if new_tiles:
        print("\n# proposed NEW tiles — these need a human to name, place, and vouch for them")
        for name, src, fields in new_tiles[:60]:
            lat, lon = fields.get("lat"), fields.get("lon")
            print(f"  + {name}   {lat},{lon}   {src}")
        if len(new_tiles) > 60:
            print(f"  … and {len(new_tiles) - 60} more")

    if skipped:
        print("\n# not promoted")
        for tid, why in skipped[:60]:
            print(f"  - {tid}: {why}")
        if len(skipped) > 60:
            print(f"  … and {len(skipped) - 60} more")

    print("\n# To accept any of this: edit data/tiles.json or notes/ by hand, open a pull "
          "request, cite the source. That review is the product.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
