# US-E17.8 DestructiveConfirmDialog Shared Component

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none (but FR-009 consolidation touches exam-bank, grades, admin-roster, admin-settings, admin/class-management)
- Feature module(s) chạm:
  - `src/components/shared/destructive-confirm-dialog/` (new)
  - `src/features/announcements/presentation/` (net-new instance wire)
  - `src/features/discipline/presentation/` (net-new instance wire)
  - `src/features/staff-leave/presentation/` (net-new instance wire)
  - `src/features/exam-bank/presentation/exam-bank-screen/` (consolidation)
  - `src/features/grades/presentation/grade-approval-screen/` (consolidation)
  - `src/features/admin-roster/presentation/student-roster-screen/` (consolidation)
  - `src/features/admin-settings/presentation/admin-settings-screen/` (consolidation)
  - `src/features/admin/class-management/presentation/class-management-screen/` (consolidation)
- Shared contract/file: `src/components/ui/alert-dialog/` (Radix AlertDialog primitive — read-only)

## Product Contract

A canonical `DestructiveConfirmDialog` in `src/components/shared/destructive-confirm-dialog/` replaces seven feature-local confirm dialogs and wires three net-new high-stakes confirm flows (announcements send-to-school, discipline violation delete, staff-leave reject). The component accepts `open`, `title`, `body`, `confirmLabel`, `isLoading`, `onConfirm`, and `onCancel` props; it has `role="alertdialog"`, focus trap, keyboard handling (Escape/Enter), and loading state (`aria-busy`). No hardcoded strings; all copy is passed by callers as resolved i18n values.

## Relevant Product Docs

- `docs/design-requests/DR-011-ux-polish-interactions.md` §UX-02
- `docs/product/design-spec.jsonc` → `interactionPatterns.destructiveConfirmDialog`
- `docs/stories/epics/E17-ux-polish/US-E17.8-destructive-confirm-dialog/spec.md`
- `.claude/rules/component-organization.md` (composed component, ≥3 screens → `components/shared/`)

## Acceptance Criteria

- AC-E17.8-01: Dialog has `role="alertdialog"`, AlertTriangle icon (20px, text-destructive), title (text-base font-bold), body (text-sm text-muted-foreground), and `aria-labelledby` pointing to title.
- AC-E17.8-09: When `isLoading=true`, both buttons are disabled and confirm button has `aria-busy="true"`.
- AC-E17.8-11: Tab cycles focus only between cancel and confirm buttons (Radix focus trap — no focus escape).
- AC-E17.8-12: Escape key calls `onCancel` and closes the dialog.
- AC-E17.8-17: Announcements instance shows `announcements.sendConfirmTitle`, `announcements.sendConfirmBody` (interpolated with recipientCount), `announcements.btnSendNow`.
- AC-E17.8-19: Discipline violation instance shows `discipline.violations.deleteDialog.*` keys.
- AC-E17.8-22: Staff-leave instance shows `staffLeave.rejectConfirmTitle`, `staffLeave.rejectConfirmBody`, `staffLeave.actions.confirmReject` (principal/admin only).
- AC-E17.8-24: After consolidation, none of the 7 feature-local files contain a standalone AlertDialog wrapper.

## Design Notes

- Commands: none (component delegates mutations to parent via `onConfirm`)
- Queries: none
- API: none
- Tables: none
- Domain rules: Cancel button always left; confirm button always right; `variant="destructive"` on confirm
- UI surfaces:
  - New: `src/components/shared/destructive-confirm-dialog/destructive-confirm-dialog.tsx`
  - New: `src/components/shared/destructive-confirm-dialog/index.ts`
  - New: `src/components/shared/destructive-confirm-dialog/destructive-confirm-dialog.stories.tsx`
  - Wire in: announcements, discipline violations, staff-leave presentation components
  - Replace: 7 feature-local dialog files (see spec.md §5 FR-009 for full list)
- i18n keys used: `announcements.sendConfirmTitle`, `announcements.sendConfirmBody`, `announcements.btnSendNow`, `discipline.violations.deleteDialog.title`, `discipline.violations.deleteDialog.body`, `discipline.violations.deleteDialog.confirmLabel`, `staffLeave.rejectConfirmTitle`, `staffLeave.rejectConfirmBody`, `staffLeave.actions.confirmReject` — all existing (no net-new keys in this story)

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.8 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: props/state variants — confirm `aria-busy` true/false, disabled state, `onConfirm`/`onCancel` called exactly once each |
| Integration | None (no BE boundary) |
| E2E | Storybook interaction: open/confirm/cancel/loading/Escape + all 3 instance text stories; regression check that 7 feature-local files no longer contain standalone AlertDialog |
| Platform | Manual keyboard-only test: Tab cycle, Escape, Enter on confirm button |
| Release | n/a |

## Harness Delta

No harness changes required. No new endpoints, tokens, or net-new i18n keys.

## Evidence

Implemented 2026-07-05 on branch `feat/us-e17.8-destructive-confirm-dialog`.

### Test / Storybook proof

- **Shared component** — `src/components/shared/destructive-confirm-dialog/`:
  - `destructive-confirm-dialog.test.tsx` (Vitest, node env): 8 tests over the pure
    portal-free `DestructiveDialogActions` footer + closed-state — `aria-busy="true"`
    when loading / absent when idle, both buttons `disabled=""` when loading / neither
    when idle, cancel-left-before-confirm-right DOM order, `data-variant="destructive"`
    (confirm) + `data-variant="outline"` (cancel), labels rendered, and `open=false`
    renders empty markup.
  - `destructive-confirm-dialog.stories.tsx`: 8 interaction stories — `Closed`,
    `OpenIdle` (role=alertdialog + onConfirm once), `CancelClick` (onCancel once),
    `EscapeCancels` (Escape → onCancel once), `OpenLoading` (aria-busy + both disabled),
    and 3 real-instance text variants (`AnnouncementsSendToSchool` with 150 interpolated,
    `DisciplineViolationDelete`, `StaffLeaveReject`).
  - **Why the DOM contract splits across two layers:** the repo's Vitest runs in `node`
    (no jsdom / `@testing-library/react`) and Radix portals do not render server-side, so
    `renderToStaticMarkup` cannot reach the dialog's portal content. Loading/disabled/
    variant/order → proven in Vitest against the extracted pure footer; role/interaction/
    Escape/call-counts → proven in the Storybook browser stories.
- **Discipline delete-violation** — `delete-violation.use-case.test.ts` (2 tests, TDD
  red→green: deletes via repo; rejects `not-found` on blank id) + a mock-repo integration
  test in `discipline.repository.test.ts` (`deleteViolation` removes the row). All 11
  sibling discipline use-case test mocks extended with `deleteViolation: vi.fn()`.
- **Gate:** `bunx tsc --noEmit` clean · `bun vitest run` 1000 passed (197 files) ·
  `bun run build` compiled successfully · `bun lint` exit 0 (the 1 pre-existing
  warning/info is in unrelated `message-context-menu.tsx`).

### Component API note — cancel label

FR-001's 7-prop contract has no `cancelLabel`, but a cancel button needs text and NFR-004
forbids hardcoded strings. The shared component resolves the cancel label internally from
the existing `Common.confirmDialog.cancel` key via `useTranslations("Common")` — no net-new
key, no hardcoded string, and the 7 functional props stay exactly as specified. Cancel is a
universal word; every consumer's title/body/confirm remain caller-resolved as required.

### i18n key correction (spec typo)

spec.md §5 FR-007 / §9 and design-spec.jsonc reference
`discipline.violations.deleteDialog.confirmLabel` — **that key does not exist** in
`messages/{vi,en}.json`. The actual existing key is
`discipline.violations.deleteDialog.confirm` ("Xóa vi phạm"). The discipline instance uses
`.confirm`; **no new `.confirmLabel` key was added** (per NFR-004 / "no net-new i18n keys").

### Deviation — staff-leave reject (FR-008 / AC-E17.8-22 NOT migrated by letter)

The staff-leave reject flow (`staff-leave-request-card.tsx`) is an inline expanding panel
with a **mandatory rejection-reason `Textarea`** (`MIN_REJECT_LENGTH = 10`, `aria-required`,
`aria-invalid`, focus-managed; shipped US-E09.3, later displayed to the rejected staff via
`request.rejectionReason`). `DestructiveConfirmDialog`'s title/body/confirmLabel API has no
input-capture slot, so migrating would silently drop the reason requirement — a real data
regression. Per FR-009 AC ("bespoke behavior not expressible by the shared API → document
the deviation and flag for API extension, no fork") the existing flow is **left untouched**.
A future optional `children`/extra-field slot on the shared component would be the
prerequisite to migrate this instance — not built now. The `StaffLeaveReject` Storybook
story still models the reject text variant for reference. Staff-leave was correctly
**excluded** from the FR-009 7-dialog consolidation list; this deviation is only about the
net-new instance in §FR-008.

### Net-new discipline delete-violation layers (in-scope necessity for FR-007)

Delete-violation did not exist anywhere in the feature. To satisfy FR-007 under Clean
Architecture + mock-first (decision 0014), these files were added (not scope creep — the
use-case/repo layers must exist even against an in-memory mock):

- domain: `delete-violation.use-case.ts` (+ test), `deleteViolation(id)` on
  `i-discipline.repository.ts`.
- infrastructure: mock impl (filters in-memory `_violations`, mirrors `recordViolation`),
  real repo `http.delete(DISCIPLINE_EP.deleteViolation(id))`, endpoint constant.
- bootstrap/di: `makeDeleteViolationUseCase()`.
- app: `deleteViolationAction` in both teacher + principal `actions.ts`; wired through
  both `page.tsx` → `DisciplineScreenVM.deleteViolationAction`.
- presentation: teacher-only per-row delete button (`isTeacher` gate) → optimistic list
  removal + `deleteToast`, no real BE endpoint (UI-polish scope, mock-first).

### Consolidation (FR-009 / AC-E17.8-24)

All 7 feature-local dialogs deleted and their call sites migrated to import
`DestructiveConfirmDialog` directly (no thin re-export wrappers): exam-bank delete +
publish (publish used at 2 call sites), grade-approval approve + bulk-lock, admin-roster
unenroll, admin-settings switch, class-management archive. `bulk-lock`/`approve`/`publish`/
`switch`/`archive` gain `variant="destructive"` + `aria-busy` from the shared contract
(expected per DR-011, not a regression). **Minor visual change on archive-class:** the
bespoke amber "has-students" warning box is folded into the body string (information
preserved as text; loses the standalone alert-box styling) — flagged here as the only
consolidation that had extra presentational content.
