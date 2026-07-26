# sweep/ — propose-only ingestion

The sweep gathers publicly visible material about tiles inside the geofence and writes it
to `archive/reports/YYYY-MM-DD/` as **proposed rows**.

**A sweep never writes to `notes/`. A sweep never touches the map.** Canon rule 5.

## Why it exists

External review surfaces (Yelp, Google Maps, Apartments.com, BBB, Nextdoor, local news) hold
lived experience that residents already wrote down somewhere else. Losing it is a waste;
auto-importing it is a lie, because those reviews were written for a different context, under
different terms, and often about a different question. So it gets *proposed*, and a human decides.

## Shape of a proposal

`archive/reports/2026-07-25/proposals.jsonl`, one JSON object per line:

```json
{
  "tile": "lenexa-public-market",
  "source": "https://example.com/the-public-page",
  "source_kind": "local-news",
  "observed_at": "2026-07-25T14:02:00Z",
  "excerpt": "Short quoted excerpt, attributed, within fair use.",
  "suggested_tags": ["busy", "weekend"],
  "status": "proposed"
}
```

`status` is one of `proposed`, `accepted`, `declined`. Declined rows stay in the archive —
the record of what was considered and turned down is part of the durable asset.

## Review pass (human, manual)

1. Read the day's `proposals.jsonl`.
2. For each row: is it about a tile in the geofence, is the source public, is the excerpt fair,
   does publishing it pass canon rule 1 (safety first)?
3. Accepted → append a note block to `notes/<tile>.md` in a pull request, citing the source.
4. Declined → set `status` to `declined`, add `reason`, leave it in place.
5. Never bulk-accept. Never automate step 3.

## Status of the scripts

**Wired, phase 2.** `sweep.py` runs four collectors and writes a dated report. Nothing it
produces reaches the map without a human pull request.

| Collector | Key | Status |
| --- | --- | --- |
| Google Places API (New) | `GOOGLE_PLACES_KEY` | wired; logs `google: skipped: no key` and continues if unset |
| Yelp Fusion API | `YELP_KEY` | wired; logs `yelp: skipped: no key` and continues if unset |
| OSM Overpass | none | wired, always runs, ODbL — attribute © OpenStreetMap contributors |
| City of Lenexa RSS | none | wired, tolerates a 404 quietly |
| Nextdoor | — | **not implemented in v1.** No public API. Posting stays user-initiated through the deep-link button on a tile. Future work: nothing automated; possibly a documented manual paste path. |
| BBB | — | **not implemented in v1.** No public API and the terms do not permit automated collection. The tile links out to a BBB search instead. |
| Apartments.com | — | **not implemented in v1.** Same reason. The tile links out. |

```
python3 sweep/sweep.py                 # everything available
python3 sweep/sweep.py --only osm      # one collector
python3 sweep/sweep.py --dry-run       # print, write nothing
python3 sweep/promote.py               # diff of what promotion WOULD do
```

`sweep/gen_streets.py` is separate and rarely run: it bakes the offline cross-street table
into `assets/panic.js` from Overpass. Run it once per fork, or when the street grid changes.

## Human review pass — `promote.py`

`promote.py` reads a day's proposals and prints a unified diff of `data/tiles.json` as it
would look if those proposals were accepted. **It has no apply mode and will not get one.**
Only keys in its `PROMOTABLE` allowlist can ever reach a tile's `external` object; anything
else is reported and left in the archive. Rows whose tile is `NEW::<name>` are listed as
candidates for a human to name, place, and vouch for — never auto-created.

## The hourly action

`.github/workflows/sweep.yml` runs the sweep hourly and commits `archive/reports/`. It reads
`GOOGLE_PLACES_KEY` and `YELP_KEY` from repository secrets; with no secrets set it still runs,
just with two collectors skipping. **Keys are never committed.** The final step fails the run
if the commit touched `data/tiles.json` or `notes/` — a mechanical enforcement of rule 5.

Constraints on any future implementation:

- Public pages only, respecting each source's terms and `robots.txt`.
- Excerpt, attribute, link. Never mirror a whole review.
- No personal data about note authors beyond what the source already published publicly.
- No owner, landlord, or management fields — ever, at any stage of the pipeline.
- Output path is `archive/reports/`. If a script can write to `notes/`, it is broken.
