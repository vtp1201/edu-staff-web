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

**Remaining in E11:** US-E11.2+ (if any) — check story packet for next planned story.

**How to apply:** When any future exam-scope work lands, be aware the full exam feature module exists at src/features/exam/. The ExamDetailScreen step machine is a reusable pattern for multi-step client flows where server data is loaded once by RSC and then client-side state drives step transitions.
