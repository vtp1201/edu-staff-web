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

**Remaining in E11:** US-E11.3 Exam Bank (planned, claimed by another session per stash state observed); US-E11.9 Question Bank (planned, runs after E11.8 per user's explicit sequencing — shares `lms.endpoint.ts`-adjacent territory + `messages` namespace, do not run in parallel).

**How to apply:** When any future exam-scope work lands, be aware the full exam feature module exists at src/features/exam/. The ExamDetailScreen step machine is a reusable pattern for multi-step client flows where server data is loaded once by RSC and then client-side state drives step transitions.
