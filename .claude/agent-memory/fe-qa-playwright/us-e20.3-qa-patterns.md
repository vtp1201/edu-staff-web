---
name: us-e20.3-qa-patterns
description: parent-link audit trail QA — found a real note-suppression defense-in-depth gap; renderToStaticMarkup probe recipe reused
metadata:
  type: project
---

US-E20.3 (parent-student link audit trail): engineer's self-reported coverage
(419 files/2839 tests, 5 Storybook interaction stories) was verified accurate —
every claimed test genuinely does what was claimed (zero-emission tests snapshot
full `before`/`after` trail equality not just length in the already-linked case;
forged-role vs cross-tenant-forbidden unlink tests are genuinely distinct authCtx
overrides; l6 ordering test asserts the exact `[action, occurredAt]` tuple array,
not just length; `AuditTrailErrorRetry` story does real `.focus()` + `{Enter}`
keyboard activation; `AuditTrailSuccessOrdering` asserts action conveyed via
visible text label, not just an icon).

**Real gap found via a probe test, not by reading code**: `PLAuditTrailSection`
renders `entry.note` whenever it is truthy, with NO gate on `entry.action`. The
mock repository *does* correctly enforce `note: action === "created" ? note :
null` at the data layer (`mock-parent-student-link.repository.ts` line ~349),
so the bug is unreachable through any current UI mutation path — but it directly
violates the AC's explicit defense-in-depth wording ("regardless of any text
passed anywhere ... NEVER shows a note line"), and the domain entity's own doc
comment ("Populated ONLY for `action === 'created'`") is not actually enforced
by the type or the render logic. One-line fix needed:
`{entry.action === "created" && entry.note && (...)}`. Reported as MAJOR
(not BLOCKER) because unreachable today, but real and testable.

**Recipe reused**: this repo has NO `@testing-library/react` — component-level
node-env probes use `renderToStaticMarkup` from `react-dom/server` (see
`sd-self-approved-note.test.tsx` for the established pattern: wrap in
`NextIntlClientProvider`, assert on the returned HTML string). Used a throwaway
probe file (not committed) to prove/disprove a hypothesis about render logic
before deciding whether to escalate vs. write a permanent test — do this BEFORE
writing a permanent failing test, since a permanently-failing test that requires
a prod fix I can't make would leave the branch's gate red for no good reason;
better to prove-then-report-then-let-fe-lead re-request the regression test once
`fe-nextjs-engineer` lands the fix.

Real HTTP repo's `getLinkAuditTrail` (`parent-student-link.repository.ts`) has
zero test coverage — accepted per this team's mock-first convention (ADR 0064
documents the branch is never exercised while `USE_MOCK=true`), not a blocking
finding, same pattern as prior stories (see [us-e18.17-qa-patterns](us-e18.17-qa-patterns.md)).
