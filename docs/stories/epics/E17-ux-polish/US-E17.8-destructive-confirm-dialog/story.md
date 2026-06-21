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

Add Storybook screenshot links and Vitest proof after implementation.
