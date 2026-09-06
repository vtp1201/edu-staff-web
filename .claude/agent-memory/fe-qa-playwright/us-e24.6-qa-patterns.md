---
name: us-e24.6-qa-patterns
description: US-E24.6 student/parent attendance portal + leave-request dialog QA gate — fully-accurate self-report, clean PASS
metadata:
  type: project
---

US-E24.6 (student `/student/attendance` + parent leave-request dialog, high-risk lane: mutation +
multipart upload + fail-closed allowlist fix): another fully-accurate self-report after a
tech-lead+a11y fix round. All of the following were independently re-verified by reading test code,
not trusting the packet prose:

- The forge-`sub`-only-token forbidden-with-zero-wire-calls AC is proven exactly as claimed
  (`student/attendance/page.test.ts` stubs `createServerHttpClient`/`getAccessToken` and asserts
  `calls` array is `[]`).
- The MUST-FIX retry-data-loss bug (attachment retry re-uploading already-succeeded files) is
  genuinely closed: `uploadAll` now returns `File[]` of only the failed files (not a count), and
  `actions.test.ts` has an explicit round-trip test ("a retry built from `failedFiles` re-sends
  ONLY the failed file") that submits, captures `failedFiles`, retries with exactly that list, and
  asserts the second round POSTs 1 file matching the failed name.
- The SHOULD-FIX fail-closed-allowlist fix is genuinely closed: `resolveTargetStudent` is an
  allowlist (student→claim, parent→requested, everything else→`null` refused pre-wire) with
  `it.each` covering TEACHER/ADMIN/no-role-claim tokens, each asserting `calls` is `[]`.
- Both A11Y-101 (attendance-summary Mobile story lacked overflow assertion) and A11Y-102
  (parent-attendance-screen had zero Mobile story) fixes are real, not cosmetic — grep for
  `Mobile|overflow|375` in both `.stories.tsx` files confirms genuine
  `el.scrollWidth > el.clientWidth + 1` overflow-detection code, matching the pattern from
  [[us-e17.1-qa-patterns]].
- LeaveRequestDialog's focus-trap/Escape/focus-return story genuinely asserts
  `document.activeElement === trigger` after `{Escape}`, not just "dialog closed" — matches the
  pattern flagged as a common shallow-test trap in [[us-e11.7-qa-patterns]].
- i18n vi/en key-parity script (recursive key diff, see [[us-e24.4-qa-patterns]]'s node one-off
  technique) found 0 missing keys in either direction across the WHOLE messages file, not just
  this story's namespaces.
- Two vitest.run failures (`parent/attendance/page.test.ts`, `teacher/classes/[classId]/page.test.ts`)
  were pure timeouts under full-suite parallel load; both pass cleanly when run in isolation —
  resource contention, not regressions (5th time this pattern is confirmed, see
  [[us-e24.5-qa-patterns]]).
- No new tests were needed from QA — the self-report was accurate end to end. Full suite:
  584 files/4928 tests (2 flaky timeouts, isolate-confirmed pass), Storybook 170 files/1374 tests
  green, `bun run build` succeeds with `/student/attendance` in the route table.
