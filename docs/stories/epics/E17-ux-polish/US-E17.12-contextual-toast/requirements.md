# US-E17.12 — Contextual Toast Messages

**Story ID:** US-E17.12
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**Design Request:** DR-011 (UX-06)
**Priority:** P3

---

## 1. Requirements Summary

The system must upgrade two specific generic toast messages to contextual variants that include entity or count information: the announcements send-to-school toast (add recipient count and time) and the discipline violation record toast (add student name). Generic toast keys are NOT deleted — contextual variants are additive and used when context data is available at the call site; generic keys serve as fallback. Sonner is already wired. One net-new i18n key is required: `discipline.violations.successContext`. Actors are the roles who trigger the affected actions.

---

## 2. Technical Requirements

```json
{
  "requirementId": "TR-E17.12",
  "title": "Contextual Toast — Announcements Send and Discipline Violation Record",
  "status": "Draft",
  "actors": [
    {
      "role": "teacher",
      "capabilities": [
        "See contextual success toast after recording a discipline violation (includes student name)",
        "See contextual success toast after sending an announcement (includes recipient count and time)"
      ]
    },
    {
      "role": "principal",
      "capabilities": [
        "See contextual success toast after sending an announcement (includes recipient count and time)",
        "See contextual success toast after recording a discipline violation (includes student name)"
      ]
    },
    {
      "role": "admin",
      "capabilities": [
        "See contextual success toast after sending an announcement to school (includes recipient count and time)"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL display a contextual success toast after the announcements send-to-school action succeeds, using the key announcements.sendToastContext with interpolation {recipientCount: number, time: string (HH:mm format)}. The toast variant SHALL be success with a duration of 4000ms.",
      "trigger": "Announcements send-to-school mutation resolves successfully",
      "preconditions": ["User confirmed the send-to-school dialog (US-E17.8 FR-006)", "recipientCount and current time are available at the call site"],
      "postconditions": ["Toast visible: 'Đã gửi thông báo đến {recipientCount} người nhận lúc {time}'", "Toast dismisses after 4000ms"],
      "errorConditions": ["If recipientCount is unavailable (undefined or 0), the system SHALL fall back to the generic key announcements.sendToast with 2000ms duration instead of the contextual variant"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL NOT delete or replace the existing generic toast key announcements.sendToast. The generic key remains as the fallback when context data is unavailable. The contextual key announcements.sendToastContext is used only when {recipientCount} and {time} are available.",
      "trigger": "Code call site evaluation",
      "preconditions": [],
      "postconditions": ["Both generic and contextual keys co-exist in messages/{vi,en}.json; generic key call sites remain valid"],
      "errorConditions": []
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL display a contextual success toast after a discipline violation is recorded successfully, using the net-new key discipline.violations.successContext with interpolation {studentName: string}. The toast variant SHALL be success with a duration of 4000ms.",
      "trigger": "Discipline violation record mutation resolves successfully",
      "preconditions": ["Teacher/principal has completed the violation record form", "studentName is available from the form state at the call site"],
      "postconditions": ["Toast visible: 'Đã ghi nhận vi phạm của {studentName}'", "Toast dismisses after 4000ms"],
      "errorConditions": ["If studentName is unavailable, the system SHALL fall back to the generic key discipline.violations.success with 2000ms duration"]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL NOT delete or replace the existing generic toast key discipline.violations.success. The generic key remains as fallback. The net-new contextual key discipline.violations.successContext is additive.",
      "trigger": "Code call site evaluation",
      "preconditions": [],
      "postconditions": ["Both keys co-exist; no regression in existing toast behavior"],
      "errorConditions": []
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL add the net-new key discipline.violations.successContext to BOTH src/bootstrap/i18n/messages/vi.json and src/bootstrap/i18n/messages/en.json simultaneously. vi.json value: 'Đã ghi nhận vi phạm của {studentName}'. en.json value: 'Violation recorded for {studentName}'.",
      "trigger": "i18n file edit",
      "preconditions": [],
      "postconditions": ["Key exists in both files under discipline.violations namespace; bunx tsc --noEmit passes"],
      "errorConditions": ["If key is added to vi.json but not en.json, tsc type check fails — both must be added atomically"]
    },
    {
      "id": "FR-006",
      "priority": "Should",
      "description": "The system SHALL use the current HH:mm time string for the {time} interpolation in announcements.sendToastContext, formatted according to the active locale (vi: 24-hour HH:mm; en: 12-hour h:mm a). This formatting is performed at the call site in presentation layer, not in the i18n key itself.",
      "trigger": "Announcements send mutation success callback",
      "preconditions": ["Locale is resolved (vi or en)"],
      "postconditions": ["Time string matches locale format; e.g. '14:35' for vi, '2:35 PM' for en"],
      "errorConditions": ["If locale is unavailable, fallback to 24-hour HH:mm"]
    },
    {
      "id": "FR-007",
      "priority": "Won't",
      "description": "Staff-leave toasts are explicitly out of scope for this story — DR-011 notes that staffLeave toast is already contextual enough. No changes to staffLeave toast keys.",
      "trigger": "N/A — explicitly excluded",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "Toast messages must be announced by screen readers. Sonner's default implementation uses role='status' or equivalent — verify this is preserved. Toast must not require user interaction to dismiss (auto-dismiss at 4000ms).",
      "measurableTarget": "WCAG 4.1.3 — status message announced without receiving keyboard focus; verified by fe-accessibility-auditor."
    },
    {
      "id": "NFR-002",
      "category": "i18n",
      "requirement": "The net-new key discipline.violations.successContext must be present in both vi.json and en.json. All toast strings must use i18n keys — no hardcoded strings at call site.",
      "measurableTarget": "bunx tsc --noEmit passes; grep for hardcoded Vietnamese/English toast strings in presentation files returns zero results (excluding messages/ and *.stories.* files)."
    },
    {
      "id": "NFR-003",
      "category": "Performance",
      "requirement": "Toast display must be synchronous with mutation success callback — no additional async delay before toast fires.",
      "measurableTarget": "Toast visible within one render cycle of the mutation success callback."
    }
  ],
  "uiStates": ["toast-visible (success variant, 4000ms)", "toast-dismissed (auto or manual)", "toast-fallback (generic key when context unavailable, 2000ms)"],
  "dataDependencies": [
    {
      "source": "mock",
      "entity": "No new BE dependency. recipientCount comes from the announcement entity already fetched; studentName comes from violation form state; time is derived from Date at call site.",
      "sensitivity": "Internal"
    }
  ],
  "scope": {
    "inScope": [
      "Upgrade announcements send-to-school toast: use announcements.sendToastContext (interpolate recipientCount + time) when context available; fall back to announcements.sendToast",
      "Upgrade discipline violation record toast: use discipline.violations.successContext (interpolate studentName) when context available; fall back to discipline.violations.success",
      "Add net-new key discipline.violations.successContext to vi.json and en.json",
      "Announcements.sendToastContext key already present (confirmed) — only wire it at call site"
    ],
    "outOfScope": [
      "Staff-leave toast changes — explicitly excluded (FR-007)",
      "Generic toast keys deletion — keys must remain",
      "Toast for failed mutations (error toasts) — separate error handling concern",
      "Any other feature toast upgrades not listed in DR-011"
    ],
    "externalDependencies": [
      "sonner toast library (already wired in project)",
      "announcements.sendToastContext i18n key (confirmed present in vi.json/en.json)",
      "discipline.violations.successContext i18n key (NET-NEW — must be added in this story)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] The announcements send action call site has access to recipientCount from the announcement entity state at the time of mutation success. If recipientCount is not in the client state, the call site falls back to the generic key per FR-001.",
    "[ASSUMPTION] The discipline violation record form has the student name in its local state at the time the mutation success callback fires. This is available from the form's selected student field.",
    "[ASSUMPTION] announcements.sendToastContext key was confirmed present in vi.json/en.json as a DR-011 deliverable. If this is not correct, it must be added alongside discipline.violations.successContext."
  ],
  "openQuestions": []
}
```

---

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
|----|-------------|----------|-----------|
| FR-001 | Contextual announcements toast (recipientCount + time) | Must | DR-011 UX-06 primary goal |
| FR-002 | Keep generic announcements.sendToast as fallback | Must | No regression; DR-011 explicit note |
| FR-003 | Contextual discipline violation toast (studentName) | Must | DR-011 UX-06; user orientation |
| FR-004 | Keep generic discipline.violations.success as fallback | Must | No regression |
| FR-005 | Add net-new discipline.violations.successContext to both message files | Must | Only missing i18n key in DR-011 |
| FR-006 | Locale-formatted time string for {time} interpolation | Should | UX quality; locale-correct format |
| FR-007 | Staff-leave toast — explicitly Won't | Won't | DR-011 explicitly out of scope |
| NFR-001 | Toast screen-reader announcement | Must | WCAG 4.1.3 |
| NFR-002 | Net-new key in both files; no hardcoded strings | Must | i18n rule |
| NFR-003 | Toast visible in same render cycle as mutation success | Must | Performance |

---

## 4. Handoff Notes

**For ba-integration-analyst:** No new BE endpoint. recipientCount is already part of the announcement entity fetched client-side. studentName is from form local state. Time is `new Date()` at call site.

**For ba-use-case-modeler:** AC needed:
1. Given teacher records a violation for student "Nguyen Van A" and mutation succeeds, Then toast shows "Đã ghi nhận vi phạm của Nguyen Van A" for 4000ms.
2. Given student name is unavailable at call site, Then toast falls back to "Đã ghi nhận vi phạm thành công!" for 2000ms.
3. Given principal sends announcement to school with 312 recipients at 14:35, Then toast shows "Đã gửi thông báo đến 312 người nhận lúc 14:35" for 4000ms.
4. Given recipientCount is unavailable, Then toast falls back to "Đã gửi thông báo" for 2000ms.

**i18n key mapping:**

| Key path | Status | Usage |
|----------|--------|-------|
| `announcements.sendToast` | Confirmed present (existing) | Fallback — must NOT be deleted |
| `announcements.sendToastContext` | Confirmed present (DR-011 deliverable) | FR-001 contextual toast |
| `discipline.violations.success` | Confirmed present (existing) | Fallback — must NOT be deleted |
| `discipline.violations.successContext` | **NET-NEW — missing from vi.json and en.json** | FR-003 contextual toast |

**Action required:** `discipline.violations.successContext` must be added to both message files as part of this story (FR-005). This is the only net-new i18n key across all 6 DR-011 stories.
