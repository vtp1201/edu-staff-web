---
name: project-us-e244-cross-subject-plan
description: US-E24.4 cross-subject tabs plan — key corrections, zero-client-component design, dropped submission check
metadata:
  type: project
---

Plan written to `docs/stories/epics/E24-learning-class-hub/US-E24.4-cross-subject-tabs/US-E24.4-cross-subject-tabs.md` §Implementation Plan (2026-09-05).

Key findings that corrected the packet:
- `makeListExamsUseCase`/`exam.di.ts` is NOT dead — `student/exams/[examId]/page.tsx` uses it to find-by-id from the full list (no single-exam-get in `lms`). Only `features/exam/presentation/exam-list/**` + old list route are dead; exam domain/infra/di and briefing/taking/result stay.
- US-E24.5's course player already sets precedent: EXAM CTA branches on `state` alone (no submission check), and D-1 dropped per-item "Đã nộp" for assignments (no wire field). US-E24.4 extends this — cross-subject row does ZERO submission reads (not N reads, zero), CTA is state-only for both kinds.
- `formatItemWindow` (course-timeline) is explicitly pre-documented as shared with the cross-subject list — reuse directly. `groupItemsByWeek` is NOT reusable (different grouping axis) — needed a new pure `sort-cross-subject-items.ts`.
- Whole feature designed with ZERO `'use client'` components — view + sub-tab both live in URL search params (`?view=&sub=`), navigation is all `<Link>`. This satisfies "URL is state" literally and made fe-component-architect/fe-state-engineer both skippable.
- Data-fetch fan-out (`listCourses` + `Promise.allSettled(listItems)`) extracted from `ListCoursesWithSummaryUseCase` into a new shared `fetch-course-timelines.ts` helper, reused by a new `ListCoursesWithItemsUseCase` — avoided duplicating N+1 logic, existing test suite must stay green (regression proof).

See [US-E24.2 base](project-us-e1213-subject-detail-route-plan.md)-adjacent memories for other E24 phased-plan precedents if reused later.
