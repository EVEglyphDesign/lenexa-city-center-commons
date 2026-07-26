#!/usr/bin/env python3
"""Propose-only ingestion sweep. Canon rule 5.

Contract (see sweep/README.md and docs/canon.md):

  * Output goes to archive/reports/YYYY-MM-DD/ only.
  * This script must never write to notes/ and must never modify data/tiles.json.
  * Nothing it produces appears on the public map until a human moves it by pull request.
  * No owner / landlord / management fields, at any stage.
  * A missing API key is not an error. The collector logs "skipped: no key" and the sweep
    carries on. A sweep that cannot run is a sweep that runs empty, honestly.

Collectors:

  google    Google Places API (New)   env GOOGLE_PLACES_KEY   skipped without a key
  yelp      Yelp Fusion API           env YELP_KEY            skipped without a key
  osm       OSM Overpass API          no key needed           always runs
  lenexa    City of Lenexa RSS        no key needed           runs, tolerates 404
  nextdoor  no public API             not implemented in v1
  bbb       no public API             not implemented in v1
  apartments no public API            not implemented in v1

Usage:
    python3 sweep/sweep.py                 # all collectors, today's date
    python3 sweep/sweep.py --only osm      # one collector
    python3 sweep/sweep.py --dry-run       # print, write nothing
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPORTS = ROOT / "archive" / "reports"
TILES = ROOT / "data" / "tiles.json"

FORBIDDEN_FIELDS = {
    "owner", "landlord", "management", "management_company", "property_manager",
    "tenant_name", "resident_name", "complaint_count", "score", "rank",
}

UA = "lenexa-city-center-commons/2.0 (+https://github.com/EVEglyphDesign/lenexa-city-center-commons)"


def log(msg: str) -> None:
    print(msg, flush=True)


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def load_tiles() -> tuple[dict, list[dict]]:
    doc = json.loads(TILES.read_text())
    return doc, [f["properties"] | {"lat": f["geometry"]["coordinates"][1],
                                    "lon": f["geometry"]["coordinates"][0]}
                 for f in doc["features"]]


def guard(rows: list[dict]) -> None:
    """Refuse to emit anything carrying a forbidden field. Canon rule 4."""
    for row in rows:
        bad = FORBIDDEN_FIELDS & set(row)
        bad |= FORBIDDEN_FIELDS & set(row.get("fields", {}))
        if bad:
            sys.exit(f"canon violation: forbidden field(s) {sorted(bad)} in proposal row")


def proposal(tile_id: str, source: str, source_kind: str, fields: dict,
             excerpt: str = "", tags: list[str] | None = None) -> dict:
    return {
        "tile": tile_id,
        "source": source,
        "source_kind": source_kind,
        "observed_at": now(),
        "fields": fields,
        "excerpt": excerpt,
        "suggested_tags": tags or [],
        "status": "proposed",
    }


def fetch(url: str, data=None, headers: dict | None = None, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


# --------------------------------------------------------------------------- collectors

def collect_google(tiles: list[dict]) -> list[dict]:
    key = os.environ.get("GOOGLE_PLACES_KEY", "").strip()
    if not key:
        log("google: skipped: no key")
        return []
    rows = []
    for t in tiles:
        body = json.dumps({
            "textQuery": f"{t['name']} {t.get('address', '')}",
            "locationBias": {"circle": {"center": {"latitude": t["lat"], "longitude": t["lon"]},
                                        "radius": 400.0}},
            "maxResultCount": 1,
        }).encode()
        try:
            raw = fetch(
                "https://places.googleapis.com/v1/places:searchText",
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": key,
                    "X-Goog-FieldMask":
                        "places.id,places.displayName,places.formattedAddress,"
                        "places.rating,places.userRatingCount,places.primaryType,"
                        "places.regularOpeningHours.weekdayDescriptions",
                },
            )
            doc = json.loads(raw)
        except Exception as e:                                    # noqa: BLE001
            log(f"google: {t['id']}: error: {e}")
            continue
        places = doc.get("places") or []
        if not places:
            continue
        p = places[0]
        hours = (p.get("regularOpeningHours") or {}).get("weekdayDescriptions") or []
        rows.append(proposal(
            t["id"],
            f"https://www.google.com/maps/place/?q=place_id:{p.get('id', '')}",
            "google-places",
            {
                "google_place_id": p.get("id"),
                "google_rating": p.get("rating"),
                "google_reviews": p.get("userRatingCount"),
                "google_primary_type": p.get("primaryType"),
                "hours": "; ".join(hours) or None,
                "hours_source": "Google Maps" if hours else None,
            },
        ))
    log(f"google: {len(rows)} proposals")
    return rows


def collect_yelp(tiles: list[dict]) -> list[dict]:
    key = os.environ.get("YELP_KEY", "").strip()
    if not key:
        log("yelp: skipped: no key")
        return []
    rows = []
    for t in tiles:
        qs = urllib.parse.urlencode({
            "term": t["name"], "latitude": t["lat"], "longitude": t["lon"],
            "radius": 800, "limit": 1,
        })
        try:
            raw = fetch("https://api.yelp.com/v3/businesses/search?" + qs,
                        headers={"Authorization": f"Bearer {key}"})
            doc = json.loads(raw)
        except Exception as e:                                    # noqa: BLE001
            log(f"yelp: {t['id']}: error: {e}")
            continue
        biz = (doc.get("businesses") or [None])[0]
        if not biz:
            continue
        rows.append(proposal(
            t["id"], biz.get("url", ""), "yelp-fusion",
            {
                "yelp_id": biz.get("id"),
                "yelp_url": (biz.get("url") or "").split("?")[0],
                "yelp_rating": biz.get("rating"),
                "yelp_reviews": biz.get("review_count"),
                "yelp_categories": [c.get("title") for c in biz.get("categories", [])],
            },
        ))
    log(f"yelp: {len(rows)} proposals")
    return rows


def collect_osm(tiles: list[dict], geofence: dict) -> list[dict]:
    """Overpass. No key, no account, open data. Attribution: © OpenStreetMap contributors."""
    poly = geofence.get("polygon") or []
    if not poly:
        log("osm: skipped: no geofence polygon")
        return []
    lats = [p[0] for p in poly]
    lons = [p[1] for p in poly]
    bbox = f"{min(lats)},{min(lons)},{max(lats)},{max(lons)}"
    q = (
        "[out:json][timeout:60];("
        f'node["name"]["amenity"]({bbox});'
        f'node["name"]["shop"]({bbox});'
        f'way["name"]["building"]({bbox});'
        ");out center tags;"
    )
    try:
        raw = fetch("https://overpass-api.de/api/interpreter",
                    data=urllib.parse.urlencode({"data": q}).encode(), timeout=90)
        doc = json.loads(raw)
    except Exception as e:                                        # noqa: BLE001
        log(f"osm: error: {e}")
        return []

    rows = []
    for el in doc.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name")
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        if not name or lat is None:
            continue
        # nearest existing tile within 120 m, else propose it as a new tile
        best, bestd = None, 1e9
        for t in tiles:
            d = ((t["lat"] - lat) * 111320) ** 2 + ((t["lon"] - lon) * 87000) ** 2
            if d < bestd:
                best, bestd = t, d
        near = best if bestd ** 0.5 < 120 else None
        rows.append(proposal(
            near["id"] if near else f"NEW::{name}",
            f"https://www.openstreetmap.org/{el['type']}/{el['id']}",
            "osm-overpass",
            {
                "osm_type": tags.get("amenity") or tags.get("shop") or tags.get("building"),
                "osm_name": name,
                "hours": tags.get("opening_hours"),
                "hours_source": "OpenStreetMap" if tags.get("opening_hours") else None,
                "lat": round(lat, 6), "lon": round(lon, 6),
                "proposes_new_tile": near is None,
            },
        ))
    log(f"osm: {len(rows)} proposals")
    return rows


def collect_lenexa_rss() -> list[dict]:
    """City of Lenexa news/events feed. Public, no key. 404 is fine — log and move on."""
    feeds = [
        "https://www.lenexa.com/RSSFeed.aspx?ModID=76&CID=All-newsflash.xml",
        "https://www.lenexa.com/RSSFeed.aspx?ModID=58&CID=All-calendar.xml",
    ]
    rows = []
    for url in feeds:
        try:
            raw = fetch(url, timeout=25).decode("utf-8", "replace")
        except Exception as e:                                    # noqa: BLE001
            log(f"lenexa-rss: {url}: unavailable ({e})")
            continue
        import re
        for m in re.finditer(r"<item>(.*?)</item>", raw, re.S):
            block = m.group(1)

            def pick(tag: str) -> str:
                mm = re.search(rf"<{tag}>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</{tag}>", block, re.S)
                return (mm.group(1).strip() if mm else "")[:400]

            title = pick("title")
            if not title:
                continue
            rows.append(proposal(
                "NEW::city-of-lenexa", pick("link") or url, "city-rss",
                {"headline": title, "published": pick("pubDate")},
                excerpt=re.sub(r"<[^>]+>", "", pick("description")),
            ))
    log(f"lenexa-rss: {len(rows)} proposals")
    return rows


NOT_IMPLEMENTED = {
    "nextdoor": "no public API; posting is user-initiated via deep link only. v1 skips it.",
    "bbb": "no public API; terms do not permit automated collection. v1 skips it.",
    "apartments": "no public API; terms do not permit automated collection. v1 skips it.",
}


# --------------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--date", default=dt.date.today().isoformat())
    ap.add_argument("--only", action="append", default=None,
                    choices=["google", "yelp", "osm", "lenexa"],
                    help="run only these collectors (repeatable)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    doc, tiles = load_tiles()
    want = set(args.only or ["google", "yelp", "osm", "lenexa"])

    rows: list[dict] = []
    if "google" in want:
        rows += collect_google(tiles)
    if "yelp" in want:
        rows += collect_yelp(tiles)
    if "osm" in want:
        rows += collect_osm(tiles, doc.get("geofence", {}))
    if "lenexa" in want:
        rows += collect_lenexa_rss()
    for name, why in NOT_IMPLEMENTED.items():
        log(f"{name}: not implemented in v1 — {why}")

    guard(rows)

    if args.dry_run:
        for r in rows:
            print(json.dumps(r))
        log(f"dry run: {len(rows)} proposals, nothing written")
        return 0

    outdir = REPORTS / args.date
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "proposals.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows))
    # a stable JSON array alongside the jsonl, for anything that prefers it
    (outdir / "proposals.json").write_text(json.dumps(rows, indent=1) + "\n")
    (outdir / "README.md").write_text(
        f"# Sweep report {args.date}\n\n"
        f"{len(rows)} proposed row(s). **Nothing here is published.**\n\n"
        "A human review pass moves accepted rows into `notes/` or `data/tiles.json` by pull "
        "request. See [`sweep/README.md`](../../../sweep/README.md) and canon rule 5.\n\n"
        "Run `python3 sweep/promote.py` to see the diff a promotion would make.\n"
    )
    log(f"wrote {outdir} ({len(rows)} proposals, none published)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
