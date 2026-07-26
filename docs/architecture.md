# Architecture

Static files in a public git repository, served by GitHub Pages. No server, no database,
no build step, no accounts, no analytics.

```
lenexa-city-center-commons/
├── index.html              the map surface
├── canon.html              rendered canon (source: docs/canon.md)
├── three-doors.html        rendered doors  (source: docs/three-doors.md)
├── assets/
│   ├── style.css           warm off-white neighborhood styling
│   ├── map.js              Leaflet map, tile drawer, client-side mood
│   └── mark.svg            project mark
├── data/tiles.json         GeoJSON FeatureCollection of anchor tiles + geofence polygon
├── notes/
│   ├── index.json          tile id → note file
│   └── <tile-id>.md        one markdown file per tile (seeded empty)
├── archive/reports/        propose-only sweep output lands here, dated
├── sweep/README.md         the propose-only ingestion pattern
├── docs/                   canon, three doors, this file
└── .github/ISSUE_TEMPLATE/ one issue form per door
```

## Data model

A **tile** is a point inside the geofence, keyed by address (and optionally a Google Place ID).
Fields: `id`, `name`, `kind` (`residential` | `civic` | `business`), `address`, `place_id`,
`blurb`. There is deliberately **no owner, landlord, or management field** — canon rule 4.

A **note** is freeform text plus freeform tags, appended to that tile's markdown file:

```markdown
### 2026-07-25 · door: neighbor
tags: quiet, good-lighting, friendly
The east entrance stays lit all night now. Walking home feels fine.
```

Categories are not predefined. They emerge from whatever tags people actually use.

## Mood rendering

Mood is computed **in the browser**, at page load, from the tags of a tile's notes over a
rolling window (default 365 days). Nothing is precomputed and stored, so no server ever holds
a judgment about a place.

| Mood | Meaning | Render |
| --- | --- | --- |
| `hopeful` | zero notes | light, warm, low-opacity outline — the neutral-hopeful floor |
| `warm` | mostly warm tags | full-color, soft glow |
| `neutral` | mixed or untagged | plain, steady |
| `weathered` | recurring friction tags | slightly muted, textured outline |
| `dim` | sustained friction over the window | softest tone in the palette, still legible and never accusatory |

The tag → mood vocabulary lives in one small table at the top of `assets/map.js` so it can be
read, argued with, and changed by pull request. `weathered` and `dim` are illustrative states,
not verdicts, and no tile is ever ranked against another.

## Submission flow

1. Visitor clicks a tile → drawer opens with the tile's notes.
2. Visitor clicks **Add a note** and picks a door.
3. Their browser opens a prefilled GitHub Issue form. **The page transmits nothing.**
4. A human moves accepted issues into `notes/<tile-id>.md` by pull request.

Anyone with a GitHub account can also open a PR against `notes/` directly.

## Ingestion

See [`sweep/README.md`](../sweep/README.md). Propose-only: sweeps write to
`archive/reports/YYYY-MM-DD/` and never to `notes/`.

## Dependencies

Leaflet 1.9.4 and CARTO Voyager basemap tiles, both from public CDNs, both with attribution.
The basemap is warmed and softened with a CSS filter to get the hand-drawn neighborhood tone.
No other third-party code runs on the page.
