# Three doors

The sibling project, [ARK Peer Review Ledger](https://github.com/EVEglyphDesign/ark-peer-review-ledger),
uses a three-door entry pattern: everyone arrives through a door that matches their standing,
and no door outranks another. This repo uses the same pattern, scoped geographically instead
of to interview claims.

All three doors produce the same artifact: a note in `notes/`, weighted identically.

---

## 1. Neighbor

**Who:** anyone who lives, works, studies, shops, eats, or spends time in Lenexa City Center.

**What you can do:** add a note about anywhere inside the geofence — a restaurant, an apartment
building, the library, a sidewalk, an event, a city service, a parking situation, a good morning.
Any tone. Any tag. Praise and friction are both just notes.

**Template:** [`Neighbor note`](../../issues/new?template=neighbor-note.yml)

---

## 2. Business Owner

**Who:** anyone who runs or works for a business, venue, or institution with a tile on the map.

**What you can do:** respond to notes about your place, add context, correct a factual error,
share news, hours, or a change you have made. Your note carries **the same weight** as any other
note. It is not a right of reply that overrides, and it is not a lesser voice either.

There is no verification step and no ownership claim recorded — by canon, this repo stores no
owner field. You are simply a person adding a note who has said which door they came through.

**Template:** [`Business owner response`](../../issues/new?template=business-owner-response.yml)

---

## 3. Institutional Observer

**Who:** inspectors, journalists, researchers, city staff, county staff, or anyone acting in an
institutional capacity.

**What this door does:** it points. It does not submit. This platform never files anything with
any authority on anyone's behalf (canon rule 3). If something on this map suggests a matter for
an existing intake channel, the channel is listed here and you go there yourself.

Existing intake channels, as of publication — verify before relying on them:

| Concern | Where it actually goes |
| --- | --- |
| Mold, air, water, environmental health | Kansas Department of Health and Environment — <https://www.kdhe.ks.gov/> |
| Property maintenance, nuisance, code | City of Lenexa Codes Administration — <https://www.lenexa.com/> |
| Unincorporated / county-level code | Johnson County, Kansas — <https://www.jocogov.org/> |
| Workplace safety | OSHA — <https://www.osha.gov/workers/file-complaint> |
| Public records | Kansas Open Records Act (KORA) request to the holding agency — <https://ag.ks.gov/open-government/kora> |
| Anything else, City of Lenexa | <https://www.lenexa.com/> |
| Emergency | 911. Not this map. |

**Template:** [`Institutional observer note`](../../issues/new?template=institutional-observer.yml)
— for adding public, citable context to a tile. It still just makes a note.

---

## What no door does

- No door notifies an authority.
- No door creates an account.
- No door ranks a place against another place.
- No door records who owns or manages a building.
- No door writes into any building's own app, portal, or ticket system. This surface is publish-only.
