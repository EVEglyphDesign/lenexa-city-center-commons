# Canon

These nineteen rules govern this repository and the map it publishes. Rules 1–8 shipped
with the first version. Rules 9–19 were added in phase 2, when the surface grew a walkable
default, a conversational front end, an optional local twin, and an emergency on-ramp.
They are inherited from the EVE Glyph Design working canon and from the sibling project,
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

**Clarification (phase 2).** The Commons is public. Anyone — including police, code
enforcement, journalists, landlords, developers, and residents — reads the same tiles
through the same interface with no role-based special access. There are no verified badges,
no priority queues, no private views, and no moderator tiers. The three doors are labels on
a note, not permissions.

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

## 9. No account, ever

No email, no social login, no magic link, no phone verification, no "continue with" anything.
Any workflow that would require an account is out of scope, no matter how much it would
improve the product. If a feature only works with an identity attached, it does not ship.

## 10. No captured content the platforms can't re-emit

All neighbor notes live in the public repo as permissively-licensed markdown. Anyone —
including the platforms we twin from — can read them, mirror them, quote them, and re-emit
them. Nothing written here becomes exclusive to here. The Commons is not a moat.

## 11. No leaving cost

Nothing on the Commons is held against a user. There is no streak, no reputation, no history
that gets lost, no "are you sure" guilt screen. They can walk away and lose nothing. The
optional twin exports in one action and deletes in one action.

## 12. Front end, not replacement

The Commons is a calm front end over the platforms already serving this neighborhood. It
never asks a user to leave another platform, never argues against another platform, and never
blocks or degrades a user's ability to use another platform. Every external field carries a
deep link back to the platform it came from, with attribution.

## 13. Walkable "here" default

When a user opens the Commons inside the geofence, the default view is what is within walking
distance right now. Location is used only on-device, never stored, never transmitted. Walk
times are computed locally from straight-line distance with a sidewalk fudge factor — no
routing service, no server call, no third party learns where anyone is standing. Declining
location costs nothing; the map falls back to the City Center centroid and never asks again.

## 14. Twin is optional, gradual, and local-first

No twin is required to use the Commons. If a user chooses to build one, it lives on their
device, in a portable JSON format, extractable and deletable in one action. No cloud sync, no
server copy, no backup we hold. A twin from one fork of the Commons imports into any other.

## 15. Points, does not argue

When showing walkable alternatives, the Commons never critiques the place a user is currently
in. It shows what else is nearby. What they do with that is theirs. No comparisons, no
"better than", no nudge away from anywhere.

## 16. Assistant serves, does not steer

Any conversational surface on the Commons answers what the user asks, in the user's language,
from the same public tile data anyone else can read. It never captures queries server-side,
never builds a user profile, never up-sells, never nags, never argues, and never suggests the
same place twice in one session. It is deterministic and on-device: string matching and tag
lookup, not a model call.

## 17. Natural human default

The Commons must be usable by a natural human without prior configuration, without an account,
without prior training, without a specific device, without literacy in technology, and without
composure. Every feature must work for a scared, tired, distracted, unfamiliar, or first-time
user. If a feature needs a tutorial, it needs a redesign.

## 18. Emergency on-ramp

The Commons offers a natural-language voice trigger and a visible panic button that reach
emergency services with the least possible friction between a distressed human and help.
On-device speech recognition, opt-in, off by default. Native `tel:` and `sms:` handoffs to the
phone's real capabilities. A full-screen calm interface when triggered.

**It never claims to have called.** The user confirms by tapping Call in their own dialer.
Rule 3 still holds absolutely: the Commons notifies no authority automatically, on no
threshold, ever. An on-ramp is not an auto-dial.

## 19. Additive teaching, never substitution

Emergency interfaces additionally teach the phone's native SOS shortcut in a small line,
calmly, so the user has that tool too next time. Additive. The Commons never presents itself
as a replacement for native emergency features — and it never withholds itself as an option
either. Both things are true at once: your phone already does this, and so does this button.

---

## Tone

Studio Ghibli neighborhood, not horror-game decay. The render vocabulary stays gentle and
illustrative. This is a neighborhood, not a campaign.

---

*Sibling project and pattern source: <https://github.com/EVEglyphDesign/ark-peer-review-ledger>*
