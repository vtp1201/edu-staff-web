---
name: project-e11-lesson-plan-authoring
description: US-E11.8 lesson-plan authoring UC patterns — client-side-filter-over-fetched-page AC phrasing, one-way-publish race handling, teacher-only-with-BE-support-for-admin-backlog pattern
metadata:
  type: project
---

US-E11.8 (docs/stories/epics/E11-lms-exams/US-E11.8-lesson-plan-authoring/) —
teacher lesson-plan builder (core service `lessonplan` sub-domain, DR-021).

## Client-side-filter-over-fetched-page AC pattern (reusable)
When `ba-integration-analyst` finds a list endpoint only supports
`cursor`/`limit` (no subject/grade/status/search query params), don't write
AC as "the server returns filtered results" — write it as "given the
currently loaded page(s), when I select filter X, then only matching rows
show" and add an explicit edge-case row: filter can hide results that exist
on an unfetched later cursor page. Same pattern likely recurs for
exam-bank/question-bank list screens sharing the same BE convention — check
integration.md's §4/pagination section for this exact caveat before
assuming a filter dropdown = server query.

## One-way publish + race handling pattern
For any DRAFT→PUBLISHED (or similar terminal-state) one-way transition with
a confirm dialog: model TWO races explicitly as separate exception flows —
(a) edit-after-published-elsewhere (PUT hits 422 ALREADY_PUBLISHED, form
auto-locks + refetches to sync) and (b) publish-click-after-already-published
(same error code, but from the publish action itself — dialog closes,
refetch to locked view, idempotent). Both map to the same wire error code
but are distinct UC exception flows because the recovery UI differs
(auto-lock vs. dialog-close-and-refresh).

## Teacher-only-v1-despite-BE-support pattern
When ba-lead ground-truths a BE visibility matrix that already supports a
broader role (e.g. MANAGER/ADMIN unconditional read) but the design-spec
locks `roles: [x]` narrower — do NOT model the unbuilt broader-role UC as an
`[OPEN QUESTION]`. Instead state it as a **settled scope decision** with a
"backlog, not a gap" note in the UC doc's header, and repeat it once more in
Open Questions section as "not an open question, restated for
traceability" so ba-spec-writer's matrix doesn't silently drop it. Keeps the
open-questions list honest (only real unknowns) while still surfacing the
scope note downstream.
