---
name: project-us-e20-3-audit-trail-spec
description: US-E20.3 parent-link audit trail — full BA packet delivered 2026-07-25, key emission-mechanics decisions for anyone extending it
metadata:
  type: project
---

US-E20.3 (Parent–Student Link Audit Trail) BA packet delivered 2026-07-25 at
`docs/stories/epics/E20-parent-student-links/US-E20.3-link-audit-trail/`
(requirements/integration/use-cases/spec/story, lane=normal, 17 AC scenarios,
0 uncovered FRs). Built directly from DR-023 (uiux, merged `c6c9bfb`) + ADR
`0064` (binding: feature-scoped audit entity, NOT the shared `audit-log`
feature's `AuditEntityType`). Commit `cd1820a` on main.

**Why:** ADR `0064` resolved the *shape* question (feature-scoped, mirrors
`academic-records`' `SealAuditEntry`) but explicitly left the *mechanics*
(where entries live, how ordering/determinism work, where actor identity
comes from) to the eventual story packet — that's what this packet resolves.

**Key mechanics decisions worth reusing as a pattern for the next
mock-first audit/history feature:**
- Emission store is a SECOND module-level map in the SAME mock-repository
  file as the mutations that write to it (not a sibling file) — keeps
  locality; keyed independently of the "active records" store so history
  survives deletion/removal of the parent record (critical: an "unlink"
  event must remain visible even after the link itself is gone).
- New entries are always `unshift`ed, never appended+sorted — makes
  reverse-chronological order a construction invariant instead of a runtime
  sort, and makes ordering trivially deterministic to test.
- `occurredAt` timestamps come from an injectable module-level clock
  function (`auditClock`, default `() => new Date().toISOString()`,
  overridable via a test-only `__setClock` export) — NOT a raw inlined
  `Date.now()`, per `.claude/rules/tdd.md`'s determinism rule. Entry IDs use
  a simple incrementing counter (not `Date.now()`-based) for the same
  reason, even though this codebase's PRE-EXISTING `linkId` generation
  already uses `Date.now()` (tolerated legacy pattern, not repeated for new
  fields).
- Actor identity for a mock-first mutation-emitted record: `actorId` via the
  ALREADY-EXISTING `decodeSubClaim(token)` JWT helper (`bootstrap/lib/jwt.ts`);
  `actorName` has NO JWT claim or existing wiring in this repo today — for
  MOCK mode, use a fixed named constant (documented as mock-only, e.g.
  `MOCK_ACTOR_NAME`), and flag the REAL-repository actorName source as an
  explicit non-blocking OPEN QUESTION rather than inventing a `/users/me`
  join speculatively.
- Failure union: do NOT add a new failure type just for a read-only history
  query if the existing union already has a generic `network-error` — a
  history/audit READ query realistically only fails via unexpected
  exception in mock mode; `not-found`/`forbidden` variants are usually
  unnecessary for it (no separate re-auth needed if the read sits behind an
  already-gated dialog).
- A trail-query failure must be scoped/local, never block the surrounding
  already-rendered UI — mirror whatever sibling sub-section the screen
  already established this pattern for (US-E20.1's `PLConsentDetailSection`
  was the direct model here).
