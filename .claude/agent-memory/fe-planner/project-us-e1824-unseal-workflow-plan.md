---
name: project-us-e1824-unseal-workflow-plan
description: US-E18.24 unseal-workflow wiring plan — rollup entity split, unseal 3-way entity split, selector hoist, pagination
metadata:
  type: project
---

US-E18.24 (`docs/stories/epics/E18-be-wiring/US-E18.24-unseal-workflow-wiring/story.md`)
extends US-E18.13's hybrid facade (`sealBatch` real) by moving 4 more methods
real: `getSealStatus`, `getPendingUnsealRequests`, `initiateUnseal`,
`confirmUnseal`. 4-phase plan written 2026-08-01.

Key structural decisions (bigger than the story's explicit design-call #2,
which only named `getSealStatus` — flagged as open questions to fe-lead,
not silently assumed):
- `SealBatchStatus` (old decorative per-subject shape) demoted to
  mock-internal-only bookkeeping; `getSealStatus` returns a NEW
  `SealStatusRollup extends SealBatchKey` (aggregate counts + 3-value
  rollup status, distinct union from `TermStatus`) on BOTH branches.
- `UnsealRequest` (old mock-rich shape) split into 3 new wire-shaped
  entities for the 3 unseal methods going real: `UnsealRequestSummary`
  (listing), `UnsealInitiateResult`, `UnsealApproveResult` — confirmed zero
  UI-data impact since the container's mutation `onSuccess` handlers never
  read `res.data` for initiate/confirm (only `res.ok`/variables).
- `ClassTermYearSelector` hoisted from `SealTab`-only to screen level
  (shared by both tabs) since `getPendingUnsealRequests` becomes
  class/term-scoped (was tenant-wide) — cascades into a tab-badge-scoping
  behavior change (flagged as open question, no tenant-wide BE alternative
  exists).
- Pagination: `useInfiniteQuery` mirroring `audit-log-screen.tsx`'s
  `fetchNextPage`/`getNextPageParam` precedent (repo's only existing
  cursor-list-in-a-screen example at time of planning).
- Name resolution: same `staffing.di.ts` pattern (injected `resolveNames`
  callback into the real repo constructor, composed from
  `iam-directory.di.ts`'s `makeBatchResolveMembersUseCase`, real-branch-only).

5 open questions logged in the plan for fe-lead: bounded two-admin-gate
pre-check (limit:100, no cursor-follow), tab-badge scoping regression,
`UNSEAL_REASON_REQUIRED`→`reason-too-short` reuse, selector-hoist-as-layout-
change, and the unseal 3-way entity split scope-extension itself.
