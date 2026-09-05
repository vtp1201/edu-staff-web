---
name: project-e24-4-cross-subject-tabs
description: US-E24.4 cross-subject assignment/exam tabs implementation — closes E24 student Phase 1
metadata:
  type: project
---

US-E24.4 (merge /student/assignments + /student/exams into URL-filtered `/student/courses?view=`
tabs) implemented and merged (`ce45f592`, worktree `us-e24.4`). Last US in the student sequence
(E24.2 → E24.3 → E24.5 → E24.4, all done) — closes E24 Epic Phase 1 (Student).

**Why record this** — patterns worth reusing for any future URL-state screen or dead-code removal:

- **Zero-Client-Component tab screen is achievable and was chosen deliberately**: every pill/tab
  is a real `<Link>`, view+sub-tab both live in `searchParams` read at the RSC page, no
  `useState` anywhere. `fe-planner` correctly recommended skipping BOTH architect and
  state-engineer for this reason — worth defaulting to "no architecture step" for any screen
  that is pure URL-state + RSC composition, even with multiple interactive-looking tab strips.
- **Safe refactor-in-place pattern for shared fan-out logic**: `ListCoursesWithSummaryUseCase`
  (US-E24.2) was refactored to delegate to a newly-extracted `fetchCourseTimelines`, and the
  proof of no-regression was that US-E24.2's OWN test file was left completely untouched and
  stayed green. This "the old test file is unmodified and passing" proof pattern is stronger
  than writing new tests for old behavior — use it whenever extracting shared logic out of an
  already-shipped use-case.
- **Component promotion across features works via git mv, verified by reviewer**: `safe-href.ts`
  moved `course-player/` → `presentation/shared/` on its 2nd consumer (decision 0026 in action).
  Reviewer explicitly checked `git diff -M` to confirm a real rename, not a copy+delete.
- **Dead-code deletion needs a repo-wide grep proof, not a diff-local one**: engineer grepped the
  WHOLE repo (not just the touched folder) before deleting `student-assignments/**`,
  `exam-list/**`, and the `assignments.*` i18n namespace — reviewer independently re-ran the same
  grep. This two-pass independent verification caught nothing wrong here, but it's the right
  discipline any time a US's scope includes "delete X if unused."
- **A deviation can extend a prior US's already-accepted deviation instead of introducing a new
  one**: dropping "✓ Đã nộp"/submission-status reads here is a direct extension of US-E24.5's
  D-1 (course player already dropped the same field for a single item). Reviewer explicitly
  checked the extension didn't introduce new UX damage (completed exams still redirect to their
  result screen, not a dead-end retry) rather than just approving by precedent alone.
- **QA can legitimately add zero new tests and still issue a clean Go** when the implementation +
  fix-round tests are already this thorough — don't assume QA always needs to add coverage;
  sometimes the honest verdict is "already sufficient, independently re-verified."
- Cross-session parallel-branch drift check found **zero drift** for this merge (origin/main
  hadn't moved since branch creation) — a reminder that not every merge needs conflict
  resolution, but the fetch+check step is still mandatory every time.

**E24 Student Phase 1 is now complete.** Remaining epic work is Phase 2 (teacher: E24.7→E24.8
already merged, E24.9→E24.11→E24.10 presumably in flight on the parallel session) and Phase 3
(E24.6, E24.12–16, not yet sliced).
