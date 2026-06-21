# US-E17.8 — DestructiveConfirmDialog: Use Cases & Acceptance Criteria

**Story ID:** US-E17.8
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**UC Author:** ba-use-case-modeler

---

## 1. Use Case Scope Summary

**Total UCs:** 7
**Actors:** Teacher, Principal, Admin (role-gated per feature)
**System boundary:** `components/shared/destructive-confirm-dialog/` (presentational). No BE calls — the component delegates async work to parent callers via `onConfirm`. Three net-new instances (announcements send-to-school, discipline violation delete, staff-leave reject) plus consolidation of 7 existing feature-local dialogs.

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities in Scope |
|---|---|---|
| Teacher | Human, internal | Trigger confirm dialog: exam-bank delete, discipline violation delete, announcements send-to-school |
| Principal | Human, internal | Trigger confirm dialog: exam-bank delete, discipline violation delete, announcements send-to-school, staff-leave reject, grade-approval approve/bulk-lock |
| Admin | Human, internal | Trigger confirm dialog: admin-roster unenroll, admin-settings switch, class archive |
| Screen reader user | Assistive technology | Receives focus-trap, alertdialog role, aria-busy announcements |

---

## 3. Use Case Catalogue

### UC-E17.8-001 — Open and Confirm a Destructive Action

**Primary Actor:** Teacher / Principal / Admin
**Secondary Actors:** Screen reader
**Preconditions:**
1. User has clicked a destructive-intent trigger (Delete, Reject, Send-to-all, Unenroll, Archive, Approve).
2. Parent component has set `open=true`, passed non-empty `title`, `body`, `confirmLabel`, `onConfirm`, `onCancel` props.
3. `isLoading=false`.

**Main Success Scenario:**
1. Dialog renders with `role="alertdialog"`, focus trapped inside.
2. AlertTriangle icon (20px, `text-destructive`) appears left of title (`text-base font-bold text-foreground`).
3. Body text (`text-sm text-muted-foreground`) appears below the icon+title row.
4. Footer renders: cancel button (left, default/outline variant) and confirm button (right, `variant="destructive"`).
5. User clicks confirm button.
6. `onConfirm()` is called exactly once.
7. Parent sets `open=false` and handles mutation.
8. Focus returns to the original trigger element.

**Alternative Flows:**
- A1 (Cancel via button): At step 5, user clicks cancel → `onCancel()` called; dialog closes; focus returns to trigger.
- A2 (Empty title): Title prop is empty string → dialog renders without crashing; icon and body still visible.

**Exception Flows:**
- E1 (Trigger element removed before close): Trigger element is gone (optimistic delete) → focus falls to nearest logical ancestor; no crash.
- E2 (onConfirm / onCancel missing): Props are absent → component does not render; development console logs prop-type violation.

**Business Rules:**
- BR-001: Component itself contains no hardcoded strings; all copy is resolved i18n values passed by caller.
- BR-002: Confirm button uses `variant="destructive"` (bg-destructive text-destructive-foreground) per design-system.
- BR-003: Cancel button is always left of confirm button in the footer.

**Non-functional Constraints:**
- WCAG 2.1.1 (keyboard), 2.4.3 (focus order), 4.1.3 (status), 1.4.3 (contrast ≥4.5:1 body text).
- Responsive: no horizontal overflow at 320px; `max-height: 92vh` with internal scroll for long body text.

---

### UC-E17.8-002 — Loading State After Confirm

**Primary Actor:** Teacher / Principal / Admin
**Preconditions:** Dialog is open, user has clicked confirm, parent has set `isLoading=true`.

**Main Success Scenario:**
1. Parent sets `isLoading=true` after user clicks confirm.
2. Confirm button shows `aria-busy="true"`; both cancel and confirm buttons are disabled.
3. Confirm button renders loading indicator (spinner if Button loading variant available, else `aria-busy` alone).
4. User cannot click either button.
5. Parent's async mutation resolves → parent sets `isLoading=false` and `open=false`.
6. Dialog closes; focus returns to trigger.

**Exception Flows:**
- E1 (Parent never clears isLoading): Dialog remains open indefinitely with disabled buttons; component does not auto-close — parent controls `open` prop.

---

### UC-E17.8-003 — Keyboard Navigation and Escape

**Primary Actor:** Any keyboard user
**Preconditions:** Dialog is open, focus is inside the dialog.

**Main Success Scenario:**
1. User can Tab between cancel button, confirm button (two focusable elements in footer).
2. Focus cycles within the dialog (focus trap); Tab past the last element wraps back to first.
3. User presses Escape → `onCancel()` is called; dialog closes; focus returns to trigger.
4. User presses Enter while confirm button is focused → `onConfirm()` is called.
5. User presses Space while confirm button is focused → `onConfirm()` is called.

**Alternative Flows:**
- A1 (Enter on cancel button): Enter on cancel → `onCancel()` called.
- A2 (Escape during isLoading): Both buttons disabled; Escape still calls `onCancel()` (Radix default behavior — OPEN QUESTION: confirm with FE whether Radix AlertDialog fires onCancel on Escape when overlay is non-dismissable during loading).

---

### UC-E17.8-004 — Announcements Send-to-School Instance

**Primary Actor:** Teacher / Principal
**Preconditions:**
1. User has completed an announcement draft.
2. User clicks the send-to-school action.
3. `recipientCount` is available from announcement entity state.

**Main Success Scenario:**
1. Parent opens dialog with:
   - `title = t('announcements.sendConfirmTitle')`
   - `body = t('announcements.sendConfirmBody', { recipientCount })`
   - `confirmLabel = t('announcements.btnSendNow')`
2. Dialog renders with recipient count interpolated into body text.
3. User confirms → `onConfirm()` called → send mutation fires.

**Alternative Flows:**
- A1 (recipientCount unavailable): Body renders with the key value without showing a broken `{recipientCount}` placeholder — the key value itself must gracefully handle missing interpolation or caller uses a fallback.

**Exception Flows:**
- E1 (User cancels): `onCancel()` called; draft is unchanged; no send mutation fires.

---

### UC-E17.8-005 — Discipline Violation Delete Instance

**Primary Actor:** Teacher / Principal (delete permission on violations)
**Preconditions:**
1. User clicks delete on a violation row.
2. User has delete permission.

**Main Success Scenario:**
1. Parent opens dialog with:
   - `title = t('discipline.violations.deleteDialog.title')`
   - `body = t('discipline.violations.deleteDialog.body')`
   - `confirmLabel = t('discipline.violations.deleteDialog.confirmLabel')`
2. Dialog opens; user confirms → `onConfirm()` called → deletion mutation fires.
3. Deletion succeeds → parent closes dialog; violation record is removed.

**Exception Flows:**
- E1 (Delete API fails): Parent mutation fails → parent shows error toast; parent sets `isLoading=false` but keeps `open=true`; dialog remains open so user can retry or cancel.
- E2 (User cancels): `onCancel()` called; violation record is unchanged.

---

### UC-E17.8-006 — Staff-Leave Reject Instance

**Primary Actor:** Principal / Admin
**Preconditions:**
1. Leave request is in `pending` state.
2. Principal/Admin clicks the reject action on the leave request.

**Main Success Scenario:**
1. Parent opens dialog with:
   - `title = t('staffLeave.rejectConfirmTitle')`
   - `body = t('staffLeave.rejectConfirmBody')`
   - `confirmLabel = t('staffLeave.actions.confirmReject')`
2. User confirms → `onConfirm()` called → rejection mutation fires.
3. Rejection succeeds → parent closes dialog; staff notification triggered by backend.

**Exception Flows:**
- E1 (Rejection API fails): Error toast surfaced by parent; dialog stays open (`open=true`) until parent sets `open=false`.
- E2 (Wrong role — teacher): Teacher role cannot access staff-leave reject; dialog never opens (role-gated at feature level, not inside the shared component).

---

### UC-E17.8-007 — Consolidation of Feature-Local Dialogs

**Primary Actor:** FE team (implementation time)
**Preconditions:** Shared `DestructiveConfirmDialog` is implemented and Storybook-verified.

**Main Success Scenario:**
1. FE team migrates each existing feature-local dialog to use the shared component:
   - `exam-bank/delete-confirm-dialog.tsx`
   - `exam-bank/publish-confirm-dialog.tsx`
   - `grade-approval/approve-confirm-dialog.tsx`
   - `admin-roster/unenroll-confirm-dialog.tsx`
   - `announcements/delete-announcement-dialog.tsx`
   - `admin-settings/switch-confirm-dialog.tsx`
   - `admin/class-management/archive-class-dialog.tsx`
2. Each migrated caller passes correct `title`, `body`, `confirmLabel`, `onConfirm`, `onCancel` as resolved i18n strings.
3. Feature-local dialog files are deleted; no duplicate AlertDialog wrappers remain.

**Exception Flows:**
- E1 (Feature-local dialog has bespoke behavior): Behavior not expressible by the shared API → FE documents the deviation and flags for API extension before migration; no fork.

---

## 4. Acceptance Criteria

### UC-E17.8-001: Open and Confirm

**AC-E17.8-01 — Success: dialog renders with correct structure**
Given a parent component sets `open=true` with non-empty `title`, `body`, `confirmLabel`, `onConfirm`, and `onCancel` props,
When the dialog mounts,
Then the dialog element has `role="alertdialog"`,
And an AlertTriangle icon (20px, color `text-destructive`) appears left of the title,
And the title renders with `text-base font-bold text-foreground`,
And the body renders below the icon+title row with `text-sm text-muted-foreground`,
And the cancel button is on the left of the footer using default/outline variant,
And the confirm button is on the right of the footer using `variant="destructive"`,
And `aria-labelledby` on the dialog points to the title element.

**AC-E17.8-02 — Success: confirm fires onConfirm**
Given the dialog is open with `isLoading=false`,
When the user clicks the confirm button,
Then `onConfirm` is called exactly once,
And the component does not set `open=false` itself (parent controls the open state).

**AC-E17.8-03 — Success: cancel fires onCancel**
Given the dialog is open,
When the user clicks the cancel button,
Then `onCancel` is called exactly once.

**AC-E17.8-04 — Success: focus returns to trigger on cancel**
Given the dialog was opened by clicking a trigger element,
When the user cancels (button click or Escape),
Then keyboard focus is returned to the trigger element that opened the dialog.

**AC-E17.8-05 — Success: focus returns to trigger on confirm**
Given the dialog was opened by clicking a trigger element and the user clicks confirm,
When the parent subsequently sets `open=false`,
Then keyboard focus is returned to the trigger element.

**AC-E17.8-06 — Edge: trigger removed before close**
Given the dialog is open and the trigger element is removed from the DOM (e.g. optimistic UI delete),
When the dialog closes,
Then focus moves to the nearest logical ancestor without throwing an error.

**AC-E17.8-07 — Edge: empty title prop**
Given `title=""` is passed,
When the dialog renders,
Then the dialog does not crash,
And the icon and body text are still visible.

**AC-E17.8-08 — Responsive: 320px viewport**
Given the dialog is open and the viewport is 320px wide,
When the dialog renders,
Then there is no horizontal overflow,
And if body text is long, the dialog content is scrollable (max-height 92vh with internal scroll).

---

### UC-E17.8-002: Loading State

**AC-E17.8-09 — Loading: buttons disabled when isLoading=true**
Given the dialog is open and `isLoading=true`,
When the dialog renders,
Then the confirm button has `aria-busy="true"`,
And both cancel and confirm buttons have the `disabled` attribute,
And no pointer interaction is possible on either button.

**AC-E17.8-10 — Loading: state updates in same render cycle**
Given `isLoading` changes from `false` to `true`,
When the React render cycle completes,
Then the disabled state is visible without perceptible render lag.

---

### UC-E17.8-003: Keyboard Navigation

**AC-E17.8-11 — Keyboard: focus trap within dialog**
Given the dialog is open,
When the user presses Tab repeatedly,
Then focus cycles only between the focusable elements inside the dialog (cancel button, confirm button),
And focus does not reach elements outside the dialog.

**AC-E17.8-12 — Keyboard: Escape closes dialog**
Given the dialog is open and focus is anywhere inside,
When the user presses Escape,
Then `onCancel` is called,
And the dialog closes.

**AC-E17.8-13 — Keyboard: Enter activates confirm button**
Given the confirm button is focused,
When the user presses Enter,
Then `onConfirm` is called.

**AC-E17.8-14 — Keyboard: Space activates confirm button**
Given the confirm button is focused,
When the user presses Space,
Then `onConfirm` is called.

**AC-E17.8-15 — Keyboard: Enter activates cancel button**
Given the cancel button is focused,
When the user presses Enter,
Then `onCancel` is called.

**AC-E17.8-16 — Accessibility: focus ring visible**
Given the user navigates to the confirm or cancel button via Tab,
When the button is focused,
Then a visible focus ring using `--ring` token is displayed; no `outline: none` without replacement.

---

### UC-E17.8-004: Announcements Send-to-School Instance

**AC-E17.8-17 — Announcements: dialog opens with correct copy**
Given a teacher or principal clicks send-to-school on a completed announcement draft with `recipientCount=150`,
When the parent opens the dialog,
Then the title resolves to the value of `announcements.sendConfirmTitle`,
And the body resolves to the value of `announcements.sendConfirmBody` with `{recipientCount: 150}` interpolated (e.g. showing "150 người nhận"),
And the confirm label resolves to the value of `announcements.btnSendNow`.

**AC-E17.8-18 — Announcements: cancel leaves draft unchanged**
Given the send-to-school confirm dialog is open,
When the user clicks cancel,
Then no send mutation fires,
And the announcement draft remains in its current state.

---

### UC-E17.8-005: Discipline Violation Delete Instance

**AC-E17.8-19 — Violations: dialog opens with correct copy**
Given a teacher or principal clicks delete on a violation row,
When the parent opens the dialog,
Then the title resolves to `discipline.violations.deleteDialog.title`,
And the body resolves to `discipline.violations.deleteDialog.body`,
And the confirm label resolves to `discipline.violations.deleteDialog.confirmLabel`.

**AC-E17.8-20 — Violations: confirm triggers deletion**
Given the violation delete dialog is open,
When the user confirms,
Then `onConfirm` is called and the deletion mutation is initiated by the parent.

**AC-E17.8-21 — Violations: API error — dialog stays open**
Given the user confirmed deletion and the parent mutation fails,
When the parent calls `setIsLoading(false)` but keeps `open=true` and surfaces an error toast,
Then the dialog remains open (cancel/confirm buttons are re-enabled),
And the error toast is shown by sonner (not inside the dialog).

---

### UC-E17.8-006: Staff-Leave Reject Instance

**AC-E17.8-22 — Staff-leave: dialog opens with correct copy (principal/admin only)**
Given a principal or admin clicks reject on a pending leave request,
When the parent opens the dialog,
Then the title resolves to `staffLeave.rejectConfirmTitle`,
And the body resolves to `staffLeave.rejectConfirmBody`,
And the confirm label resolves to `staffLeave.actions.confirmReject`.

**AC-E17.8-23 — Staff-leave: teacher cannot reach this dialog**
Given a teacher role is authenticated,
Then the staff-leave reject action is not visible (role-gated at feature level),
And the DestructiveConfirmDialog for staff-leave rejection is never opened.

---

### UC-E17.8-007: Consolidation of Feature-Local Dialogs

**AC-E17.8-24 — Consolidation: no feature-local AlertDialog duplicates remain**
Given the shared `DestructiveConfirmDialog` is implemented,
When the FE team has completed the consolidation migration,
Then none of the following files contain a standalone `AlertDialog` or bespoke confirm dialog wrapper:
`exam-bank/delete-confirm-dialog.tsx`, `exam-bank/publish-confirm-dialog.tsx`, `grade-approval/approve-confirm-dialog.tsx`, `admin-roster/unenroll-confirm-dialog.tsx`, `announcements/delete-announcement-dialog.tsx`, `admin-settings/switch-confirm-dialog.tsx`, `admin/class-management/archive-class-dialog.tsx`.

**AC-E17.8-25 — Consolidation: no hardcoded strings in shared component**
Given the shared component source is reviewed,
Then zero hardcoded Vietnamese or English UI strings are present in the component file,
And `bunx tsc --noEmit` passes with no missing-key errors.

---

### Storybook Interaction Tests (required for TDD proof)

**AC-E17.8-26 — Storybook: all prop variants covered**
Given the Storybook story for `DestructiveConfirmDialog` exists,
Then stories cover: `open=false` (closed), `open=true + isLoading=false` (idle), `open=true + isLoading=true` (loading), and all three instance text variants (announcements, violations, staff-leave).

---

## 5. Edge Case Matrix

| Scenario | closed | open-idle | open-loading | auth-expired | wrong-role | network-error | 320px viewport | Escape key | empty-title |
|---|---|---|---|---|---|---|---|---|---|
| Dialog renders | N/A | visible | visible | N/A | dialog not opened | dialog open; error surfaced via toast | no overflow | closes | no crash |
| Confirm button | N/A | interactive | disabled + aria-busy | N/A | N/A | re-enabled after error | full-width accessible | N/A | interactive |
| Cancel button | N/A | interactive | disabled | N/A | N/A | re-enabled after error | full-width accessible | triggers onCancel | interactive |
| Focus trap | N/A | active | active | N/A | N/A | active | active | N/A | active |
| Focus return | N/A | to trigger | to trigger | N/A | N/A | to trigger | to trigger | to trigger | to trigger |
| Staff-leave dialog | N/A | principal/admin only | principal/admin only | N/A | teacher blocked | open; toast on fail | renders correctly | closes | N/A |

---

## 6. Open Questions

**OQ-E17.8-01** [OPEN QUESTION] Should the confirm button show a spinner icon when `isLoading=true`, or only `disabled + aria-busy`? The design-spec does not specify a spinner. If the Button component has a loading variant, FE should use it; otherwise `aria-busy` alone is acceptable. Flag to `ba-lead` for product decision if a loading spinner is required by design.

**OQ-E17.8-02** [OPEN QUESTION] Should Escape be blocked when `isLoading=true` to prevent accidental cancellation mid-mutation? Radix AlertDialog default allows Escape at any time. Product decision needed if the mutation is non-reversible (e.g. delete).
