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

Stubbed. `sweep.py` is a placeholder that documents the contract and writes an empty dated
report; it fetches nothing yet. Wiring it up is future work and does not change the rules above.

Constraints on any future implementation:

- Public pages only, respecting each source's terms and `robots.txt`.
- Excerpt, attribute, link. Never mirror a whole review.
- No personal data about note authors beyond what the source already published publicly.
- No owner, landlord, or management fields — ever, at any stage of the pipeline.
- Output path is `archive/reports/`. If a script can write to `notes/`, it is broken.
