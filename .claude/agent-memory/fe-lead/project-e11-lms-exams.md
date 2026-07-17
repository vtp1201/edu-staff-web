---
name: project-e11-lms-exams
description: E11 LMS Exams epic status — US-E11.1 student exam flow implemented, mock-first
metadata:
  type: project
---

US-E11.1 Student Exam (list → briefing → taking → result) implemented 2026-06-18 and merged to main.

**Why:** lms service not built yet — mock-first via USE_MOCK + MockExamRepository. Routes: /student/exams + /student/exams/[examId].

**Key decisions made:**
- No new design tokens needed — scoreColorClass reuses existing success-text/primary/error-text
- Server-Action-as-prop pattern: RSC page imports submitExamAction and passes as prop to ExamDetailScreen client step machine
- startedAt captured at briefing→taking step transition (not in timer component) for determinism
- avgScore in list shows "—" (not fabricated) until lms list contract carries scores
- Timer uses milestone-only SR announcements (600/300/120/60s) — not every-second

**Tests:** 564 total (108 files), 32 exam-scoped (use-cases, helpers, mappers, mock repo, timer colorClass)

**A11y:** 10 findings from auditor, all fixed (A11Y-001 contrast, A11Y-002 nav wrapper, A11Y-003 timer SR, A11Y-004 step focus, A11Y-005 dialog close label, A11Y-006 progress label, A11Y-007 tablist labels, A11Y-008 option button name, A11Y-009 review li, A11Y-010 aria-valuetext)

**US-E11.4 Teaching Plan / PPCT** implemented 2026-06-18. Routes: /teacher/teaching-plan + /principal/teaching-plan. Grid uses semantic `<table>/<th scope>/<td>` (not div role="grid") — eliminates all biome useSemanticElements violations without suppressions. Rejection banner uses `bg-edu-error/10 border-edu-error/30 text-edu-error-text`. 618/618 tests pass.

**Key pattern — worktree recovery from engineer stall:** engineer wrote all files but stalled before principal page.tsx and stories. Recovery: read all existing files, write missing pieces directly, run tsc→vitest→biome lint:fix→build gate, then commit+push+merge.

**US-E11.8 Teacher Lesson Plan Authoring** implemented + merged 2026-07-17 (branch `feat/us-e11.8-lesson-plan-authoring`, solo). Full net-new `src/features/lesson-plan` (real `core` BE contract ground-truthed, 6 endpoints, mock-first `USE_MOCK`). 62/62 AC independently mapped to a named test by `fe-qa-playwright` (0 uncovered) — full pipeline ran: planner → component-architect+state-engineer (parallel) → engineer TDD → reviewer+a11y (parallel, Revision Required → fixed) → design-review gate → QA (Conditional Pass, 2 MAJOR → fixed) → merge. Final: 321 files/2063 tests, 28 Storybook interaction tests (this repo's E2E tier — no standalone Playwright harness exists).

**Recurring gate-quality findings from this US (apply to future features):**
- **Mock-fixture leak into production RSC page** is a real, repeatable defect class: an engineer imported `MOCK_CURRENT_TEACHER_ID` from `infrastructure/mocks/` directly into a shipped `page.tsx` — only caught by `fe-tech-lead-reviewer` independently reproducing/checking imports, not by self-report. Brief reviewers to explicitly grep for `infrastructure/mocks` imports outside `.stories.tsx`/tests.
- **QA re-verification by file, not summary, keeps finding real gaps**: this US's QA pass found the already-published race handling (AC-002.4/AC-004.5) had zero UI-layer test despite being named in the use-cases edge-case matrix, plus a genuinely unenforced Must-priority AC (section-length limits, AC-002.3) that self-report never flagged as missing (framed it as "not needed" instead). Keep briefing QA to add real tests for gaps, not just report them.
- **"Arbitrary" design values flagged by reviewer may be normative** — before asking the engineer to change hardcoded px/font-size values, cross-check `design-spec.jsonc`'s actual entry; this US's `text-[10px]/[10.5px]/[11px]` were literal cited spec values, not invented, so fe-lead (not the engineer) should resolve this class of "consider" finding at the design-review gate by reading the spec directly.
- **When spec.md's own i18n gap-analysis is incomplete**, the engineer may need extra keys beyond the BA-cited list to satisfy other ACs (a11y helper text, aria-labels) — that's legitimate, not scope creep, as long as each extra key traces to a specific AC.

**US-E11.9 Teacher Question Bank** implemented + merged 2026-07-18 (branch `feat/us-e11.9-question-bank`, solo, sequenced after E11.8 as planned). Real `core` `exercisebank` contract (6 endpoints), mock-first `USE_MOCK`. Full pipeline: planner → component-architect+state-engineer (parallel) → engineer TDD → reviewer (Approved first pass) + a11y (1 Major/3 Minor, fixed) in parallel → design-review gate (manual `/impeccable`, zero P0/P1) → QA (1 CRITICAL + 1 MAJOR found+fixed, then GO) → merge. Final: 338 files/2179 tests.

- **Promoted 3 components out of the just-shipped sibling `lesson-plan` (US-E11.8)** into `components/shared/` per decision 0026: `TagChipsInput`, `PublishConfirmDialog`, and `OwnerToggle→ScopeToggle` (the last one a fe-lead call mid-pipeline — the component-architect flagged it as a legitimate 3rd promotion candidate beyond its 2 authorized ones, and a 4th candidate, `LessonPlanErrorState`, was explicitly deferred as "accept a 2nd feature-local fork" since it's a ~15-instance-wide codebase pattern too broad for one story to consolidate). **Pattern for future stories that reuse a freshly-shipped sibling**: expect exactly this shape — 2-3 clean promotions plus 1-2 "flag don't force" cases the lead must explicitly decide, not silently accept or block on.
- **fe-component-architect has no shell/Bash tool** — when a promotion involves deleting the old file, it can only stub the old file to `// MOVED... export {}` with a doc-comment instructing fe-lead/engineer to `git rm` it. Always follow up promotions from this role with your own `git rm` + test re-run before trusting the promotion is "done".
- **State-engineer ground-truthing paid off again**: fe-state-engineer read the actually-shipped `lesson-plan` code (not just its own prior `state-architecture.md` design doc) and found the two diverge — the shipped builder is plain Server Actions + `useTransition` + local state, not the `useQuery`/`useMutation` design that was proposed but never built. Always brief state/component-architects to verify sibling-precedent claims against the shipped code, not the sibling's own design docs, which can go stale the moment implementation makes a simpler call.
- **QA's independent AC-derivation caught a CRITICAL bug reviewer+a11y both missed**: AC-902.8's defense-in-depth 422 (`QUESTION_SEARCH_FILTER_REQUIRED`) fell through to a generic error banner instead of the required `QBFilterRequiredPrompt` — proven against real rendered Chromium DOM, not code reading, by writing a NEW test rather than trusting the "17 Storybook tests, all 9 states covered" self-report. 3rd story in a row (after E11.8, US-E19.2) where QA's from-scratch AC↔test traceability (re-derived from spec + actual test files, not the engineer's summary) finds a real, previously-invisible defect. This is now a load-bearing pattern, not a one-off — keep briefing QA exactly this way every time.
- **Two reviewers (tech-lead + a11y) independently flagging the SAME root-cause gap** (dead `subjectError`/`subjectInvalid` wiring on `QBMetaGrid`) is a strong signal to prioritize that fix first in the bundled fix-pass — convergent findings from parallel specialists are higher-confidence than either alone.

**Remaining in E11:** US-E11.3 Exam Bank (in progress in another session per prior observation — re-check claim status before touching). E11.9 now closes out this epic's currently-known scope from the user's side; E11.4/E11.8/E11.9 all delivered.

**How to apply:** When any future exam-scope work lands, be aware the full exam feature module exists at src/features/exam/. The ExamDetailScreen step machine is a reusable pattern for multi-step client flows where server data is loaded once by RSC and then client-side state drives step transitions.
