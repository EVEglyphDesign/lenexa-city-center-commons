# Federation

This repository is a template. Fork it, point it at your own neighborhood, delete our tiles,
seed yours. Nothing here is centralized, so there is nothing to ask permission from. Canon
rule 6 is the whole governance model, and this page is what it looks like in practice.

There is no registry, no directory, no federation server, and no protocol handshake. Two
Commonses federate in the only way that matters: they read the same canon and use the same
file shapes, so a person and their twin can move between them without losing anything.

---

## 1. Naming convention

```
<city>-<neighborhood>-commons
```

Examples: `lenexa-city-center-commons`, `omaha-blackstone-commons`,
`des-moines-east-village-commons`, `wichita-douglas-design-district-commons`.

Lowercase, hyphenated, no state abbreviation unless two cities in your reach collide. The
repo name is also the twin's portability key — keep it boring.

---

## 2. What a fork inherits

**Canon rules 1–19, in full, without amendment.** They live in [`docs/canon.md`](canon.md).
A fork may add rules. A fork may not remove or weaken one and still call itself a Commons.
The rules a fork most often gets asked to break, and must not:

- No accounts, ever (rule 9).
- No auto-notification of any authority, on any threshold (rule 3).
- No landlord, owner, or management field, at any stage of any pipeline (rule 4).
- No server-side capture of queries, locations, or voice (rules 2, 13, 16).
- No claim of having called anyone in the emergency on-ramp (rule 18).

If your city's situation seems to require breaking one of these, the honest move is to build
a different thing under a different name. That is not a loss. That is rule 6 working.

---

## 3. Required fields in `data/tiles.json`

GeoJSON `FeatureCollection`. One `Feature` per tile.

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [-94.7770, 38.9705] },
  "properties": {
    "id": "the-domain-apartments",
    "name": "The Domain Apartments",
    "kind": "residential",
    "address": "Renner Blvd at W 87th St Pkwy area, Lenexa, KS 66219",
    "tags": [],
    "external": {},
    "place_id": null,
    "blurb": "Part of the original City Center plan.",
    "notes_file": "notes/the-domain-apartments.md",
    "coordinates_precision": "approximate — corrections welcome by pull request"
  }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `geometry` | yes | Point, `[lon, lat]`, WGS84. Approximate is fine and should say so. |
| `id` | yes | Slug. Matches the notes filename. Stable forever once published. |
| `name` | yes | What a neighbor calls it out loud. |
| `kind` | yes | One of `residential`, `business`, `civic`. Not a category tree. |
| `address` | yes | Human-readable. Used for the cross-street readout and deep links. |
| `tags` | yes | Array, may be empty. Lens membership. Empty is the hopeful floor. |
| `external` | yes | Object, may be empty. Accepted third-party fields, each attributed. |
| `blurb` | no | One neutral sentence. Never evaluative. |
| `notes_file` | no | Defaults to `notes/<id>.md`. |
| `place_id` | no | Google Place ID, if a human accepted one from a sweep proposal. |

**Forbidden fields, at every layer — tiles, notes, sweep proposals, twin files:**

```
owner  landlord  management  management_company  property_manager
tenant_name  resident_name  complaint_count  score  rank
```

`sweep/sweep.py` refuses to emit a row carrying any of these. Keep that guard in your fork.
It is thirty lines and it is the difference between a neighborhood map and a target list.

### The `external` object

Keys are namespaced by source, and every rendered value must carry visible attribution and a
deep link back to its source. Rule 12.

```json
"external": {
  "google_place_id": "ChIJ...",
  "google_rating": 4.5,
  "google_reviews": 812,
  "yelp_url": "https://www.yelp.com/biz/...",
  "yelp_rating": 4.0,
  "yelp_categories": ["Coffee & Tea"],
  "osm_type": "cafe",
  "hours": "Mon–Fri 7:00–18:00",
  "hours_source": "OpenStreetMap"
}
```

Nothing lands here automatically. The sweep proposes into `archive/reports/`, a human accepts
by pull request. Rule 5.

---

## 4. Notes format

One markdown file per tile at `notes/<id>.md`. Notes are `###` blocks:

```markdown
### 2026-07-25 · door: neighbor

The crossing at 87th and Renner is dark after 8pm in winter.

tags: unlit, unsafe-crossing
```

Permissively licensed, plain text, mirrorable by anyone including the platforms the tile
twins from. Rule 10.

---

## 5. Twin file format — portable across forks

`commons-twin.json`, exported from any Commons, imports into any other:

```json
{
  "format": "commons-twin/1",
  "created": "2026-07-25",
  "lenses": ["third-place"],
  "favorites": ["lenexa-public-market"],
  "trusted_contact": "+19135550123",
  "language": "en"
}
```

- `favorites` are tile ids scoped to the fork that wrote them. A different fork will not
  recognize them and must ignore them silently — never error, never nag, never delete.
- `trusted_contact` and `language` are universal and carry over.
- Importers must sanitize: drop unknown keys, never execute anything, never phone home.
- There is no version negotiation and no migration service. If `format` is unfamiliar, ignore
  the file and say so plainly. Rule 7.

---

## 6. Emergency numbers are local — change them

`assets/panic.js` hard-codes the numbers for Johnson County, Kansas. A fork **must** replace
them before publishing, and should verify each one against a primary source:

| Slot | Lenexa value | Where to verify for your city |
| --- | --- | --- |
| Emergency | `911` | Same across the US. |
| Police non-emergency | `913-477-7301` | Your city's police department contact page. |
| DV shelter, 24h | `913-262-2868` (Safehome) | Your county's shelter, not a national number. |
| Statewide crisis | `1-888-363-2287` (SafeLine Kansas) | Your state coalition. |
| Lifeline | `988` | Same across the US. |
| Community resources | `211` | Same across the US. |

Also regenerate the offline cross-street table for your geofence:

```
python3 sweep/gen_streets.py     # edit BBOX first; writes the literal baked into panic.js
```

That table is what lets the help screen name a cross-street with no network and no third
party. It ships inside the JavaScript on purpose, so the button still works from cache when
the site is unreachable.

---

## 7. Checklist for standing up a fork

1. Fork, rename to `<city>-<neighborhood>-commons`.
2. Draw the geofence polygon in `data/tiles.json`. Keep it walkable — a Commons that spans a
   whole metro is a directory, not a neighborhood.
3. Seed 20–30 anchor tiles. Empty is fine. Hopeful is the floor.
4. Delete `notes/*.md` and regenerate empty note files for your tiles.
5. Replace every number in `assets/panic.js`. Verify each against a primary source.
6. Regenerate the street table with your bounding box.
7. Rewrite `preparedness.html` with your county's hotlines.
8. Leave `docs/canon.md` alone.
9. Turn on GitHub Pages, main branch, root. There is nothing else to deploy.
10. Tell nobody's algorithm. Tell your neighbors.
