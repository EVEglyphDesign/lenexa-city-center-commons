#!/usr/bin/env python3
"""Bake the offline cross-street table into assets/panic.js. Build-time only.

The help screen names the two nearest crossing streets with no network call, so it works
from cache when this site is unreachable. That means the street geometry has to ship inside
the JavaScript. This script fetches it once from OpenStreetMap (Overpass), decimates it, and
rewrites the `var STREETS = [...]` literal in assets/panic.js in place.

Run it when you fork the repo for another city, after editing BBOX. Not run at runtime.
Data © OpenStreetMap contributors, ODbL.

    python3 sweep/gen_streets.py
    python3 sweep/gen_streets.py --check     # print what it would do, change nothing
"""

from __future__ import annotations

import argparse
import collections
import json
import pathlib
import re
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
PANIC = ROOT / "assets" / "panic.js"

# s, w, n, e — Lenexa City Center plus a walk's worth of padding
BBOX = (38.9600, -94.7900, 38.9830, -94.7700)

MAX_POINTS_PER_STREET = 48
UA = "lenexa-city-center-commons/2.0 (build-time street index)"


def fetch() -> dict:
    q = f"""
    [out:json][timeout:60];
    way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street)$"]["name"]
      ({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
    out geom;
    """
    req = urllib.request.Request(
        "https://overpass-api.de/api/interpreter",
        data=urllib.parse.urlencode({"data": q}).encode(),
        headers={"User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def build(doc: dict) -> list:
    pts = collections.defaultdict(set)
    for el in doc.get("elements", []):
        name = el.get("tags", {}).get("name")
        for p in el.get("geometry") or []:
            if name:
                pts[name].add((round(p["lat"], 4), round(p["lon"], 4)))
    out = []
    for name in sorted(pts):
        ps = sorted(pts[name])
        step = max(1, len(ps) // MAX_POINTS_PER_STREET)
        out.append([name, [[a, b] for a, b in ps[::step]]])
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    table = build(fetch())
    literal = json.dumps(table, separators=(",", ":"))
    print(f"{len(table)} streets, {sum(len(t[1]) for t in table)} points, "
          f"{len(literal)} bytes of literal")

    if args.check:
        print("--check: assets/panic.js not modified")
        return 0

    src = PANIC.read_text()
    new, n = re.subn(r"var STREETS = .*?;\n", "var STREETS = " + literal + ";\n", src,
                     count=1, flags=re.S)
    if n != 1:
        raise SystemExit("could not find the `var STREETS = ...;` line in assets/panic.js")
    PANIC.write_text(new)
    print("rewrote assets/panic.js")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
