# Feature Spec — DestructiveConfirmDialog Shared Component (US-E17.8)

**Status:** Draft
**Lane:** normal
**Priority:** P2
**Sources:** requirements.md + use-cases.md (this packet) · DR-011 §UX-02 · design-spec.jsonc#interactionPatterns.destructiveConfirmDialog · E17-ux-polish epic

---

## 1. Scope & Objectives

**Purpose:** Create a single canonical `DestructiveConfirmDialog` component in `components/shared/` that replaces seven independent feature-local confirm dialogs and wires three net-new instances (announcements send-to-school, discipline violation delete, staff-leave reject).

**In scope:**
- New shared component: `src/components/shared/destructive-confirm-dialog/` (index.ts + component + .stories.tsx)
- Three net-new dialog instances: announcements send-to-school, discipline violation delete, staff-leave reject
- Consolidation of 7 existing feature-local dialogs (listed in §5 FR-009)
- Storybook stories for all prop combinations

**Out of scope:**
- Any new BE endpoints (purely presentational component)
- Error display within the dialog itself (errors surface via parent-owned toast)
- Custom slot/children API beyond the defined props
- Non-destructive confirmation patterns (e.g. unsaved-changes warning)

**Definitions:**
- *Destructive action:* Any action that is irreversible or affects other users (delete, reject, send-to-all)
- *Instance:* A specific usage of `DestructiveConfirmDialog` with feature-specific i18n keys passed as props
- *Consolidation target:* An existing feature-local AlertDialog wrapper to be replaced by the shared component

---

## 2. Actors & Roles

| Actor | Role | Visibility |
|---|---|---|
| Teacher | Internal | Exam-bank delete, discipline violation delete, announcements send-to-school |
| Principal | Internal | All teacher capabilities + staff-leave reject, grade-approval approve/bulk-lock |
| Admin | Internal | Admin-roster unenroll, admin-settings switch, class archive |
| Screen reader user | Assistive technology | Receives focus-trap, alertdialog role, aria-busy announcements |

**Role-gated visibility:** The shared component itself has no role guard. Role gating is enforced at the feature level before the parent sets `open=true`. The staff-leave reject instance is never opened by a Teacher role — the feature screens gate access upstream.

---

## 3. Functional Requirements

### FR-001 — Component API (Props Contract)
**Priority:** Must
**Source:** TR-E17.8-FR-001 / UC-E17.8-001

The system SHALL render a modal dialog built on shadcn `AlertDialog` (Radix UI) accepting the following props:
- `open: boolean`
- `title: string`
- `body: string`
- `confirmLabel: string`
- `isLoading: boolean` (default `false`)
- `onConfirm: () => void`
- `onCancel: () => void`

**AC (Given/When/Then):**
- Given `open=true` and all required props provided, When dialog mounts, Then dialog element has `role="alertdialog"` and is visible.
- Given `onConfirm` or `onCancel` is missing, When component renders in development, Then component does not render and console logs a prop-type violation.

**Dependencies:** shadcn `alert-dialog` primitive at `src/components/ui/alert-dialog/` (already exists)

---

### FR-002 — Icon + Title + Body Layout
**Priority:** Must
**Source:** TR-E17.8-FR-002 / UC-E17.8-001

The system SHALL display a header row containing a Lucide `AlertTriangle` icon (20px, `text-destructive`) followed by the `title` string (`text-base font-bold text-foreground`). The `body` string (`text-sm text-muted-foreground`) SHALL appear below the icon+title row.

**AC:**
- Given `open=true` with non-empty `title` and `body`, Then AlertTriangle icon is left of title; body is below the icon+title row.
- Given `title=""`, Then dialog renders without crashing; icon and body are still visible.

---

### FR-003 — Footer Button Layout
**Priority:** Must
**Source:** TR-E17.8-FR-003 / UC-E17.8-001

The system SHALL render a footer with: cancel button (left, `variant="default"` or `variant="outline"`) and confirm button (right, `variant="destructive"` → `bg-destructive text-destructive-foreground`). Cancel is always left of confirm.

**AC:**
- Given `open=true`, Then cancel button is left-aligned in footer and confirm button is right-aligned.
- Given dialog is inspected, Then confirm button uses `variant="destructive"`.

---

### FR-004 — Loading State
**Priority:** Must
**Source:** TR-E17.8-FR-004 / UC-E17.8-002

The system SHALL disable both cancel and confirm buttons and set `aria-busy="true"` on the confirm button when `isLoading=true`. When `isLoading=false` both buttons SHALL be interactive.

**AC:**
- Given `isLoading=true`, Then confirm button has `aria-busy="true"` and both buttons have `disabled` attribute.
- Given `isLoading` changes from `false` to `true`, Then disabled state is visible within one React render cycle.
- Given parent never clears `isLoading`, Then dialog remains open with disabled buttons; component does not auto-close.

---

### FR-005 — Keyboard Handling
**Priority:** Must
**Source:** TR-E17.8-FR-005 / UC-E17.8-003

The system SHALL: call `onCancel` when user presses Escape or clicks cancel; call `onConfirm` when user clicks confirm or presses Enter/Space while confirm is focused. Focus SHALL cycle only within the dialog (Radix focus trap).

**AC:**
- Given dialog is open and user presses Escape, Then `onCancel` is called.
- Given confirm button is focused and user presses Enter, Then `onConfirm` is called.
- Given confirm button is focused and user presses Space, Then `onConfirm` is called.
- Given user presses Tab repeatedly, Then focus cycles only between cancel and confirm buttons.

---

### FR-006 — Announcements Send-to-School Instance
**Priority:** Must
**Source:** TR-E17.8-FR-006 / UC-E17.8-004

The system SHALL wire the announcements send-to-school instance: `title = t('announcements.sendConfirmTitle')`, `body = t('announcements.sendConfirmBody', { recipientCount })`, `confirmLabel = t('announcements.btnSendNow')`.

**AC:**
- Given teacher/principal clicks send-to-school with `recipientCount=150`, Then dialog shows title from `announcements.sendConfirmTitle` and body showing "150" interpolated.
- Given `recipientCount` is unavailable, Then body renders the key value without a broken `{recipientCount}` placeholder.
- Given user cancels, Then no send mutation fires; draft is unchanged.

---

### FR-007 — Discipline Violation Delete Instance
**Priority:** Must
**Source:** TR-E17.8-FR-007 / UC-E17.8-005

The system SHALL wire the discipline violation delete instance: `title = t('discipline.violations.deleteDialog.title')`, `body = t('discipline.violations.deleteDialog.body')`, `confirmLabel = t('discipline.violations.deleteDialog.confirmLabel')`.

**AC:**
- Given user clicks delete on a violation row, Then dialog opens with discipline.violations.deleteDialog.* keys.
- Given user confirms and deletion API fails, Then parent shows error toast; dialog stays open (cancel/confirm re-enabled); parent owns `isLoading=false` and `open=true` until retry or cancel.

---

### FR-008 — Staff-Leave Reject Instance
**Priority:** Must
**Source:** TR-E17.8-FR-008 / UC-E17.8-006

The system SHALL wire the staff-leave reject instance (principal/admin only): `title = t('staffLeave.rejectConfirmTitle')`, `body = t('staffLeave.rejectConfirmBody')`, `confirmLabel = t('staffLeave.actions.confirmReject')`.

**AC:**
- Given principal/admin clicks reject on a pending leave request, Then dialog opens with staffLeave.* keys.
- Given teacher role is authenticated, Then the staff-leave reject action is not visible (role-gated at feature level, not in the shared component).

---

### FR-009 — Consolidation of Feature-Local Dialogs
**Priority:** Should
**Source:** TR-E17.8-FR-009 / UC-E17.8-007

The system SHALL provide a migration path to consolidate these existing feature-local dialogs to use `DestructiveConfirmDialog`:

1. `exam-bank/presentation/exam-bank-screen/delete-confirm-dialog.tsx`
2. `exam-bank/presentation/exam-bank-screen/publish-confirm-dialog.tsx`
3. `grades/presentation/grade-approval-screen/components/approve-confirm-dialog.tsx`
4. `grades/presentation/grade-approval-screen/components/bulk-lock-dialog.tsx`
5. `admin-roster/presentation/student-roster-screen/components/unenroll-confirm-dialog.tsx`
6. `admin-settings/presentation/admin-settings-screen/switch-confirm-dialog.tsx`
7. `admin/class-management/presentation/class-management-screen/archive-class-dialog.tsx`

**AC:**
- Given shared component is implemented and verified, When FE completes consolidation, Then none of the above files contain a standalone `AlertDialog` wrapper.
- Given a feature-local dialog has bespoke behavior not expressible by the shared API, Then FE documents the deviation and flags for API extension before migration (no fork).

---

### FR-010 — Focus Restore on Close
**Priority:** Must
**Source:** TR-E17.8-FR-010 / UC-E17.8-001

The system SHALL return focus to the element that triggered the dialog when the dialog closes (both confirm and cancel paths).

**AC:**
- Given dialog was opened by clicking a trigger element and user cancels, Then focus returns to that trigger element.
- Given trigger element is removed from DOM before dialog closes, Then focus moves to nearest logical ancestor without throwing.

---

## 4. Non-Functional Requirements

### NFR-001 — Accessibility: WCAG 2.1 AA
**Source:** TR-E17.8-NFR-001
Dialog MUST have `role="alertdialog"` (Radix default), focus trap while open, Escape closes, `aria-labelledby` pointing to the title element.
**Measurable target:** WCAG 1.4.3 (contrast ≥4.5:1 body text), 2.1.1 (keyboard), 2.4.3 (focus order), 4.1.3 (status). Verified by `fe-accessibility-auditor`.

### NFR-002 — Accessibility: aria-busy on Loading
**Source:** TR-E17.8-NFR-002
Confirm button `aria-busy="true"` when `isLoading=true`.
**Measurable target:** Screen reader announces loading state change within 1 announced update cycle.

### NFR-003 — Responsive: 320px+
**Source:** TR-E17.8-NFR-003
No horizontal overflow at 320px; `max-height: 92vh` with internal scroll for long body text.
**Measurable target:** No horizontal overflow at 320px; tested at 375/768/1280px.

### NFR-004 — i18n: No Hardcoded Strings
**Source:** TR-E17.8-NFR-004
Component itself contains zero hardcoded Vietnamese or English strings. All string props resolved by callers.
**Measurable target:** `bunx tsc --noEmit` passes with no missing-key errors; grep for hardcoded strings in component source returns zero.

### NFR-005 — Performance
**Source:** TR-E17.8-NFR-005
`isLoading` state change must be synchronous with prop update (visible within one React render cycle).
**Measurable target:** No perceptible render lag when `open` flips to `true`.

---

## 5. UI States & Flows

| State | Trigger | Visual |
|---|---|---|
| `closed` | `open=false` | Not rendered |
| `open-idle` | `open=true`, `isLoading=false` | Dialog visible; both buttons interactive |
| `open-loading` | `open=true`, `isLoading=true` | Both buttons disabled; confirm `aria-busy="true"` |
| `open-error` | Mutation fails; parent keeps `open=true`, `isLoading=false` | Both buttons re-enabled; error toast shown by parent (not inside dialog) |

**Key flow — Confirm path:**
1. Parent sets `open=true` → dialog renders with `role="alertdialog"`, focus trapped
2. User clicks confirm → `onConfirm()` called → parent sets `isLoading=true`
3. Mutation resolves → parent sets `open=false`, `isLoading=false` → dialog closes → focus to trigger

**Key flow — Cancel path:**
1. Dialog open → user clicks cancel or presses Escape → `onCancel()` called → parent sets `open=false` → focus to trigger

---

## 6. Data & Integration

No backend integration. The component is purely presentational. Parent callers own all async mutations and pass `isLoading`/`onConfirm`/`onCancel` as props.

**External dependencies:**
- `src/components/ui/alert-dialog/` — Radix AlertDialog primitive (already exists)
- `lucide-react` — `AlertTriangle` icon
- `sonner` — used by parent callers for error toast (not imported by this component)

---

## 7. Use Case Summary

| UC ID | Title | FR Coverage | AC Count |
|---|---|---|---|
| UC-E17.8-001 | Open and Confirm a Destructive Action | FR-001, FR-002, FR-003, FR-005, FR-010 | AC-01 through AC-08 |
| UC-E17.8-002 | Loading State After Confirm | FR-004 | AC-09, AC-10 |
| UC-E17.8-003 | Keyboard Navigation and Escape | FR-005 | AC-11 through AC-16 |
| UC-E17.8-004 | Announcements Send-to-School Instance | FR-006 | AC-17, AC-18 |
| UC-E17.8-005 | Discipline Violation Delete Instance | FR-007 | AC-19, AC-20, AC-21 |
| UC-E17.8-006 | Staff-Leave Reject Instance | FR-008 | AC-22, AC-23 |
| UC-E17.8-007 | Consolidation of Feature-Local Dialogs | FR-009 | AC-24, AC-25 |

---

## 8. Constraints & Assumptions

**Technical constraints:**
- Radix AlertDialog default allows Escape at all times (even when `isLoading=true`). Blocking Escape during loading requires overriding Radix default behavior — not recommended without explicit product decision.
- The shared component's `max-height: 92vh` with internal scroll must not conflict with Radix's own positioning logic.

**Confirmed assumptions:**
- [ASSUMPTION] Existing feature-local dialogs in FR-009 do not have bespoke behavior beyond title/body/confirm/cancel. If bespoke behavior is found at implementation time, FE flags for API extension (no fork).
- [ASSUMPTION] The Radix AlertDialog primitive at `src/components/ui/alert-dialog/` correctly implements `role="alertdialog"` and focus trap. No modification to the primitive is needed.
- [ASSUMPTION] `staffLeave.rejectConfirmBody` key is present in vi.json/en.json per DR-011 deliverables. FE verifies at implementation.

**[OPEN QUESTION] OQ-E17.8-01:** Should the confirm button show a spinner icon when `isLoading=true`, or only `disabled + aria-busy`? **Recommended default:** MUST add `aria-busy="true"`; spinner (Button loading variant if available) is an FE implementation detail and does not block the story.

**[OPEN QUESTION] OQ-E17.8-02:** Should Escape be blocked when `isLoading=true`? **Recommended default:** Follow Radix default (Escape always dismisses). If product requires blocking Escape during loading (e.g. for permanent deletion), escalate to `ba-lead` for a product decision.

---

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration | Priority |
|---|---|---|---|---|
| FR-001 (Props contract) | TR-E17.8-FR-001 | UC-E17.8-001 | None (presentational) | Must |
| FR-002 (Icon+title+body layout) | TR-E17.8-FR-002 + design-spec.jsonc#destructiveConfirmDialog.layout | UC-E17.8-001 | None | Must |
| FR-003 (Footer buttons) | TR-E17.8-FR-003 + design-spec.jsonc#destructiveConfirmDialog.tokens | UC-E17.8-001 | None | Must |
| FR-004 (Loading state) | TR-E17.8-FR-004 + design-spec.jsonc#destructiveConfirmDialog.states | UC-E17.8-002 | None | Must |
| FR-005 (Keyboard) | TR-E17.8-FR-005 + design-spec.jsonc#destructiveConfirmDialog.keyboard | UC-E17.8-003 | None | Must |
| FR-006 (Announcements instance) | TR-E17.8-FR-006 | UC-E17.8-004 | None; i18n: announcements.sendConfirmTitle, sendConfirmBody, btnSendNow | Must |
| FR-007 (Discipline instance) | TR-E17.8-FR-007 | UC-E17.8-005 | None; i18n: discipline.violations.deleteDialog.* | Must |
| FR-008 (Staff-leave instance) | TR-E17.8-FR-008 | UC-E17.8-006 | None; i18n: staffLeave.rejectConfirmTitle, rejectConfirmBody, actions.confirmReject | Must |
| FR-009 (Consolidation) | TR-E17.8-FR-009 | UC-E17.8-007 | None | Should |
| FR-010 (Focus restore) | TR-E17.8-FR-010 + design-spec.jsonc#destructiveConfirmDialog.a11y | UC-E17.8-001 | None | Must |
| NFR-001 (WCAG alertdialog) | TR-E17.8-NFR-001 | All UCs | None | Must |
| NFR-002 (aria-busy) | TR-E17.8-NFR-002 | UC-E17.8-002 (AC-09) | None | Must |
| NFR-003 (Responsive 320px) | TR-E17.8-NFR-003 | UC-E17.8-001 (AC-08) | None | Must |
| NFR-004 (No hardcoded strings) | TR-E17.8-NFR-004 | UC-E17.8-007 (AC-25) | i18n: all 9 keys below | Must |
| NFR-005 (Performance) | TR-E17.8-NFR-005 | UC-E17.8-002 (AC-10) | None | Should |

### i18n Key Coverage

| i18n Key Path | vi Value | en Value | Status | AC |
|---|---|---|---|---|
| `announcements.sendConfirmTitle` | (title for send confirm) | (title for send confirm) | Existing (DR-011 deliverable) | AC-17 |
| `announcements.sendConfirmBody` | "Gửi thông báo đến {recipientCount} người nhận?" | "Send announcement to {recipientCount} recipients?" | Existing (DR-011 deliverable) | AC-17 |
| `announcements.btnSendNow` | "Gửi ngay" | "Send now" | Existing (DR-011 deliverable) | AC-17 |
| `discipline.violations.deleteDialog.title` | (delete violation title) | (delete violation title) | Existing (DR-011 deliverable) | AC-19 |
| `discipline.violations.deleteDialog.body` | (delete violation body) | (delete violation body) | Existing (DR-011 deliverable) | AC-19 |
| `discipline.violations.deleteDialog.confirmLabel` | (delete violation CTA) | (delete violation CTA) | Existing (DR-011 deliverable) | AC-19 |
| `staffLeave.rejectConfirmTitle` | (reject leave title) | (reject leave title) | Existing (DR-011 deliverable) | AC-22 |
| `staffLeave.rejectConfirmBody` | (reject leave body) | (reject leave body) | Existing (DR-011 deliverable) | AC-22 |
| `staffLeave.actions.confirmReject` | "Xác nhận từ chối" | "Confirm reject" | Existing (pre-DR-011) | AC-22 |

**No net-new i18n keys required for US-E17.8.** All 9 keys are confirmed present.

---

## 10. Handoff to FE

**What `fe-lead` should build:**

1. **Shared component** at `src/components/shared/destructive-confirm-dialog/index.ts` + component file + `.stories.tsx` per component-organization.md (composed, ≥3 consumers → `components/shared/`).
2. **Wire 3 net-new instances** in announcements (send-to-school), discipline (violation delete), and staff-leave (reject) feature presentation files.
3. **Consolidate 7 feature-local dialogs** listed in FR-009 — replace each with `<DestructiveConfirmDialog ... />` imports.
4. **Storybook proof:** stories covering `open=false`, `open=true + isLoading=false`, `open=true + isLoading=true`, and all 3 instance text variants (announcements, violations, staff-leave).

**Lane:** normal

**Proof owed (TEST_MATRIX rows):**

| Layer | Expected proof |
|---|---|
| Unit | Vitest: Props/state variants — confirm `aria-busy`, disabled buttons, `onConfirm`/`onCancel` call counts |
| Integration | None (no BE boundary) |
| E2E | Storybook interaction tests: open/confirm/cancel/loading/Escape + all 3 instance stories; verify no AlertDialog duplicates in consolidated files |
| Platform | Manual keyboard-only test on dialog (Tab cycle, Escape, Enter) |

**Cross-file claim note:** US-E17.8 touches exam-bank, grades, admin-roster, admin-settings, admin/class-management presentation files during consolidation. FE must verify no other in-flight story claims those files simultaneously.
