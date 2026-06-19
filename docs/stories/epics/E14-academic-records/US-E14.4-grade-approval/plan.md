# US-E14.4 — Grade Approval Pipeline (Admin) — Implementation Plan

Extends the existing `src/features/grades/` module (US-E14.2) without modifying
its grade-entry behaviour. Admin reviews teacher-submitted grade batches:
approve → PUBLISHED, request revision → DRAFT (back to teacher), bulk-lock
PUBLISHED → LOCKED.

## Phases

1. **Domain (TDD)** — new `grade-approval-batch.entity.ts`; extended
   `grades.failure.ts` (+4 types); new `IGradeApprovalRepository` (kept separate
   from `IGradesRepository` so the approval flow needs no assessment-scheme /
   publish-mode); three use-cases (`approve`, `request-revision` with min-10-char
   note rule, `bulk-lock` with empty no-op). Tests written first (red → green).
2. **Infrastructure** — DTOs + plain-function mapper (`gradeLabel`,
   `mapBatch`, `mapBatchDetail` with band distribution); mock repo (instance-level
   mutable seed, throws failure union); real `GradeApprovalRepository`
   (`server-only`, envelope-cast, `errorCodeOf`/`statusOf` → failure). Mapper +
   mock-repo tests.
3. **Bootstrap** — `GRADES_EP` + 5 approval endpoints; `grades.di.ts` adds
   `makeGradeApprovalRepository` + 3 use-case factories (mock-first via `USE_MOCK`).
4. **Presentation** — VM contract; client container (TanStack Query list/detail
   + 3 mutations, sonner toasts, query invalidation); screen (status pills,
   selectable table, bulk-lock toolbar, self-publish warning, empty/loading);
   components (status badge, review SideSheet, approve/bulk-lock AlertDialogs,
   revision Dialog, skeleton, distribution chart, publish-mode warning).
5. **App** — Server Actions (stable failure keys); RSC page under
   `/admin/grades/approval` (RBAC inherited from `/admin` layout guard; resolves
   REAL `gradePublishMode`).
6. **i18n** — `gradeApproval` namespace in vi + en.
7. **Storybook** — 9 stories (loading / mixed / pending-filter / sheet / approve /
   revision / bulk-lock / self-publish / empty).

## Key decisions

- **Separate `IGradeApprovalRepository`** instead of widening `IGradesRepository`
  — the approval pipeline has no need of the grade-entry repo's scheme/publish-mode
  constructor deps, and this leaves E14.2 untouched.
- **List/detail have no domain rules** → RSC/actions call the repo directly via
  `makeGradeApprovalRepository()`; only approve/revision/bulk-lock are use-cases.
- **`requestGradeRevision` removes the batch from the mock queue** (it returns to
  the teacher as DRAFT — no longer an approval item).

## Proof

- Unit: 10 use-case + 8 mapper-band + 10 mock-repo assertions (TDD).
- Build/tsc: `bunx tsc --noEmit` clean; `bun run build` compiles the new route.
- Storybook interaction: loading / empty / error-tone / success covered.
