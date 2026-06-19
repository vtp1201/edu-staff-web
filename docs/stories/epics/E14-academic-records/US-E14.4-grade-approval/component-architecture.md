# US-E14.4 — Component Architecture

```
admin/grades/approval/page.tsx (RSC)
  ├─ resolves gradePublishMode (REAL admin-settings repo)
  └─ <GradeApprovalContainer actions={…} isSelfPublishMode />   ('use client')
        ├─ TanStack Query: list (key ["grade-approval-batches", filter])
        │                  detail (key ["grade-approval-batch-detail", id], enabled)
        ├─ useMutation: approve / requestRevision / bulkLock → invalidate + toast
        └─ <GradeApprovalScreen vm />                          (pure, story-friendly)
              ├─ self-publish branch → <GradePublishModeWarning>
              ├─ <fieldset> status pills (aria-pressed buttons)
              ├─ bulk-lock toolbar (when ≥1 PUBLISHED selected)
              ├─ <Table> rows: <Checkbox> + <BatchStatusBadge> + "Xem" button
              ├─ <BatchReviewSheet>  (Radix Sheet)
              │     ├─ <BatchStatusBadge>
              │     ├─ <GradeDistributionChart>   (CSS bars, tokens)
              │     └─ <Table> preview rows (getScoreColorClass reused from E14.2)
              ├─ <ApproveConfirmDialog>   (Radix AlertDialog)
              ├─ <RevisionRequestDialog>  (Radix Dialog + Textarea, min-10 a11y)
              └─ <BulkLockDialog>         (Radix AlertDialog)
```

## Contracts

- **`GradeApprovalScreenVM`** — fully-built view-model + callbacks; the screen is
  router/query-agnostic (stories pass a static VM with `fn()` callbacks).
- **`GradeApprovalActions`** — the 5 Server Action signatures threaded from the
  RSC page through the container as props (never client-imported).
- **`ActionResult<T>`** = `{ ok: true; data } | { ok: false; errorKey }` — stable
  failure keys; the container maps key → localized toast.

## Component placement

- All components are single-screen (admin approval) → live in
  `features/grades/presentation/grade-approval-screen/components/`. None promoted
  to `shared/` yet (no 2nd consumer). `getScoreColorClass` is **imported**, not
  duplicated, from the sibling `grade-entry-screen/score-color.ts`.
- Status tone is centralized in `BatchStatusBadge` (not inline per-row) per the
  component-organization rule against repeated status-only class maps.
