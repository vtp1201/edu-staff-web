---
name: project-dead-sidebar-links-batch
description: 5-story batch closing dead sidebar links (US-E13.9/E13.10/E15.3/E20.4/E20.5), 2026-08-02
metadata:
  type: project
---

Closed all 5 dead sidebar links reported by a prior audit: `/teacher/students`
(US-E13.9), `/principal/students` (US-E13.10), `/principal/schedule`
(US-E15.3), `/parent/children` (US-E20.4), `/parent/attendance` (US-E20.5).
All merged to `main` sequentially, solo mode (no other in-flight branches all
session — verified via `git fetch --prune` before each claim).

**Why:** user-reported nav-config entries pointed at routes that either had no
`page.tsx` at all, or only a nested `[id]` deep-link with no index — 404s from
the UI with no way to discover the dynamic-segment id.

**How to apply / recurring patterns worth reusing:**
- **Reuse-first framing pays off**: 4 of 5 screens needed zero new BE
  integration by reusing an already-real use-case/repository (teacher's
  `list-my-classes`+`get-class-students` composed; admin-roster's read paths
  read-only-variant'd for principal; timetable's `getByMember` extended to a
  3rd role; parent-links' `LinkedStudentSummary`). Only US-E20.5 was a genuine
  BE gap (`GET /members/{id}/attendance` doesn't authorize PARENT) →
  mock-first, decision 0014.
- **Ground-truth the BE Go source directly, not just the FE's own doc
  comments/assumptions.** Two real 403 gaps were caught only because the
  reviewer (or lead, at intake) read the actual `edu-api` Go source:
  US-E15.3's intake claimed `getByMember` was "role-agnostic" — wrong, BE
  `authorize()` has no MANAGER branch, caught by `fe-tech-lead-reviewer` after
  the engineer had already built assuming no gap. Fixed via a principal-scoped
  force-mock DI factory (mirrors `principal-classes.di.ts`/US-E13.8 precedent).
  US-E13.10's principal-teachers picker turned out to hit ANOTHER real gap
  (`/core/api/v1/teachers` doesn't exist on the BE at all) — discovered as a
  side-effect during the E15.3 fix round, pre-existing since US-E13.5, not
  fixed retroactively (out of scope), just flagged as a new cross-repo ask.
  **Lesson: even "should be role-agnostic by design" reuse claims need a
  direct grep of the BE authorize() function before an engineer builds on
  them — a repository primitive being real for ONE caller does not mean it's
  authorized for every caller.**
- **Component promotion (decision 0026 "promote on 2nd/3rd use") happened
  twice this session, with very different outcomes**: US-E20.4's
  `ChildIdentityHeader` promotion (avatar+initials+name pattern, 3rd
  near-duplicate) introduced a REAL regression (font-size baked to a constant
  shrunk one caller's text) + 2 REAL WCAG contrast fails — all caught by
  review/a11y, fixed same-branch. US-E20.5's `ChildSwitcher` promotion (2nd
  use) was byte-clean (`git diff` = 2 lines: import path + i18n namespace) —
  the difference was `fe-component-architect` writing an EXPLICIT
  pixel/behavior parity checklist before implementation, learned directly from
  the E20.4 regression. **Always spawn `fe-component-architect` for a
  promotion, with an explicit instruction to write a verifiable parity
  checklist (not just "make it work"), not just for a net-new component
  tree.**
- **A "mock-first, honest degrade" AC needs teeth, not just intent.**
  US-E20.5's engineer initially shipped an unconditional-mock DI factory (no
  `USE_MOCK` branch at all) — meaning real/production mode would have shown
  FABRICATED child attendance data as if real, directly contradicting the
  story's own AC. Caught by `fe-tech-lead-reviewer`, fixed with a
  `USE_MOCK`-gated factory returning an honest `forbidden`-throwing repository
  with zero HTTP calls attempted. **When briefing "mock-first" work, always
  explicitly require the `USE_MOCK` branch + env-matrix DI test (3 states:
  `"true"`/`"false"`/unset) proving zero HTTP client construction in the
  non-mock states — do not accept "unconditionally mock" as equivalent to
  "mock-first with an honest real-mode fallback."**
- **Shared checkout risk materialized twice** (per [[feedback-concurrent-session-shared-files]]):
  another concurrent `/fe` session left uncommitted WIP (auth OAuth clientId
  changes, `select-tenant` files) in the SAME working tree while this lead was
  mid-pipeline on a different US. `git push`/`bun run build` picked up their
  broken uncommitted files and failed. Fix: `git stash push -u -m "temp: ..."
  -- <no-pathspec-if-all-unstaged-is-theirs>` right before any push/build,
  confirmed via `git status --short` that 100% of what's being stashed is
  NOT mine (I'd already committed everything of mine first). Their own session
  later reclaimed the stash on its own (stash entries with "temp:" messages
  disappeared between my checks) — no coordination needed, no data lost. Doing
  this required care: shell bracket-globbing (`[locale]`, `(auth)`) breaks
  pathspec quoting in zsh — safer to stash with NO pathspec once your own
  changes are already committed (everything remaining must be theirs).
- **Docs close-out is the lead's job, every time**: packet `## Status`,
  `docs/TEST_MATRIX.md` row, `docs/product/screens.md` row, and (when a new
  BE gap is found) a new numbered entry in
  `docs/reports/2026-08-01-fe-to-be-asks.md` — engineers/reviewers correctly
  flag these as "fe-lead's file" and leave them for the lead. Do this
  immediately after QA Go, before merge, in the same commit as the packet
  Status flip.
- New cross-repo asks filed this session: #43 (MANAGER on
  `get_member_timetable.go`'s `authorize()`), #44 (`/core/api/v1/teachers`
  doesn't exist on BE at all — pre-existing since US-E13.5), #45 (PARENT not
  authorized on `GET /members/{id}/attendance`).
