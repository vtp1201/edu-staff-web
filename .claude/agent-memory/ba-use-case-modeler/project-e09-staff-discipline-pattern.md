---
name: project-e09-staff-discipline-pattern
description: US-E09.5 Staff Discipline (violations+conduct-notes, tabbed) UC pattern — role-collapse actor modeling, dual-layer reject validation, client-pre-check + server-backstop lock pairing, resolving open questions from design-spec.jsonc directly
metadata:
  type: project
---

US-E09.5 (staff-discipline, tabbed violations + conduct-notes, `core` conduct
sub-domain) established these reusable UC-modeling patterns for this repo:

- **BE-role-collapse actor modeling (ADR 0062 style):** when an ADR states two
  BE roles (e.g. `ADMIN` authoring + `MANAGER` approving) collapse onto ONE
  app role (`principal`), write the Actor Catalogue capability list as a
  single row with both capacities merged — do not model them as two separate
  actors. Call out explicitly in the UC catalogue intro which app route-guard
  role this is NOT (e.g. "not the app's separate `admin` route-guard role")
  to prevent confusion with an unrelated existing role guard.

- **selfApproved-style audit-transparency AC:** when an ADR (0073 here)
  requires a field to be ALWAYS visible when true (never conditionally
  hidden), write it as its own AC distinct from the "happy path" AC, worded
  as an explicit non-negotiable assertion ("NEVER conditionally hidden,
  omitted, or suppressed by any client-side condition") — mirrors the
  security-assertion phrasing style, applied here to an audit/UX field
  instead of an authorization boundary.

- **Client-pre-check + server-backstop lock pairing (ADR 0074 style, mirrors
  US-E20.1's dual confirm+server-authz pattern):** when a business rule has
  BOTH a client-side preventive UX (e.g. "form must not even open on an
  APPROVED record") AND a server-side enforced 409/403 backstop for the
  bypass/race case, write them as two SEPARATE exception-flow ACs (primary
  vs backstop) rather than one combined AC — both must be independently
  testable (client guard via UI interaction test, server backstop via mock
  repository returning the error code directly).

- **Two-layer validation split (client UX guard vs server authoritative
  guard):** reject-reason min-length is a recurring shape in this repo
  (discipline, staff-leave, staff-discipline) — client enforces a stricter
  UX minimum (e.g. 10 chars) that blocks the submit button before any
  request; server enforces only non-empty. Always write both as distinct
  ACs: one for the client-guard-blocks-button case, one for the
  server-guard-fires-on-bypass case (explicitly note "client guard
  bypassed, e.g. forged request").

- **Resolving an open question via design-spec.jsonc rather than re-flagging
  it:** when `requirements.md`/`integration.md` raise `[OPEN QUESTION]`s
  that a design-spec.jsonc entry actually already answers (e.g. this
  story's `termSelector.visibleFor: "principal only"` resolving whether
  teacher's self-view can browse past terms), grep design-spec.jsonc for the
  screen entry FIRST — resolve directly citing the spec line as the source
  (mark "resolved, not open" with a citation) rather than carrying the
  question forward unresolved. Only re-flag genuinely unanswered items.

- **"No distinct mobile layout" as an explicit stated-not-invented AC:** when
  a reference story (e.g. US-E20.1) has an explicit sub-breakpoint
  card-list layout callout but THIS screen's design-spec entry has no such
  callout (only standard content-padding reflow), write an AC that
  explicitly states "no distinct card layout is specified... standard
  reflow only, stated explicitly rather than invented" — avoids silently
  inventing a responsive pattern the design spec doesn't call for, per the
  task's own instruction style.

See also [Repo UC patterns](repo-uc-patterns.md), [E21 invitation flows]
(project-e21-invitation-flows.md) for the ADR-security-AC precedent this
story's UC-009 (role-gate enforcement, normal lane but high-risk-grade rigor)
mirrors from US-E20.1's UC-006.
