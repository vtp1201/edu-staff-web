# Feature Spec — Contextual Toast Messages (US-E17.12)

**Status:** Draft
**Lane:** normal
**Priority:** P3
**Sources:** requirements.md + use-cases.md (this packet) · DR-011 §UX-06 · design-spec.jsonc#interactionPatterns.contextualToast · E17-ux-polish epic

---

## 1. Scope & Objectives

**Purpose:** Upgrade two specific generic toast messages to contextual variants that include entity/count information. Sonner is already wired. Generic toast keys are NOT deleted — contextual variants are additive. One net-new i18n key (`discipline.violations.successContext`) must be added to both `vi.json` and `en.json`.

**In scope:**
- Announcements send-to-school: upgrade to contextual toast using `announcements.sendToastContext` (interpolate `{recipientCount}`, `{time}`) with 4000ms duration; generic `announcements.sendToast` remains as fallback (2000ms)
- Discipline violation record: upgrade to contextual toast using net-new `discipline.violations.successContext` (interpolate `{studentName}`) with 4000ms duration; generic `discipline.violations.success` remains as fallback (2000ms)
- Add net-new key `discipline.violations.successContext` to both `vi.json` and `en.json` atomically

**Out of scope:**
- Staff-leave toast changes (explicitly excluded — already contextual enough per DR-011)
- Generic toast key deletion (keys must remain)
- Error toast handling (separate concern)
- Any other feature toast not listed in DR-011

**Definitions:**
- *Contextual toast:* A success toast that includes entity-specific data (name, count, time); 4000ms duration
- *Generic fallback:* The existing toast used when context data is unavailable; 2000ms duration; MUST NOT be deleted

---

## 2. Actors & Roles

| Actor | Role | Affected Toast |
|---|---|---|
| Teacher | Internal | Discipline violation contextual toast; announcements send contextual toast |
| Principal | Internal | Announcements send contextual toast; discipline violation contextual toast |
| Admin | Internal | Announcements send contextual toast |
| Screen reader user | Assistive technology | Sonner toast announced via `role="status"` within 1 render cycle |

---

## 3. Functional Requirements

### FR-001 — Contextual Announcements Toast
**Priority:** Must
**Source:** TR-E17.12-FR-001 / UC-E17.12-001

The system SHALL display a contextual success toast after announcements send-to-school mutation resolves successfully, using key `announcements.sendToastContext` with interpolation `{recipientCount: number, time: string (HH:mm or locale-correct format)}`. Toast variant: `success`. Duration: 4000ms.

**AC:**
- Given principal sends announcement with `recipientCount=312` at 14:35 (vi locale), When mutation succeeds, Then sonner success toast fires with `announcements.sendToastContext` interpolated with `{recipientCount: 312, time: "14:35"}`; toast visible 4000ms.
- Given locale is `en` and send completes at 2:35 PM, When contextual toast fires, Then `{time}` uses 12-hour format ("2:35 PM") as formatted at the call site.
- Given mutation success callback fires, When call site triggers toast, Then toast visible within one React render cycle (no additional async delay).

---

### FR-002 — Generic Announcements Fallback Preserved
**Priority:** Must
**Source:** TR-E17.12-FR-002 / UC-E17.12-002

The system SHALL NOT delete `announcements.sendToast`. It remains as fallback when `recipientCount` is unavailable (undefined or 0). When using fallback: toast variant `success`, duration 2000ms.

**AC:**
- Given `recipientCount` is `undefined` at call site, When mutation succeeds, Then sonner fires generic `announcements.sendToast` with duration 2000ms; no broken `{recipientCount}` placeholder.
- Given implementation complete, When `vi.json` and `en.json` inspected, Then `announcements.sendToast` is present in both files unchanged.

---

### FR-003 — Contextual Discipline Violation Toast
**Priority:** Must
**Source:** TR-E17.12-FR-003 / UC-E17.12-003

The system SHALL display a contextual success toast after discipline violation record mutation resolves successfully, using net-new key `discipline.violations.successContext` with interpolation `{studentName: string}`. Toast variant: `success`. Duration: 4000ms.

**AC:**
- Given teacher records violation for "Nguyen Van A" and mutation succeeds, And `studentName="Nguyen Van A"` is available in form state, When success callback fires, Then sonner success toast fires with `discipline.violations.successContext` interpolated with `{studentName: "Nguyen Van A"}` (vi: "Đã ghi nhận vi phạm của Nguyen Van A"); visible 4000ms.

---

### FR-004 — Generic Discipline Fallback Preserved
**Priority:** Must
**Source:** TR-E17.12-FR-004 / UC-E17.12-004

The system SHALL NOT delete `discipline.violations.success`. It remains as fallback when `studentName` is unavailable. Duration: 2000ms.

**AC:**
- Given `studentName` is `undefined` or empty at call site, When mutation succeeds, Then sonner fires generic `discipline.violations.success` with duration 2000ms; no broken `{studentName}` placeholder.
- Given implementation complete, When `vi.json` and `en.json` inspected, Then `discipline.violations.success` is present unchanged.

---

### FR-005 — Add Net-New Key: discipline.violations.successContext
**Priority:** Must
**Source:** TR-E17.12-FR-005

The system SHALL add `discipline.violations.successContext` to BOTH `src/bootstrap/i18n/messages/vi.json` AND `src/bootstrap/i18n/messages/en.json` in the same commit (atomically).

**Required values:**
- `vi.json`: `"Đã ghi nhận vi phạm của {studentName}"`
- `en.json`: `"Violation recorded for {studentName}"`

**AC:**
- Given implementation complete, When `vi.json` inspected, Then `discipline.violations.successContext` = `"Đã ghi nhận vi phạm của {studentName}"`.
- Given implementation complete, When `en.json` inspected, Then `discipline.violations.successContext` = `"Violation recorded for {studentName}"`.
- Given `bunx tsc --noEmit` run, Then no missing-key errors (both files updated atomically).

---

### FR-006 — Locale-Formatted Time for Announcements Toast
**Priority:** Should
**Source:** TR-E17.12-FR-006

The system SHALL format `{time}` according to the active locale at the call site. vi: 24-hour HH:mm. en: 12-hour h:mm a. If locale unavailable, fallback to 24-hour HH:mm.

**AC:**
- Given active locale is `vi`, Then `{time}` interpolation shows 24-hour format (e.g. "14:35").
- Given active locale is `en`, Then `{time}` interpolation shows 12-hour format (e.g. "2:35 PM").

---

### FR-007 — Staff-Leave Toast: Explicitly Unchanged
**Priority:** Won't
**Source:** TR-E17.12-FR-007

Staff-leave toasts are explicitly out of scope. No changes to `staffLeave.toast.*` keys or call sites.

**AC:**
- Given implementation complete, Then no changes have been made to any staff-leave toast keys or call sites.

---

## 4. Non-Functional Requirements

### NFR-001 — Accessibility: Toast Screen-Reader Announcement
**Source:** TR-E17.12-NFR-001
Sonner's default `role="status"` (or equivalent live region) must be preserved for contextual and generic toasts.
**Measurable target:** WCAG 4.1.3 — status message announced without keyboard focus; auto-dismiss at 4000ms/2000ms; verified by `fe-accessibility-auditor`.

### NFR-002 — i18n: Net-New Key in Both Files; No Hardcoded Strings
**Source:** TR-E17.12-NFR-002
`discipline.violations.successContext` present in both files. Zero hardcoded toast strings at call sites.
**Measurable target:** `bunx tsc --noEmit` passes; grep for hardcoded Vietnamese/English at toast call sites returns zero results (excluding `messages/` and `*.stories.*`).

### NFR-003 — Performance: Toast Synchronous with Mutation Success
**Source:** TR-E17.12-NFR-003
Toast visible within one render cycle of mutation success callback.
**Measurable target:** No additional async delay before toast fires.

---

## 5. UI States & Flows

| State | Trigger | Visual |
|---|---|---|
| `toast-visible-contextual` | Mutation succeeds + context data available | Success toast with entity/count/time; 4000ms |
| `toast-visible-generic` | Mutation succeeds + context data unavailable | Generic success toast; 2000ms |
| `toast-dismissed` | Auto-dismiss or manual close | Toast removed from DOM |

**Fallback logic (call site):**
```
// Announcements call site:
if (recipientCount && recipientCount > 0) {
  toast.success(t('announcements.sendToastContext', { recipientCount, time: formatTime(locale) }), { duration: 4000 })
} else {
  toast.success(t('announcements.sendToast'), { duration: 2000 })
}

// Discipline call site:
if (studentName) {
  toast.success(t('discipline.violations.successContext', { studentName }), { duration: 4000 })
} else {
  toast.success(t('discipline.violations.success'), { duration: 2000 })
}
```

---

## 6. Data & Integration

No new backend integration. Data sources:
- `recipientCount`: from announcement entity client state at mutation success callback
- `studentName`: from violation record form's selected-student field state
- `time`: `new Date()` formatted at call site

**External dependencies:**
- `sonner` — already wired in project
- `src/bootstrap/i18n/messages/vi.json` and `en.json` — net-new key added in this story

---

## 7. Use Case Summary

| UC ID | Title | FR Coverage | AC Count |
|---|---|---|---|
| UC-E17.12-001 | Contextual Announcements Toast (context available) | FR-001, FR-006 | AC-01, AC-02, AC-03 |
| UC-E17.12-002 | Generic Fallback Announcements Toast (context unavailable) | FR-002 | AC-04, AC-05 |
| UC-E17.12-003 | Contextual Discipline Violation Toast (context available) | FR-003, FR-005 | AC-06, AC-07, AC-08 |
| UC-E17.12-004 | Generic Fallback Discipline Toast (context unavailable) | FR-004 | AC-09, AC-10 |

---

## 8. Constraints & Assumptions

**Technical constraints:**
- Both i18n files must be updated in the same commit (atomic). Adding to `vi.json` without `en.json` causes TypeScript type-check failure (`messages.d.ts` augment).
- `announcements.sendToastContext` is confirmed present as a DR-011 deliverable. FE verifies at implementation — if absent, add it alongside `discipline.violations.successContext`.
- Call sites are in presentation layer only (not in domain, use-case, or server action) per i18n rule: toast strings translated at presentation, not at server boundary.

**Confirmed assumptions:**
- [ASSUMPTION] `announcements.sendToastContext` key is present in vi.json/en.json per DR-011 deliverables. FE verifies at implementation.
- [ASSUMPTION] Announcements send action call site has `recipientCount` from announcement entity state. If unavailable, fallback per FR-002.
- [ASSUMPTION] Discipline violation record form has `studentName` in local form state at mutation success callback.

No open questions for this story. All logic is fully specified.

---

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration | Priority |
|---|---|---|---|---|
| FR-001 (Contextual announcements toast) | TR-E17.12-FR-001 + design-spec.jsonc#contextualToast.replacements.announcements | UC-E17.12-001 | i18n: `announcements.sendToastContext` (existing) | Must |
| FR-002 (Generic announcements preserved) | TR-E17.12-FR-002 | UC-E17.12-002 | i18n: `announcements.sendToast` (existing, must not delete) | Must |
| FR-003 (Contextual discipline toast) | TR-E17.12-FR-003 + design-spec.jsonc#contextualToast.replacements.discipline.violations | UC-E17.12-003 | i18n: `discipline.violations.successContext` (NET-NEW) | Must |
| FR-004 (Generic discipline preserved) | TR-E17.12-FR-004 | UC-E17.12-004 | i18n: `discipline.violations.success` (existing, must not delete) | Must |
| FR-005 (Add net-new key atomically) | TR-E17.12-FR-005 | UC-E17.12-003 (AC-07, AC-08) | `vi.json` + `en.json` both | Must |
| FR-006 (Locale time format) | TR-E17.12-FR-006 | UC-E17.12-001 (AC-02) | None | Should |
| FR-007 (Staff-leave unchanged) | TR-E17.12-FR-007 | N/A | None | Won't |
| NFR-001 (Toast a11y) | TR-E17.12-NFR-001 | All UCs (AC-11) | None | Must |
| NFR-002 (No hardcoded strings) | TR-E17.12-NFR-002 | All UCs (AC-12) | i18n: 4 keys below | Must |
| NFR-003 (Synchronous toast) | TR-E17.12-NFR-003 | UC-E17.12-001 (AC-03) | None | Must |

### i18n Key Coverage

| i18n Key Path | vi Value | en Value | Status | Used in |
|---|---|---|---|---|
| `announcements.sendToast` | "Đã gửi thông báo" | "Announcement sent" | Existing — MUST NOT delete | FR-002 fallback |
| `announcements.sendToastContext` | "Đã gửi thông báo đến {recipientCount} người nhận lúc {time}" | "Announcement sent to {recipientCount} recipients at {time}" | Existing (DR-011 deliverable) | FR-001 contextual |
| `discipline.violations.success` | "Đã ghi nhận vi phạm thành công!" | "Violation recorded successfully!" | Existing — MUST NOT delete | FR-004 fallback |
| `discipline.violations.successContext` | **"Đã ghi nhận vi phạm của {studentName}"** | **"Violation recorded for {studentName}"** | **NET-NEW — add in this story (both files atomically)** | FR-003 contextual |

**THIS IS THE ONLY NET-NEW i18n KEY ACROSS ALL 6 DR-011 STORIES.**

---

## 10. Handoff to FE

**What `fe-lead` should build:**

1. **Add net-new i18n key** `discipline.violations.successContext` to both `vi.json` AND `en.json` in the same commit before any call-site changes. Values specified above.
2. **Announcements call site** (presentation layer): add contextual/fallback logic using `announcements.sendToastContext` (4000ms) with `{recipientCount, time}` interpolation; fallback to `announcements.sendToast` (2000ms) when context unavailable.
3. **Discipline call site** (presentation layer): add contextual/fallback logic using `discipline.violations.successContext` (4000ms) with `{studentName}`; fallback to `discipline.violations.success` (2000ms).
4. **Storybook proof:** stories showing contextual toast (with context data) vs fallback toast (without context data) for both features.

**Lane:** normal

**Proof owed (TEST_MATRIX rows):**

| Layer | Expected proof |
|---|---|
| Unit | Vitest: toast params — contextual key + 4000ms when context available; generic key + 2000ms when context absent |
| Integration | None |
| E2E | Storybook: contextual toast story (with student name / recipient count) + fallback toast story (context unavailable) |
| Platform | None |
