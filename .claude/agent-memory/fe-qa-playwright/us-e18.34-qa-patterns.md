---
name: us-e18.34-qa-patterns
description: parent-attendance mock→real wiring — rare case where every claim in the packet checked out on independent re-derivation; DI env-matrix test pattern reused cleanly for a 5th time
metadata:
  type: project
---

US-E18.34 (parent-attendance real repository) — another fully-accurate self-report
(joins [[us-e20.4-qa-patterns]], [[us-e20.5-qa-patterns]], [[us-e13.10-qa-patterns]],
[[us-e18.29-qa-patterns]] in this "believed the packet, verified anyway, found nothing"
bucket). All 5 spot-checked claims held:

1. Mapper genuinely reuses `features/attendance`'s `mapStatusFromWire` (no duplicate
   table) and the mapper test has an explicit 4-value UPPER_SNAKE→domain table test
   (not just one happy-path value).
2. Repository's `throwFailure` comment was corrected in-place (verified the actual
   prose: link-store error → NOT fail-closed into forbidden, surfaces as network-error)
   — this was the tech-lead's SHOULD-FIX, applied as doc-only.
3. `UnavailableChildAttendanceRepository` — zero remaining source references; only
   doc-comment historical mentions in 2 files (repo.ts, di.ts) plus the di.test.ts
   header comment, all acceptable.
4. DI-level client-validation-first test (`parent-attendance.di.test.ts`) genuinely
   builds the REAL repository (`makeWithEnv("false")`) and asserts the stubbed
   `http.get` is never called for an inverted range — not just a use-case-level
   proof. Same `vi.resetModules()` + `repoOf()` constructor-name-comparison env-matrix
   recipe as [[us-e20.5-qa-patterns]] and [[us-e18.28-qa-patterns]], now battle-tested.

Regression run matched packet exactly: 471 files/3460 tests, tsc clean, both builds
(`NEXT_PUBLIC_USE_MOCK=true` and `.env.local`'s `false`) green. One flaky Storybook
story failure (`invitations-screen.stories.tsx` line ~543, a Dialog/Combobox timing
assertion) — confirmed via `git diff --stat main...HEAD -- src/features/admin/invitations`
(empty) + isolated rerun (46/46 pass) that it's a pre-existing flake unrelated to this
branch, not a regression. Zero new test files needed — clean PASS.
