# Canon

These eight rules govern this repository and the map it publishes. They are inherited
from the EVE Glyph Design working canon and from the sibling project,
[ARK Peer Review Ledger](https://github.com/EVEglyphDesign/ark-peer-review-ledger).

Anything that conflicts with a rule below does not ship. If a future change to this
repo violates one of these, fork it.

---

## 1. Safety-first, betterment-second

Safety is rank 1. Betterment is rank 2. Everything else is rank 3 or lower.
A feature that increases reach, engagement, or completeness but fails safety does not ship.

## 2. Sovereign data rights

Notes never leave a resident's device unless that resident explicitly publishes them.
No telemetry. No analytics. No tracking scripts. No cookies. No fonts or scripts loaded
for the purpose of measurement. The repository — plain files in git — is the durable asset,
not a database and not a service.

## 3. Measured-invitation posture (Latch / Door canon)

This platform **observes and publishes**. It does not notify Lenexa PD, code enforcement,
KDHE, OSHA, the City of Lenexa, or any other authority. Not automatically, not on a
threshold, not ever.

Residents who want an authority involved can use the
[Institutional Observer door](three-doors.md#3-institutional-observer) to find the correct
existing intake channel and submit it themselves, under their own name, on their own terms.

## 4. Neutral publication

The data model has **no landlord field, no management-company field, no owner field**.
Tiles are keyed by address or place id.

There is no "complaints" tab, no "issues" tab, no score, and no ranking of buildings,
businesses, or civic facilities against each other. There are notes, and notes carry
freeform tags. That is the whole model.

## 5. Propose-only ingestion

External material (Yelp, Google Maps, Apartments.com, BBB, Nextdoor, local news) may be
gathered by an hourly sweep into `archive/reports/YYYY-MM-DD/` as **proposed rows**.
Nothing from a sweep is auto-published to the public map. A human review pass moves a
proposal into `notes/` by pull request, or drops it. See [`sweep/README.md`](../sweep/README.md).

## 6. Fork-first governance

Public repo. Permissive license. Designed to be forked. If anyone — including the person
who started it — begins steering the surface toward a target, an agenda, or a campaign,
someone else can fork it and carry the neutral version forward. That exit is the governance.

## 7. Honest relay

If a submission path is not wired to a live receiver, the interface says so plainly:
*nothing was sent*. No false receipts, no "thanks, we got it" when nothing was got.
The map's "add a note" buttons open a GitHub issue form in the visitor's own browser —
the page itself transmits nothing.

## 8. Neutral-hopeful floor for empty tiles

A building, business, or civic feature with zero notes renders as **light, unfinished,
waiting** — never gray, never dim, never negative. Absence of data is not a signal.
New construction and quiet places look hopeful by default.

---

## Tone

Studio Ghibli neighborhood, not horror-game decay. The render vocabulary stays gentle and
illustrative. This is a neighborhood, not a campaign.

---

*Sibling project and pattern source: <https://github.com/EVEglyphDesign/ark-peer-review-ledger>*
