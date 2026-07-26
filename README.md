# Lenexa City Center Commons

**A place for neighbors to compare notes on Lenexa City Center — restaurants, buildings, events,
city services, everything.**

A neutral, geofenced, publish-only community layer for the roughly 200 acres at the southwest
quadrant of 87th Street Parkway and Renner Boulevard in Lenexa, Kansas — the Copaken Brooks
City Center development. Residents, workers, students, and visitors can add a note about any
building, business, venue, or civic feature inside the geofence. The map renders each tile's
*mood* from the notes people actually wrote, so lived experience — not marketing — determines
how a place looks.

**Live map:** <https://eveglyphdesign.github.io/lenexa-city-center-commons/>

Sibling project, same three-door pattern, same propose-only sweep, geographic instead of
interview-claim scoped: [ARK Peer Review Ledger](https://github.com/EVEglyphDesign/ark-peer-review-ledger).

---

## What this is

- A static map. Open it, click a tile, read the notes, add your own.
- Notes are freeform text plus freeform tags. Categories emerge from tags; nothing is predefined.
- Mood is computed in your browser from those tags — `hopeful`, `warm`, `neutral`, `weathered`, `dim`.
- A tile with zero notes renders **hopeful**: light, unfinished, waiting. Absence of data is not a signal.

## What this is not

- **It notifies no one.** Not Lenexa PD, not code enforcement, not KDHE, not OSHA, not the city.
  Not automatically, not on a threshold, not ever. If you want an authority involved, the
  [Institutional Observer door](docs/three-doors.md#3-institutional-observer) lists the real
  intake channels and you file it yourself, under your own name.
- No landlord field, no management-company field, no owner field. Tiles are keyed by address.
- No "complaints" tab, no "issues" tab, no scores, no ranking of one place against another.
- No accounts, no cookies, no analytics, no tracking, no telemetry.
- No writes into any building's own app or portal. This surface is publish-only.

Read the full [canon](docs/canon.md) — eight rules, and anything that breaks one does not ship.

## Three doors

| Door | Who | What it does |
| --- | --- | --- |
| [Neighbor](docs/three-doors.md#1-neighbor) | anyone who lives, works, or spends time here | adds a note, any tone, any tag |
| [Business Owner](docs/three-doors.md#2-business-owner) | anyone running a place on the map | adds a note with the same weight as any other |
| [Institutional Observer](docs/three-doors.md#3-institutional-observer) | inspectors, journalists, researchers, staff | adds public, citable context — and finds the real intake channel to use themselves |

## How to add a note

1. Open the [map](https://eveglyphdesign.github.io/lenexa-city-center-commons/), click a tile,
   click **Add a note**, pick your door. That opens a GitHub issue form in your browser.
   The page itself transmits nothing — if you close the tab, nothing was sent.
2. Or open a pull request directly against `notes/<tile-id>.md`.
3. Or [open an issue](../../issues/new/choose) from the templates without using the map.

A human moves accepted issues into `notes/`. Nothing is auto-published.

## Repo layout

```
index.html            the map
canon.html            rendered from docs/canon.md
three-doors.html      rendered from docs/three-doors.md
assets/               style.css, map.js, mark.svg
data/tiles.json       anchor tiles + geofence polygon (no owner fields, by canon)
notes/<tile-id>.md    one file per tile, seeded empty
archive/reports/      dated, propose-only sweep output — never on the map
sweep/                the propose-only ingestion pattern (scripts stubbed)
docs/                 canon, three doors, architecture
```

See [docs/architecture.md](docs/architecture.md) for the data model and the mood table.

## Seeded tiles

26 anchor tiles: eight residential (The Domain, The Peaks at Sonoma, WaterCrest, EdgeWater,
Estancia, The LoFTS, plus planned Ross Canyon and The Rise), eight civic and public (Lenexa
Public Market, City Hall / Civic Campus, City Center Library, Farmers Market, Sar-Ko-Par Skate
Park, Life Time, Kiewit HQ campus, Park University), and ten businesses (nine Public Market
merchants plus Jack Stack Barbecue).

Residential tiles are context, **not targets** — they are treated identically to every other tile.
Coordinates are approximate and were placed by hand; corrections by pull request are welcome and
are the fastest way to help.

## Fork it

MIT licensed, public, and designed to be forked. If anyone — including whoever started it —
starts steering this toward a campaign, a target, or an agenda, fork it and carry the neutral
version forward. That exit is the governance.

## Credits and sources

- [Lenexa Public Market](https://www.lenexapublicmarket.com/)
- [City of Lenexa — events and activities](https://www.lenexa.com/Events-Activities)
- [Copaken Brooks — City Center Lenexa](https://www.copaken-brooks.com/our-properties/city-center-lenexa/)
- Basemap © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, © [CARTO](https://carto.com/attributions)
- Pattern source: [EVEglyphDesign/ark-peer-review-ledger](https://github.com/EVEglyphDesign/ark-peer-review-ledger)

*A neighborhood, not a campaign.*
