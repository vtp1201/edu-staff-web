---
name: us-e18.36-qa-patterns
description: US-E18.36 staff-leave full un-mock QA — another fully-accurate self-report on the substantive claims; only staleness-class MINORs found
metadata:
  type: project
---

US-E18.36 (staff-leave department/leaveType un-mock + full read/write real): security
MUST-FIX (`requireRole` first-statement + zero-DI/use-case-call test) and both
`toFailure` SHOULD-FIXes (`callSite`-scoped `LEAVE_REQUEST_INVALID_INPUT`,
non-retryable `VIOLATION_INVALID_STATE`) were all genuinely implemented and tested —
verified by direct code read + isolated test reruns, not trusted from prose.

**Recurring staleness class found here (3rd+ time seeing this pattern in the E18
epic):** self-reported test COUNTS can be off by one even when every named test
genuinely exists and passes (repository test claimed 31, actual 30) — always
isolate-run the specific file with `--reporter=verbose` and count, don't trust the
prose number. Also: a doc comment inside a domain failure-union file
(`staff-leave.failure.ts`) still said "unreachable today since the repository is
force-mocked" even though THIS story un-mocked it — un-mock stories should grep for
stale "force-mocked"/"unreachable" doc comments across ALL touched domain files, not
just the DI factory's own comment (which WAS updated correctly).

**Why:** BE-wiring stories touch several files' doc comments describing the
mock-first rationale; only the DI factory's comment reliably gets updated, sibling
files (failure unions, repository top-of-file comments) can be missed.

**How to apply:** on any future un-mock story, grep the whole feature folder for
"force-mock"/"unreachable"/"blocked" comments before closing QA, not just the DI
factory file. Treat as MINOR, non-blocking, but flag it every time — it accumulates
into real confusion for the next engineer if never fixed.

Clean PASS gate otherwise: 477/3549 unit, 158/1206 Storybook (verified via isolated
file rerun of `staff-leave-screen.stories.tsx`, 8/8 Chromium), tsc clean, build clean
both `USE_MOCK` modes.
