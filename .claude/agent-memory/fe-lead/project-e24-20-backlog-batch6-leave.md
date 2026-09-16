---
name: project-e24-20-backlog-batch6-leave
description: US-E24.20 backlog batch 6 (#5 leave fan-out, #8 principal read-only gate, #12 leave-form consolidation) — merged 5ccef9d5
metadata:
  type: project
---

Closed harness backlog #5, #8, #12 in one story/branch (all three shared the
leave-request surface: `features/discipline`, the leave DI/use-case, the leave
form components — exactly why they were batched). Filed new backlog #17
(pre-existing, unrelated finding, not absorbed).

Key findings, reusable beyond this story:

- **Ground-truth edu-api Go source before designing a fan-out fix.** The BE's
  `list_student_leave_requests.go` (`listByClass`) branches by caller role:
  BGH (ADMIN/MANAGER — principal in real mode) gets ALL states with NO
  homeroom check; TEACHER gets SUBMITTED-only AND only for classes where
  `IsHomeroomTeacher` is true. Both still require a concrete `classId` — no
  "all classes" query exists on the wire. This shaped the fix: teacher fans
  out over ITS OWN homeroom classes (reuse `makeListMyTeacherClassesUseCase`,
  same read `makeLeaveDecisionAuthContext()` already does), principal fans
  out over EVERY tenant class (reuse the already-real
  `makePrincipalClassesRepository().listClasses()`, cursor-drained). No new
  BE endpoint needed, but this is an N+1 fan-out with no bulk alternative —
  documented as an accepted MVP tradeoff, not silently shipped.
- **A repository's own doc comment can pre-write your fix.** The blocked
  `getLeaveRequests` stub already said "iterate the teacher's own homeroom
  class ids is a separate, logged follow-up" — read prior force-mock/blocked
  code's doc comments closely, they often name the exact intended fix.
- **Reviewer caught a mock-mode regression the packet's own AC denied.** The
  packet said "mock mode unaffected" — untested assumption. The fan-out's real
  classIds (`cls-10a1`) don't intersect `MockDisciplineRepository`'s leave
  fixtures (keyed by class NAME, `"10A1"`), so both leave tabs silently
  rendered empty under `NEXT_PUBLIC_USE_MOCK=true` post-fix. Fixed by
  matching `classId OR className` in the MOCK repo only (never touch the real
  repo/fixtures/other mocks for a mock-only gap). Lesson: when a fix changes
  WHAT PARAMS a real caller sends, always runtime-verify the SAME call still
  works against the mock — a param shape change is invisible to `tsc`/lint
  and can silently break the mock path while all "real mode" tests pass.
- **QA re-writing (not just re-reading) tests keeps finding gaps.** 5th+
  occurrence this epic: `fe-qa-playwright` found `student-conduct-screen`'s
  leave-form story never mounted `<Toaster/>`, so its "success toast" AC was
  structurally unprovable even though the story "passed." Keep briefing QA to
  verify AC coverage by reading actual assertions, not commit-message claims.
- **Consolidating 3 UI variants onto 1 canonical component**: add ONE
  additive optional prop (`showAttachments`) rather than forking: the reason
  is a downstream capability gap (2 of 3 consumers have no upload use-case
  wired) — showing a control with no consumer silently drops user input
  (ADR 0067 "present-but-dead control" idiom, cited not re-derived). Also
  rename a file when its physical shape changes (Sheet → Dialog) — an
  inaccurate filename left behind actively misleads the next reader.
- **A shared dialog's own bug can hide behind 3 duplicate forms.** The
  canonical `LeaveRequestDialog`'s submit button was outside a `<form>`, so
  its `min` date attribute was decorative — nobody had noticed because the
  ORIGINAL parent-attendance consumer never exercised a past date in its
  tests either. The consolidation's OWN reviewer caught it. One-line fix in
  the shared component benefits all 3 consumers at once — the payoff of
  actually consolidating instead of leaving 3 near-duplicate forms alive.
- Transient `git push` "failed to push some refs" with no useful reason after
  a green pre-push hook — retried immediately, succeeded. Not reproducible,
  not investigated further; note in case it recurs (could be a GitHub-side
  transient, not a real non-fast-forward).
