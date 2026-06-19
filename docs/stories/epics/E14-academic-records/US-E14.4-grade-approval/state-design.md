# US-E14.4 — State Design

## TanStack Query (client, in `GradeApprovalContainer`)

| Concern | Key | Notes |
| --- | --- | --- |
| Batch list | `["grade-approval-batches", statusFilter]` | refetch on filter change |
| Batch detail | `["grade-approval-batch-detail", batchId]` | `enabled: batchId !== null` |

Query fns call the Server Actions (`listBatches` / `getDetail`); on `!ok` they
`throw result.errorKey` so the query lands in `error` (surfaced as `vm.error`).

## Mutations

| Action | On success |
| --- | --- |
| `approve(batchId)` | toast `approveSuccess` (subject+class), close sheet, invalidate list |
| `requestRevision(batchId, note)` | toast `revisionSuccess`, close sheet, invalidate list |
| `bulkLock(ids)` | toast `bulkLockSuccess`(count), clear selection, invalidate list |

All mutations branch on `result.ok`; a returned `errorKey` → `toast.error` with
the mapped `gradeApproval.error*` message. Invalidation uses the partial key
`["grade-approval-batches"]` to refresh every filter variant.

## Local UI state (container)

- `statusFilter` (resets selection on change), `selectedBatchIds`
  (only PUBLISHED batches are selectable), `detailBatchId` (drives the sheet +
  detail query).

## Local UI state (screen)

- Dialog open flags (`approveOpen` / `revisionOpen` / `bulkLockOpen`) — pure
  presentation; the revision Dialog owns its own note + validation state.

## RSC ↔ client boundary

- `gradePublishMode` is resolved **server-side** (REAL setting) and passed as the
  boolean `isSelfPublishMode` prop — never fetched client-side.
- Token refresh / RBAC are server concerns (`/admin` layout guard); the client
  only ever holds view-model data + stable failure keys.
