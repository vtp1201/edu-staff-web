# US-E12.11 — State Design

## Pattern: RSC-initial-data + local state (NO TanStack Query)
Initial mode is fetched server-side in `page.tsx` and passed as `initialMode`.
The screen owns its mutation state locally; persistence goes through the
`onUpdateMode` server action. No client query cache needed (single field).

## Local state (AdminSettingsScreen)
| State | Type | Purpose |
| --- | --- | --- |
| `savedMode` | `GradePublishMode \| null` | last persisted value (source for dirty check + revert) |
| `draftMode` | `GradePublishMode` | the radio selection |
| `saving` | `boolean` | disables Save / shows "Saving..." |
| `showConfirmDialog` | `boolean` | AlertDialog visibility |
| `pendingMode` | `GradePublishMode \| null` | mode awaiting dialog confirm |

`isDirty = draftMode !== savedMode`; `canSave = isDirty && !saving && !isReadOnly`.

## Save flow
1. Click Save (only when `canSave`).
2. If `savedMode === ADMIN_APPROVAL && draftMode === SELF_PUBLISH` →
   set `pendingMode`, open dialog, pause.
3. Otherwise → `commit(draftMode)` directly.
4. Dialog confirm → `commit(pendingMode)`.
5. `commit`: call `onUpdateMode`; on ok → set `savedMode`, toast success;
   on error → toast error (draft retained for retry).

## Failure keys (stable, presentation translates)
Server action returns `{ ok, errorKey?: AdminSettingsFailure["type"] }`.
Toast uses `adminSettings.toast.saveError` (generic); detailed keys live under
`adminSettings.errors.*` for future inline surfacing.
