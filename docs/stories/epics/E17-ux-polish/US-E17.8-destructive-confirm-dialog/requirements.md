# US-E17.8 — DestructiveConfirmDialog Shared Component

**Story ID:** US-E17.8
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**Design Request:** DR-011 (UX-02)
**Priority:** P2

---

## 1. Requirements Summary

The system needs a single canonical `DestructiveConfirmDialog` component in `components/shared/` that replaces independent feature-local confirm dialogs across `exam-bank`, `grade-approval`, `admin-roster`, `announcements`, `admin-settings`, and `admin/class-management`. Three net-new instances must be wired: announcements send-to-school, discipline violations delete, and staff-leave reject. All roles with write permissions to those features are actors. The component must satisfy WCAG focus-trap, keyboard, and visual standards; all copy is i18n-keyed.

---

## 2. Technical Requirements

```json
{
  "requirementId": "TR-E17.8",
  "title": "DestructiveConfirmDialog — Canonical Shared Confirm Dialog",
  "status": "Draft",
  "actors": [
    {
      "role": "teacher",
      "capabilities": [
        "Trigger confirm dialog for exam-bank delete",
        "Trigger confirm dialog for discipline violation delete",
        "Trigger confirm dialog for announcements send-to-school"
      ]
    },
    {
      "role": "principal",
      "capabilities": [
        "Trigger confirm dialog for exam-bank delete",
        "Trigger confirm dialog for announcements send-to-school",
        "Trigger confirm dialog for discipline violation delete",
        "Trigger confirm dialog for staff-leave reject"
      ]
    },
    {
      "role": "admin",
      "capabilities": [
        "Trigger confirm dialog for admin-roster unenroll",
        "Trigger confirm dialog for admin-settings switch",
        "Trigger confirm dialog for class archive"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL render a modal dialog built on shadcn AlertDialog (Radix UI) accepting props: open (boolean), title (string), body (string), confirmLabel (string), isLoading (boolean, default false), onConfirm (() => void), onCancel (() => void).",
      "trigger": "Parent component sets open=true",
      "preconditions": ["User has performed a destructive-intent action (e.g. clicked Delete, Reject, Send-to-all)"],
      "postconditions": ["Dialog is visible and focus-trapped within it"],
      "errorConditions": ["If onConfirm or onCancel props are missing, the component must not render and must log a prop-type violation in development"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL display a header row containing a Lucide AlertTriangle icon (20px, text-destructive) followed by the title string (text-base font-bold text-foreground). The body string (text-sm text-muted-foreground) SHALL appear below the icon+title row.",
      "trigger": "Dialog open=true",
      "preconditions": ["title and body props provided"],
      "postconditions": ["Icon, title, body visible and using only design-system tokens"],
      "errorConditions": ["If title is empty string, dialog must still render without crashing"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL render a footer with a cancel button on the left and a confirm button on the right. The confirm button SHALL use variant='destructive' (bg-destructive text-destructive-foreground). The cancel button SHALL use the default/outline variant.",
      "trigger": "Dialog open=true",
      "preconditions": [],
      "postconditions": ["Both buttons are visible and keyboard-reachable"],
      "errorConditions": []
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL disable both the cancel and confirm buttons and set aria-busy='true' on the confirm button when isLoading=true. When isLoading=false both buttons SHALL be interactive.",
      "trigger": "isLoading prop changes to true after user clicks confirm",
      "preconditions": ["Dialog is open"],
      "postconditions": ["Confirm button shows loading indicator; cancel button is non-interactive"],
      "errorConditions": ["If the async action resolves while isLoading remains true due to parent bug, the dialog must not auto-close — parent controls open prop"]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL close the dialog and call onCancel when the user presses Escape or clicks the cancel button. The system SHALL call onConfirm when the user clicks the confirm button or presses Enter while the confirm button is focused.",
      "trigger": "Keyboard Escape / Enter or button click",
      "preconditions": ["Dialog is open", "Focus is within the dialog"],
      "postconditions": ["Dialog signals intent to parent; parent controls open state"],
      "errorConditions": ["If focus escapes dialog (e.g. programmatic focus outside), Radix focus-trap re-captures"]
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL wire the announcements send-to-school instance using keys: announcements.sendConfirmTitle (title), announcements.sendConfirmBody with interpolation {recipientCount} (body), announcements.btnSendNow (confirmLabel). This instance triggers after the teacher/principal clicks the send-to-school action.",
      "trigger": "User clicks send-to-school in the announcements composer",
      "preconditions": ["Announcement draft is complete and ready to send"],
      "postconditions": ["Dialog opens with recipient count interpolated into body text"],
      "errorConditions": ["If recipientCount is unavailable, body SHALL fall back to the key value without interpolation placeholder shown"]
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL wire the discipline violation delete instance using keys: discipline.violations.deleteDialog.title, discipline.violations.deleteDialog.body, discipline.violations.deleteDialog.confirmLabel. This instance triggers when the user clicks delete on a violation record.",
      "trigger": "User clicks the delete action on a violation row",
      "preconditions": ["User has delete permission on violations"],
      "postconditions": ["Dialog opens; on confirm, deletion proceeds; on cancel, violation record is unchanged"],
      "errorConditions": ["If delete API call fails, dialog should remain open with an error state communicated via toast; onConfirm handler in parent is responsible for error handling"]
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL wire the staff-leave reject instance using keys: staffLeave.rejectConfirmTitle (title), staffLeave.rejectConfirmBody (body), staffLeave.actions.confirmReject (confirmLabel). This instance triggers when the principal/admin clicks reject on a leave request.",
      "trigger": "User clicks reject on a staff leave request",
      "preconditions": ["User role is principal or admin", "Leave request is in pending state"],
      "postconditions": ["Dialog opens; on confirm, rejection proceeds and staff notification is triggered by the backend"],
      "errorConditions": ["If rejection API call fails, error is surfaced via toast; dialog remains open until parent sets open=false"]
    },
    {
      "id": "FR-009",
      "priority": "Should",
      "description": "The system SHALL provide a migration path such that the FE team consolidates existing feature-local dialogs (exam-bank/delete-confirm-dialog.tsx, exam-bank/publish-confirm-dialog.tsx, grade-approval/approve-confirm-dialog.tsx, admin-roster/unenroll-confirm-dialog.tsx, announcements/delete-announcement-dialog.tsx, admin-settings/switch-confirm-dialog.tsx, admin/class-management/archive-class-dialog.tsx) to use the shared DestructiveConfirmDialog. The requirements for these consolidation targets SHALL be treated as in-scope for US-E17.8.",
      "trigger": "FE implementation phase",
      "preconditions": ["Shared component is implemented and Storybook-verified"],
      "postconditions": ["No feature-local dialog duplicates remain for the listed screens"],
      "errorConditions": ["If a feature-local dialog has behavior not expressible by the shared API (custom slot), that deviation must be documented for a potential API extension, not a fork"]
    },
    {
      "id": "FR-010",
      "priority": "Must",
      "description": "The system SHALL return focus to the element that triggered the dialog when the dialog closes (both confirm and cancel paths).",
      "trigger": "Dialog closes",
      "preconditions": ["Dialog was opened via a trigger element"],
      "postconditions": ["Keyboard focus is on the original trigger element"],
      "errorConditions": ["If the trigger element is removed from DOM before dialog closes (e.g. optimistic delete), focus falls to the nearest logical ancestor"]
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "Dialog MUST have role='alertdialog' (Radix AlertDialog default), focus trap within dialog while open, Escape closes the dialog, aria-labelledby pointing to title element.",
      "measurableTarget": "WCAG 2.1 AA: 1.4.3 (contrast ≥4.5:1 for body text), 2.1.1 (keyboard), 2.4.3 (focus order), 4.1.3 (status messages). All verified by fe-accessibility-auditor."
    },
    {
      "id": "NFR-002",
      "category": "Accessibility",
      "requirement": "Confirm button aria-busy='true' when isLoading=true; confirm button aria-label must include the confirmLabel value for screen readers.",
      "measurableTarget": "Screen reader announces loading state change within 1 announced update cycle."
    },
    {
      "id": "NFR-003",
      "category": "Responsive",
      "requirement": "Dialog must not break layout at 320px viewport width. Content must be scrollable if body text is long.",
      "measurableTarget": "No horizontal overflow at 320px; dialog max-height 92vh with internal scroll; tested at 375/768/1280."
    },
    {
      "id": "NFR-004",
      "category": "i18n",
      "requirement": "All string props (title, body, confirmLabel) must be resolved i18n values passed by the caller — the component itself contains no hardcoded strings.",
      "measurableTarget": "Zero hardcoded Vietnamese or English strings in component source; bunx tsc --noEmit passes with no missing-key errors."
    },
    {
      "id": "NFR-005",
      "category": "Performance",
      "requirement": "Dialog open animation must be imperceptible overhead — Radix AlertDialog default animation is acceptable. isLoading button state change must be synchronous with prop update.",
      "measurableTarget": "No perceptible render lag when open prop flips to true; isLoading state visible within one React render cycle."
    }
  ],
  "uiStates": ["closed (default)", "open-idle", "open-loading (isLoading=true)", "open-error (parent shows toast; dialog remains)"],
  "dataDependencies": [
    {
      "source": "mock",
      "entity": "No BE dependency — purely presentational. Caller (parent component) owns the async mutation and passes isLoading/onConfirm/onCancel.",
      "sensitivity": "Public"
    }
  ],
  "scope": {
    "inScope": [
      "New shared component: src/components/shared/destructive-confirm-dialog/ (index.ts + component file + .stories.tsx)",
      "Three net-new dialog instances: announcements send-to-school, discipline violation delete, staff-leave reject",
      "Consolidation of existing feature-local dialogs listed in FR-009",
      "Storybook stories for all prop combinations: open/closed, isLoading true/false, all three instance text variants"
    ],
    "outOfScope": [
      "Any new BE endpoints — component is presentational only",
      "Error display within the dialog itself — errors surfaced via toast managed by parent",
      "Custom slot/children API beyond the defined props (future extension if needed)",
      "Non-destructive confirmation patterns (e.g. unsaved changes warning) — separate component concern"
    ],
    "externalDependencies": [
      "src/components/ui/alert-dialog/ (Radix AlertDialog primitive — already exists)",
      "lucide-react AlertTriangle icon",
      "sonner (toast, used by parent callers for error feedback)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] The existing feature-local dialogs listed in FR-009 do not have bespoke behavior beyond title/body/confirm/cancel — if they do, the FE team must flag for API extension before migration.",
    "[ASSUMPTION] staffLeave.rejectConfirmBody key exists in vi.json/en.json based on DR-011 i18n deliverables note; FE to verify at implementation time.",
    "[ASSUMPTION] The Radix AlertDialog primitive at src/components/ui/alert-dialog/ already correctly implements role='alertdialog' and focus trap — no modification to the primitive is needed."
  ],
  "openQuestions": [
    "Should the confirm button show a spinner icon when isLoading=true, or only disable + aria-busy? Design-spec does not specify a spinner — FE should use the existing Button loading variant if available, else aria-busy alone."
  ]
}
```

---

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
|----|-------------|----------|-----------|
| FR-001 | Shared component API (props contract) | Must | Foundation — all instances depend on this |
| FR-002 | Icon + title + body layout | Must | Visual spec from design-spec.jsonc |
| FR-003 | Footer with destructive confirm button | Must | Core UX of confirmation pattern |
| FR-004 | isLoading state — disable + aria-busy | Must | Prevents double-submit; a11y requirement |
| FR-005 | Keyboard handling (Escape/Enter) | Must | WCAG 2.1.1 keyboard; Radix default |
| FR-006 | Announcements send-to-school instance | Must | Net-new; three high-stakes actions per DR-011 |
| FR-007 | Discipline violation delete instance | Must | Net-new; permanent deletion risk |
| FR-008 | Staff-leave reject instance | Must | Net-new; staff notification triggered |
| FR-010 | Focus restore on close | Must | WCAG 2.4.3 focus order |
| FR-009 | Consolidate existing feature-local dialogs | Should | Reduces drift; not blocking new instances |
| NFR-001 | alertdialog role + focus trap | Must | WCAG 2.1 AA non-negotiable |
| NFR-002 | aria-busy on loading | Must | Screen reader announcement |
| NFR-003 | Responsive 320px+ | Must | Product NFR baseline |
| NFR-004 | No hardcoded strings | Must | i18n rule — compile-time enforced |
| NFR-005 | Render performance | Should | UX quality |

---

## 4. Handoff Notes

**For ba-integration-analyst:** No BE integration required. This is a pure UI component. The parent callers (announcements, discipline, staff-leave) already have or will have their own mutation wiring — confirm dialogs are downstream of those mutations.

**For ba-use-case-modeler:** Three distinct use cases need Given/When/Then AC:
1. UC-announcements-send-to-school: Given principal has drafted announcement, When they click send-to-school, Then dialog opens showing recipient count; Given they confirm, Then send mutation fires.
2. UC-discipline-violation-delete: Given teacher views a violation record, When they click delete, Then dialog opens; Given they confirm, Then deletion fires; Given API error, Then toast shown, dialog stays open.
3. UC-staff-leave-reject: Given principal views a pending leave request, When they click reject, Then dialog opens; Given they confirm, Then rejection fires and dialog closes.
Additionally, AC for Storybook interaction tests covering isLoading=true state are needed.

**Component canonical home:** `src/components/shared/destructive-confirm-dialog/` — composed, used by ≥3 screens (announcements, discipline, staff-leave, plus existing exam-bank, grade-approval, admin-roster). Per component-organization.md decision 0026.

**i18n key mapping:**

| Key path | Status | Usage |
|----------|--------|-------|
| `announcements.sendConfirmTitle` | Confirmed present (DR-011 deliverable) | FR-006 title |
| `announcements.sendConfirmBody` | Confirmed present | FR-006 body (interpolates {recipientCount}) |
| `announcements.btnSendNow` | Confirmed present | FR-006 confirmLabel |
| `discipline.violations.deleteDialog.title` | Confirmed present (DR-011 deliverable) | FR-007 title |
| `discipline.violations.deleteDialog.body` | Confirmed present | FR-007 body |
| `discipline.violations.deleteDialog.confirmLabel` | Confirmed present | FR-007 confirmLabel |
| `staffLeave.rejectConfirmTitle` | Confirmed present (DR-011 deliverable) | FR-008 title |
| `staffLeave.rejectConfirmBody` | Confirmed present | FR-008 body |
| `staffLeave.actions.confirmReject` | Confirmed present (existing) | FR-008 confirmLabel |

**No net-new i18n keys required for this story.** All keys confirmed as present in DR-011 deliverables.
