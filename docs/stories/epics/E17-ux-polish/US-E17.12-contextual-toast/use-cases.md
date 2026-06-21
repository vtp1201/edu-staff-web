# US-E17.12 — Contextual Toast Messages: Use Cases & Acceptance Criteria

**Story ID:** US-E17.12
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**UC Author:** ba-use-case-modeler

---

## 1. Use Case Scope Summary

**Total UCs:** 4
**Actors:** Teacher, Principal, Admin
**System boundary:** Call-site upgrades in two feature areas — announcements (send-to-school) and discipline violations (record violation). No new components; sonner is already wired. One net-new i18n key: `discipline.violations.successContext` (must be added to both `vi.json` and `en.json`). Generic toast keys are NOT deleted; they remain as fallback.

**Explicitly out of scope:** Staff-leave toasts (already contextual), error toasts, any other feature.

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities in Scope |
|---|---|---|
| Teacher | Human, internal | Records discipline violations; sends announcements; sees contextual success toast |
| Principal | Human, internal | Sends announcements to school; records violations; sees contextual success toast |
| Admin | Human, internal | Sends announcements to school; sees contextual success toast |
| Screen reader user | Assistive technology | Receives sonner toast role=status announcement within 1 render cycle of mutation success |

---

## 3. Use Case Catalogue

### UC-E17.12-001 — Contextual Announcements Send Toast (Context Available)

**Primary Actor:** Teacher / Principal / Admin
**Preconditions:**
1. User confirmed the send-to-school confirm dialog (US-E17.8 FR-006).
2. Announcements send-to-school mutation resolves successfully.
3. `recipientCount` (number > 0) is available in client state at the mutation success callback.
4. Current time is derivable from `new Date()` at the call site.

**Main Success Scenario:**
1. Mutation success callback fires.
2. Call site evaluates: `recipientCount` is available and > 0.
3. Call site fires sonner toast using key `announcements.sendToastContext` with interpolation `{recipientCount, time}` where `time` is the current time in locale-correct format (vi: HH:mm 24-hour; en: h:mm a 12-hour).
4. Toast variant is `success`.
5. Toast duration is 4000ms.
6. Toast message reads (vi): "Đã gửi thông báo đến {recipientCount} người nhận lúc {time}".
7. Toast auto-dismisses after 4000ms.

---

### UC-E17.12-002 — Generic Fallback Announcements Toast (Context Unavailable)

**Primary Actor:** Teacher / Principal / Admin
**Preconditions:**
1. Announcements send-to-school mutation resolves successfully.
2. `recipientCount` is unavailable (undefined) or equals 0 at the mutation success callback.

**Main Success Scenario:**
1. Mutation success callback fires.
2. Call site evaluates: `recipientCount` is unavailable or 0.
3. Call site fires sonner toast using the existing generic key `announcements.sendToast`.
4. Toast variant is `success`.
5. Toast duration is 2000ms.
6. Generic toast auto-dismisses after 2000ms.

**Business Rule:** The `announcements.sendToast` key is NEVER deleted. It always exists as the fallback in `vi.json` and `en.json`.

---

### UC-E17.12-003 — Contextual Discipline Violation Toast (Context Available)

**Primary Actor:** Teacher / Principal
**Preconditions:**
1. Teacher/Principal has completed the violation record form.
2. `studentName` is available in the form's selected-student field state.
3. Violation record mutation resolves successfully.

**Main Success Scenario:**
1. Mutation success callback fires.
2. Call site evaluates: `studentName` is available (non-empty string).
3. Call site fires sonner toast using net-new key `discipline.violations.successContext` with interpolation `{studentName}`.
4. Toast variant is `success`.
5. Toast duration is 4000ms.
6. Toast message reads (vi): "Đã ghi nhận vi phạm của {studentName}".
7. Toast auto-dismisses after 4000ms.

---

### UC-E17.12-004 — Generic Fallback Discipline Toast (Context Unavailable)

**Primary Actor:** Teacher / Principal
**Preconditions:**
1. Violation record mutation resolves successfully.
2. `studentName` is unavailable (undefined or empty string) at the mutation success callback.

**Main Success Scenario:**
1. Mutation success callback fires.
2. Call site evaluates: `studentName` is unavailable.
3. Call site fires sonner toast using the existing generic key `discipline.violations.success`.
4. Toast variant is `success`.
5. Toast duration is 2000ms.
6. Generic toast auto-dismisses after 2000ms.

**Business Rule:** The `discipline.violations.success` key is NEVER deleted. It always exists as the fallback.

---

## 4. Acceptance Criteria

### UC-E17.12-001: Contextual Announcements Toast

**AC-E17.12-01 — Success: contextual announcements toast with recipientCount and time (vi locale)**
Given a principal sends an announcement to school with `recipientCount=312` at 14:35 (vi locale),
When the send-to-school mutation resolves successfully,
Then a sonner toast fires with variant `success`,
And the toast message contains "312" (the recipient count) and "14:35" (the current time in HH:mm format),
Matching the value of `announcements.sendToastContext` interpolated with `{recipientCount: 312, time: "14:35"}`,
And the toast is visible for 4000ms before auto-dismissing.

**AC-E17.12-02 — Success: contextual announcements toast with correct time format in en locale**
Given the active locale is `en` and the same send action completes at 2:35 PM,
When the contextual toast fires,
Then the `{time}` interpolation uses the en 12-hour format (e.g. "2:35 PM") as formatted at the call site.

**AC-E17.12-03 — Success: toast fires in same render cycle as mutation success**
Given the send mutation success callback executes,
When the call site triggers the contextual toast,
Then the toast is visible without any additional async delay (within one React render cycle of the callback).

---

### UC-E17.12-002: Generic Announcements Fallback

**AC-E17.12-04 — Fallback: generic announcements toast when recipientCount unavailable**
Given the announcements send mutation resolves successfully,
And `recipientCount` is `undefined` at the call site,
When the call site evaluates the context check,
Then a sonner toast fires using the generic key `announcements.sendToast`,
And the toast duration is 2000ms (not 4000ms),
And the toast message does not contain a broken `{recipientCount}` placeholder.

**AC-E17.12-05 — Regression: generic key announcements.sendToast still exists**
Given the implementation is complete,
When `vi.json` and `en.json` are inspected,
Then the key `announcements.sendToast` is present in both files,
And it is used as the fallback (not deleted or replaced).

---

### UC-E17.12-003: Contextual Discipline Violation Toast

**AC-E17.12-06 — Success: contextual violation toast with studentName**
Given a teacher records a violation for the student "Nguyen Van A" and the mutation resolves successfully,
And `studentName="Nguyen Van A"` is available in the form state at the call site,
When the mutation success callback fires,
Then a sonner toast fires with variant `success`,
And the toast message matches the value of `discipline.violations.successContext` interpolated with `{studentName: "Nguyen Van A"}` (vi: "Đã ghi nhận vi phạm của Nguyen Van A"),
And the toast is visible for 4000ms before auto-dismissing.

**AC-E17.12-07 — i18n: net-new key present in both vi.json and en.json**
Given the implementation is complete,
When `src/bootstrap/i18n/messages/vi.json` is inspected,
Then `discipline.violations.successContext` exists with value `"Đã ghi nhận vi phạm của {studentName}"`,
And when `src/bootstrap/i18n/messages/en.json` is inspected,
Then `discipline.violations.successContext` exists with value `"Violation recorded for {studentName}"`,
And `bunx tsc --noEmit` passes with no missing-key errors.

**AC-E17.12-08 — i18n: keys added atomically (both files simultaneously)**
Given the FE engineer adds `discipline.violations.successContext` to `vi.json`,
Then `en.json` is updated in the same commit,
And TypeScript build does not fail due to missing mirror key.

---

### UC-E17.12-004: Generic Discipline Fallback

**AC-E17.12-09 — Fallback: generic violation toast when studentName unavailable**
Given the violation record mutation resolves successfully,
And `studentName` is `undefined` or empty string at the call site,
When the call site evaluates the context check,
Then a sonner toast fires using the existing generic key `discipline.violations.success`,
And the toast duration is 2000ms,
And the toast message does not contain a broken `{studentName}` placeholder.

**AC-E17.12-10 — Regression: generic key discipline.violations.success still exists**
Given the implementation is complete,
When `vi.json` and `en.json` are inspected,
Then the key `discipline.violations.success` is present in both files and unchanged.

---

### All Toasts: Accessibility and No Hardcoded Strings

**AC-E17.12-11 — Accessibility: toast announced by screen reader**
Given a contextual or generic success toast fires,
When a screen reader user is on the page,
Then the sonner toast uses its default `role="status"` (or equivalent live region) so the message is announced without the toast receiving keyboard focus.

**AC-E17.12-12 — i18n: no hardcoded strings at toast call sites**
Given the toast call sites in announcements and discipline presentation files are reviewed,
Then zero hardcoded Vietnamese or English strings are present at the call site,
And all toast messages are resolved via i18n keys before being passed to sonner,
And `bunx tsc --noEmit` passes.

---

### Staff-Leave: Explicitly Unchanged

**AC-E17.12-13 — Staff-leave toasts: no changes made**
Given the staff-leave feature toast is already contextual (DR-011 explicit exclusion),
When the implementation of US-E17.12 is complete,
Then no changes have been made to any staff-leave toast keys or call sites.

---

## 5. Edge Case Matrix

| Scenario | recipientCount > 0 + time available | recipientCount undefined/0 | studentName available | studentName undefined/empty | toast duration | i18n key in both files | staff-leave toast |
|---|---|---|---|---|---|---|---|
| Announcements toast | contextual 4000ms | generic fallback 2000ms | N/A | N/A | 4000ms vs 2000ms | sendToastContext present | no change |
| Violation toast | N/A | N/A | contextual 4000ms | generic fallback 2000ms | 4000ms vs 2000ms | successContext NET-NEW | no change |
| Generic keys deleted | no | generic still present | no | generic still present | — | both kept | — |
| Screen reader | toast announced | toast announced | toast announced | toast announced | auto-dismiss | — | — |
| Hardcoded strings | none at call site | none at call site | none at call site | none at call site | — | — | — |

---

## 6. Open Questions

No open questions for this story. The only net-new i18n key (`discipline.violations.successContext`) and all call-site fallback logic are fully specified in the requirements.
