# US-E14.2 — State Design

## RSC ↔ client boundary
- The grade sheet is fetched in the RSC `page.tsx` via `makeGetGradeSheetUseCase`
  using `searchParams.csId` + `searchParams.term`, then passed as `vm.sheet`.
- Selection changes (`Select` onValueChange) call `onSelectionChange` →
  `GradeEntryContainer` rewrites the URL via `router.replace(?csId&term)` →
  RSC re-fetches → fresh `vm.sheet` props. No client-side sheet fetch.

## TanStack Query usage
- `gradeKeys.sheet(csId, term) = ["grades", csId, term]` — query-key convention
  for future client refetch / cache.
- **saveMutation** (`useMutation`):
  - `mutationFn` → `vm.saveScoreAction(...)` (Server Action).
  - `onMutate` → optimistic: patch the local working copy of `sheet`
    (`useState<GradeSheet>`), recompute the affected row's average via
    `calculateWeightedAverage`. Returns `{ prev }` context.
  - `onError` → rollback to `ctx.prev`, show network-error banner.
  - The local working copy resyncs from props when `selectedCsId|term|rowCount`
    changes (render-phase setState guarded by `syncKey`).
- **publishMutation** (`useMutation`):
  - `mutationFn` → `vm.publishAction(csId, term)`.
  - `onSuccess` → close dialog; banner = `publishSuccess` or
    `publishPendingApproval` (by `sheet.publishMode`);
    `invalidateQueries({ queryKey: ["grades"] })`.

## Why optimistic for save, invalidate for publish
Inline cell edits must feel instant (blur/Enter → cell shows new value + new
average immediately); a failed save rolls back. Publish is a coarse, infrequent
state transition (lock the whole sheet) where a refetch/revalidate is correct —
no optimistic UI needed; the RSC `revalidatePath` in the action re-renders rows
read-only.

## Locking
`isLocked(sheet)` = any row not `DRAFT`. When locked: no publish button,
`GradeEntryTable readOnly` renders `<span>` not `<input>`, status badge shown.
