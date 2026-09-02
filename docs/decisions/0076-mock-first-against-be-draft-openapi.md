# 0076 Mock-first against a service's `openapi.draft.yaml`

Date: 2026-09-02

## Status

Accepted

## Context

Until now this repo had exactly two postures for a capability BE has not
shipped:

- **mock-first** (`0014`) — build the screen against a shape WE invent, behind
  `NEXT_PUBLIC_USE_MOCK`; and
- **force-mock** (`0054`, `0073`, and most of E18) — pin the DI to the mock
  because the real branch cannot work at all.

Both share one defect: the shape is ours. This epic has repeatedly paid for it.
`0075` is the sharpest example — the mock-era LMS model (chapters, typed
video/pdf lessons, per-lesson notes, Q&A, progress %, assignment scores) was
invented, tested, storybooked and shipped, and NONE of it existed when the real
contract arrived; the un-mock became a rewrite. `0055`/`0075`'s recurring
finding is the same: *a shape only our mock ever produced is unverified, and
testing against it makes it look verified.*

edu-api has now given us a third option. Its ADR `0147` publishes
`services/<svc>/docs/openapi.draft.yaml` — planned-but-undeployed paths, valid
OpenAPI 3.1, `$ref`-ing the deployed file's envelope/error schemas, every
operation carrying `x-status: draft` + `x-story: US-NNN`, frozen once a client
starts mocking against it, and moved into `openapi.yaml` UNCHANGED (and deleted
from the draft file) in the same commit the story ships. It was written for
`edu-staff-mobile` (mobile ADR 0005), but it is a BE-published artifact, not a
mobile-private one.

The first concrete instance is `services/lms/docs/openapi.draft.yaml`
(BE US-254): `GET /courses/me`, `POST /courses/{courseId}/items/{itemId}/complete`,
`GET /courses/{courseId}/progress` — i.e. exactly the student
completion/progress family `0075` had to delete from our screens.

## Decision

When a service publishes `openapi.draft.yaml`, `edu-staff-web` MAY build ahead
of BE against it, under all of the following conditions.

1. **Draft-sourced shapes only.** DTOs, entities and mock fixtures are derived
   from the draft file, field-for-field. If the draft does not describe
   something the screen wants, we do NOT invent it — we ask BE to extend the
   draft (the ask is the deliverable, not a local guess).
2. **The DI factory marks itself draft-sourced.** The factory doc comment names
   the draft file, the owning BE story (`x-story`), and the removal condition
   ("when US-NNN ships, re-point to the real repository"). A reader must not
   have to diff two repos to learn the endpoint does not exist.
3. **The real branch must be UNREACHABLE until BE deploys.** A draft-backed
   capability is force-mocked (the `0054`/`0073` shape), NOT gated on
   `USE_MOCK` — a `USE_MOCK ? Mock : Real` gate on a route that 404s is a
   production error card waiting for someone to flip an env var. A DI env-matrix
   test asserts the pin, and it is INVERTED (not deleted) when the pin is
   removed.
4. **The mock repository fails the way the draft says it fails.** Draft error
   codes map into the feature's failure union exactly as a real repository
   would, so the screen's error surface is exercised before the service exists.
5. **No real repository is written against a draft path.** The wire-level code
   lands with the un-mocking story, together with its repo↔HTTP contract test —
   an untested dormant real repository is precisely the "zero safety net"
   `0073` warned about and `0075` had to pay off.
6. **The draft version is recorded.** The story packet records the draft's
   `info.version` (e.g. `draft-2026-09-02`) it was built against, so a later
   BE freeze-break is a visible diff rather than a silent behaviour change.

A draft path we have NOT chosen to build against changes nothing: the capability
stays absent from the UI (the `0075` posture — show only what the deployed
contract carries).

## Alternatives Considered

1. **Keep inventing shapes (status quo `0014` mock-first).** Rejected: this is
   the practice `0075` had to unwind. When BE has published a shape, mocking a
   different one is strictly worse.
2. **Treat the draft file as deployed and wire the real repository now.**
   Rejected: the routes 404. This is exactly the pre-`0073` failure mode.
3. **Wait for BE to ship before any FE work.** Rejected as a blanket rule — it
   is the right call for most stories (and remains the default), but it forbids
   parallel work even when BE has already frozen the shape, which is the whole
   point of `0147`.
4. **Copy the draft YAML into this repo.** Rejected: two copies drift, and the
   sibling repo is readable. Reference it by path
   (`edu-api/services/<svc>/docs/openapi.draft.yaml`) and record its
   `info.version`.
5. **Gate a draft-backed feature on `USE_MOCK` like a normal mock-first
   feature.** Rejected — see Decision #3. The distinguishing property of a
   draft-backed capability is that the real side does not exist yet, so the
   real side must not be reachable.

## Consequences

- FE can start a screen the day BE freezes its draft, instead of the day BE
  deploys — with a shape that will not need rewriting on arrival.
- Each draft-backed capability carries a force-mock pin, so the repo will
  accumulate pins that MUST be retired; every one needs its removal condition in
  the DI comment and a row in the story packet, or it becomes the next ADR 0073.
- A "verified" mock is still not a verified integration: draft-backed features
  ship with unit + interaction proof only, and the repo↔HTTP integration proof
  arrives with the un-mocking story.
- `.claude/rules/api-integration.md` §Source of truth gains a row for
  `openapi.draft.yaml` so the distinction is visible at the point of use.
- Nothing in US-E24.1 consumes a draft path. The first candidate is BE US-254
  (`services/lms/docs/openapi.draft.yaml`, `draft-2026-09-02`) — student course
  completion/progress, whose absence is why `0075` deleted the progress UI.

## Related

- Mirrors edu-api `docs/decisions/0147-draft-openapi-contracts-for-mobile-mock-first.md`
  (and `edu-staff-mobile` ADR 0005, the client-side precedent).
- `0075` (adopt the real `lms` contract) — the cost this convention exists to
  avoid repeating.
- `0014` (mock-first), `0054` / `0073` (force-mock shape and its removal
  condition), `0017` (service map).
- `.claude/rules/api-integration.md` §Source of truth.
