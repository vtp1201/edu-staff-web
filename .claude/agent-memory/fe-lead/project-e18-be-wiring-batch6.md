---
name: project-e18-be-wiring-batch6
description: E18 BE-wiring batch 6 (US-E18.56-59) — closed asks #47/#48/#32(b')/#49; first FE call issued directly from a Client Component (ADR 0072)
metadata:
  type: project
---

Batch 6 (2026-08-08): 4 US closing BE's 2026-08-08 response to asks #47/#48/#32(b')/#49.
All merged to `main` same session, sequentially (US-56→57 forced-sequential, same
`academic-records` module; US-58/59 independent, run after). No other in-flight
branches at session start (solo mode, no worktrees needed).

- **US-E18.56** (academicYear denorm, normal): dropped `enrollment-year.resolver.ts`
  fan-out entirely once BE denormalized `academicYear` onto the record row. Textbook
  "kill the workaround once the real fix lands" — zero UI change, design-review
  gate explicitly skipped by reviewer sign-off (verified via Storybook story diff).
- **US-E18.57** (teacher homeroom grant, high-risk): the RBAC widening needed
  **zero repository/use-case/DI code change** — confirmed, not assumed. BE-only RBAC
  + a pipeline that never special-cased "empty = forbidden" meant the real payload
  was role-aware empty-state copy + regression tests proving the old assumption is
  gone + fixing stale docs. Second occurrence of "BE RBAC widening = FE no-op if the
  success/failure branches were already correctly separated" (see also US-E18.52-era
  patterns) — worth checking BEFORE assuming a grant needs new plumbing.
- **US-E18.58** (pin senderName sentinel, tiny): BE literal placeholder string
  (`"Member"`) treated as "absent" in the mapper (same bucket as empty string),
  reusing the existing i18n fallback — no new UI branch. Reviewer mutation-tested
  the exact-match guard (temporarily swapped `!==` for `.includes()`) to prove it
  wasn't vacuous — good technique, reused again in US-59.
- **US-E18.59** (invitation browser-direct fetch, high-risk, the big one): first
  time a BE call is issued directly from a Client Component in this codebase —
  required its own ADR (0072, amends 0071). Key design insight that kept the
  diff small: a hand-thrown `ApiError` (the same class the axios interceptor
  throws) from a plain `fetch()` flows through the EXISTING failure mapper and
  pure domain use-cases completely unchanged — `errorCodeOf`/`statusOf` already
  special-case `instanceof ApiError` before the axios-shape fallback. Session
  issuance stays server-side via a narrow `finalizeRedeemAction` (cookie-write +
  redirect only). Review found: (1) the no-IAM-call guard as a denylist was
  bypassable (mutation-tested: adding `axios.post` inside a try/catch still
  passed 10/10) → converted to an exact-match import-specifier ALLOWLIST — this
  is now the house pattern for "prove a function makes zero calls to X" tests,
  a denylist alone is not sufficient; (2) an a11y gap where the loading→SUCCESS
  transition had no live-region announcement even though failure transitions did
  (asymmetric — easy to miss, only caught because the auditor explicitly checked
  the success path, not just the error alert); (3) a genuine cross-repo gap the
  review surfaced organically: moving a call to browser-direct makes it
  genuinely cross-origin, triggering a CORS preflight (`OPTIONS`) that BE never
  verified (they only verified `POST` directly) — this is now a THIRD go-live
  deploy gate (after migration + Kong reload) and a new ask filed, not an FE
  code fix. Also: the redirect's tenant-segment derivation moved from a
  server-attested `member` object to the access token's own claim
  (`decodeTenantId`) because `member` is now client-supplied at the Server
  Action boundary — reviewer judged this STRICTER not weaker (the token is
  about to become the session cookie regardless, so trusting its own claim for
  redirect coherence adds no new risk) and accepted it as an ADR addendum
  rather than requiring a revert to literal parity with the old code.

General lessons for this batch:
- When a story removes a "workaround for a BE gap that just closed," verify the
  gap really *is* closed (grep the removed collaborator's only call site) before
  assuming; don't leave a "keep both paths" fallback unless the wire genuinely
  needs it (US-E18.56 kept exactly one degrade-path fixture, not the whole
  resolver).
- "BE granted a role" ≠ "FE needs new code" — check whether the pipeline already
  treats success/failure/empty as properly separate states before assuming a
  repository/use-case change is needed (US-E18.57).
- A `.includes()`/truthy-check "is this a real value" guard needs an exact-match
  mutation test, not just a happy-path unit test, whenever the "absent" sentinel
  could plausibly be a substring of a real value (US-E18.58, US-E18.59's
  import-allowlist).
- A "prove zero calls to X" test written as a denylist (assert specific bad
  imports/calls are absent) is provably weaker than an allowlist (assert the
  exact permitted set) — the reviewer's mutation-probe technique (temporarily
  inject the violation, confirm the CURRENT test catches it, revert) is the
  right way to validate either style before trusting it.
- Moving a network call's ORIGIN (server → browser) can silently introduce a
  CORS preflight that a same-origin-only verification never exercised — always
  ask explicitly "does this new caller trigger `OPTIONS`, and was that verified
  separately from `POST`?" when a call moves client-side for the first time.
