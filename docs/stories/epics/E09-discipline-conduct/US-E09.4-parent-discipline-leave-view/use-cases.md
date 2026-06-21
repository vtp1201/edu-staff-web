# Use Cases — US-E09.4 Parent Discipline & Leave View

**Story packet:** `docs/stories/epics/E09-discipline-conduct/US-E09.4-parent-discipline-leave-view/`
**Route:** `/parent/discipline`
**Produced by:** ba-use-case-modeler
**Date:** 2026-06-21
**Status:** Draft

---

## 1. Use Case Scope Summary

| Item | Value |
|------|-------|
| Total use cases | 7 |
| Total AC items | 35 |
| Primary actor | `parent` |
| Secondary actors | `teacher`, `principal`, `student`, `admin` (all blocked) |
| Boundaries | Starts: parent navigates to `/parent/discipline`. Ends: conduct read, violations read, leave submitted or read. Excludes: leave cancellation, approval/rejection workflow, real `core` service wiring. |
| Data layer | Mock-first — `MockDisciplineRepository` (decision 0014); `core` not shipped |
| The only write | INT-005 `POST /core/api/v1/discipline/children/:childId/leave-requests` |
| Depends on | US-E09.2 (domain entities `ConductSummary`, `Violation`, `LeaveRequest`; `MockDisciplineRepository`) |

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities on this screen |
|---|---|---|
| Parent | Primary, human | Navigate to `/parent/discipline`; view child selector; read conduct card; read violation history; toggle and submit leave request form; read leave history |
| Teacher | Human, excluded | No access — redirect/403 on route entry |
| Principal | Human, excluded | No access — redirect/403 on route entry |
| Student | Human, excluded | No access — redirect/403 on route entry |
| Admin | Human, excluded | No access — redirect/403 on route entry |
| Unauthenticated user | System / anonymous | No access — redirect to `/login` |
| `MockDisciplineRepository` | System (mock data) | Serves all 5 data operations; keyed by `childId` |

---

## 3. Use Case Catalogue

---

### UC-01 — Single-Child Happy Path: View Conduct and Submit Leave

**Actor:** parent (single linked child)
**Goal:** View the child's conduct summary and violation history, then submit a valid leave request and see it appear as `pending` in leave history.
**Primary actor:** parent
**Secondary actors:** `MockDisciplineRepository` (INT-001 through INT-005)

**Preconditions:**
1. Parent is authenticated; `auth_token` cookie is valid; role claim = `parent`.
2. INT-001 `GET /parent/children` returns exactly one child (`childId: "c1"`, name: "Nguyễn Minh Khoa").
3. INT-002 returns `score: 82, grade: "good"`.
4. INT-003 returns two violations for `childId: "c1"`.
5. INT-004 returns one approved leave entry for `childId: "c1"`.
6. All data served by `MockDisciplineRepository`.

**Postconditions:**
- Child selector is not rendered (single child).
- Conduct card shows score 82, grade badge "Khá", progress bar at 82 %.
- Violation list shows two rows.
- Leave form submit succeeds: new entry with `status: "pending"` appears at top of leave history.
- Success banner is visible for 3 seconds then auto-dismisses.
- Form is closed and all fields are reset after submission.

**Main Success Flow:**

1. Parent navigates to `/parent/discipline`.
2. Page RSC evaluates `role === "parent"` — passes gate.
3. System initiates INT-001 (children list); skeleton shimmers render within 320 ms.
4. INT-001 resolves: one child — child selector is NOT rendered; `childId: "c1"` is set as active.
5. System initiates INT-002, INT-003, INT-004 in parallel for `childId: "c1"`.
6. Data resolves: conduct card renders (score circle 82 px, grade badge "Khá" in `var(--edu-primary)`, progress bar fills to 82 %).
7. Violation list renders two rows with severity badges; read-only indicator ("Chỉ xem") appears in conduct card header.
8. Leave history renders one approved entry; status badge "Đã duyệt" in `var(--edu-success)`.
9. Parent clicks "Tạo đơn xin nghỉ cho con" button; form opens inline; focus moves to `startDate` field.
10. Parent fills: `startDate` = today, `endDate` = today + 1 day, `type` = "medical", `reason` = "Khám bệnh định kỳ tại bệnh viện Nhi Trung ương." (>= 10 chars).
11. All validation passes; submit button is enabled.
12. Parent clicks submit; system shows "Đang gửi..." spinner; button is disabled.
13. INT-005 `POST /discipline/children/c1/leave-requests` resolves with `status: "pending"`.
14. Form closes; fields reset; new leave entry with `status: "pending"` badge ("Chờ duyệt" in `var(--edu-warning)`) is prepended to leave history.
15. Success banner "Đơn xin nghỉ cho Nguyễn Minh Khoa đã gửi tới Nguyễn Thị Hương." appears.
16. After 3 seconds, banner auto-dismisses without user action.

**Alternative Flows:**

**ALT-01a — Leave history is empty on initial load:**
At step 8, INT-004 returns empty array. Leave history section shows empty state: i18n key `discipline.studentConduct.leaveHistory.empty`. After leave submission (step 14), the new entry replaces the empty state.

**ALT-01b — Violation list is empty on initial load:**
At step 7, INT-003 returns empty array. Violation section shows shield-check icon (`var(--edu-success)`) and i18n key `discipline.studentConduct.myViolations.empty`. Conduct card still renders.

**Exception Flows:**

**EXC-01a — INT-005 returns network error (502–504):**
At step 12, POST fails with `network-error`. Form remains open; inline error banner appears below the submit button. Button returns to enabled state; parent may retry. No duplicate entry is added to leave history.

**EXC-01b — INT-005 returns DUPLICATE_LEAVE_REQUEST (409):**
At step 12, POST returns 409. Toast warning: "Đã có đơn nghỉ cho khoảng thời gian này." Form remains open; no duplicate in history.

**EXC-01c — INT-005 returns VALIDATION_ERROR (422):**
At step 12, POST returns 422 with `error.fields[]`. Inline field errors appear under relevant fields; `aria-invalid="true"` + `aria-describedby` set. Submit button disabled until corrected.

**Business Rules:**
- BR-01: Conduct score domain rule: `score = 100 + sum(violation.points)`, floor 0 (TR-017). Logic in domain layer only; not duplicated in presentation.
- BR-02: `parentId` / `submittedBy` are NOT sent in the INT-005 request body — BE derives from token claim.
- BR-03: INT-005 is the only write operation on this screen.
- BR-04: Success banner auto-dismiss: exactly 3 seconds (TR-016).

**Non-functional constraints:** Skeleton visible within 320 ms (TR-NFR-006). All strings from `discipline.studentConduct.*` namespace. Touch targets ≥ 44×44 px (TR-NFR-004).

---

### UC-02 — Multi-Child Switcher: Data Scoping and Form Reset

**Actor:** parent (two or more linked children)
**Goal:** Select a specific child via the pill-tab selector; confirm that all data sections reload for that child's `childId`; confirm that any open leave form is closed and reset on child switch.

**Preconditions:**
1. Parent is authenticated; role claim = `parent`.
2. INT-001 returns two children: `childId: "c1"` (Nguyễn Minh Khoa, class 11A2) and `childId: "c2"` (Nguyễn Thu Hà, class 8B1).
3. Child A (`c1`): score 82, two violations, one approved leave.
4. Child B (`c2`): score 94, zero violations, one approved leave.
5. Initially child A (`c1`) is the active selection.

**Postconditions:**
- After switching to child B: conduct card shows score 94 ("Tốt", `var(--edu-success)`); violation section shows empty state; leave history shows child B's entries.
- Any leave form that was open for child A is closed and all fields are cleared.
- TanStack Query cache for child A is invalidated; no child A data remains visible in the DOM.

**Main Success Flow:**

1. Parent is on `/parent/discipline` with child A selected; child selector pill row is visible (two pills).
2. Child A pill is active: border `1.5px solid #5D87FF`; background `#5D87FF14`. Child B pill is inactive: border `1.5px solid var(--edu-border)`; background `var(--edu-card)`.
3. Parent has opened the leave request form for child A and partially entered `startDate`.
4. Parent clicks child B pill ("Nguyễn Thu Hà").
5. System: leave form closes; all four fields reset to empty / default values.
6. Child B pill becomes active (border `1.5px solid #13DEB9`; background `#13DEB914`).
7. System initiates INT-002, INT-003, INT-004 for `childId: "c2"` — skeleton shimmers appear for all three sections.
8. Child A's data is removed from the DOM before child B's data renders.
9. INT-002 resolves: conduct card shows score 94, grade badge "Tốt" in `var(--edu-success)`, progress bar fills to 94 %.
10. INT-003 resolves: zero violations — empty state with shield-check icon renders.
11. INT-004 resolves: child B's leave history renders.
12. Leave request CTA panel now shows child B's name and GVCN ("Đơn gửi cho Nguyễn Thu Hà — đồng bộ tới GVCN Trần Bích Vân").

**Alternative Flows:**

**ALT-02a — Keyboard navigation of child selector:**
At step 4, parent uses Arrow Right key to move focus from child A tab to child B tab, then presses Enter. Behavior is identical to click from step 5 onward. Left/Right arrow moves focus; Enter/Space activates.

**ALT-02b — Switching back to child A:**
Parent switches from child B back to child A. System re-fetches INT-002/003/004 for `childId: "c1"` — does not reuse stale cache from the initial load.

**Exception Flows:**

**EXC-02a — Child B data fetch fails (network error):**
At step 7, INT-002 / INT-003 / INT-004 fail. Error state renders for content sections with retry button. Child selector still shows child B as active. No child A data visible in the DOM.

**Business Rules:**
- BR-05: Form reset on child switch is mandatory (TR-015). A draft for child A must not persist when child B is active.
- BR-06: Child selector hidden when `childrenList.length === 1` (TR-003); pill row rendered only when length >= 2 (TR-002).
- BR-07: No cross-child data bleed — prior child's data removed from DOM within one render cycle (TR-NFR-009).

**Non-functional constraints:** Child selector implements `role="tablist"` on container; each pill `role="tab"` + `aria-selected`; content area `role="tabpanel"` (TR-NFR-001). Pill row horizontally scrollable on viewports < 768 px; no wrap to second row (TR-NFR-007).

---

### UC-03 — Leave Form Validation: Three Independent Rules

**Actor:** parent
**Goal:** Submit button remains disabled and appropriate inline errors appear when any one of the three validation rules is violated; each rule fires independently of the others.

**Preconditions:**
1. Parent is authenticated; active child is selected.
2. Leave form is open (parent has clicked the CTA button).
3. All fields begin in their initial empty/unset state.

**Postconditions (per sub-scenario):**

- 3a: `startDate` set to yesterday — inline error on `startDate` field; submit button disabled; no POST fired.
- 3b: `endDate < startDate` — inline error on `endDate` field only; submit button disabled; no POST fired.
- 3c: `reason.trim().length < 10` — inline error on `reason` field; submit button disabled; no POST fired.
- 3d: All required fields empty — submit button disabled (no errors shown until interaction per field).

**Main Success Flow (3a — Past Start Date):**

1. Form is open; parent sets `startDate` to yesterday (one day before today).
2. On blur from `startDate` (or on submit attempt): system evaluates `startDate >= today` — fails.
3. Field receives `aria-invalid="true"`; error message element renders with id used by `aria-describedby` on the field; i18n key `discipline.studentConduct.leaveRequest.startDate` error copy is shown.
4. Submit button remains disabled.
5. Parent corrects `startDate` to today or a future date; error clears; submit button re-enables once all other required fields are valid.

**Alternative Flows:**

**ALT-03a — End date before start date (3b):**
Parent sets a valid `startDate` (today), then sets `endDate` to `startDate - 1 day`.
`endDate` field receives `aria-invalid="true"` + `aria-describedby` pointing to error element. `startDate` shows no error. Submit disabled.

**ALT-03b — Short reason (3c):**
Parent sets valid `startDate` and valid `type`, enters reason "abc" (3 chars).
`reason` field receives `aria-invalid="true"` + `aria-describedby`. Submit disabled. Entering a 10+ char string clears the error.

**ALT-03c — All required fields empty (3d):**
Parent opens form without interacting with any field. Submit button is disabled. No inline errors visible until field interaction (blur or submit attempt). The `type` select has a default placeholder; `endDate` is optional so does not block submit independently.

**ALT-03d — Concurrent rule violations:**
Parent sets `startDate` to yesterday AND enters a 5-char reason. Both errors show simultaneously and independently. Fixing one does not affect the other's error state.

**Exception Flows:**

**EXC-03a — INT-005 422 VALIDATION_ERROR after passing client-side checks:**
Server returns field-level validation errors. Errors are mapped to the same inline error pattern (`aria-invalid` + `aria-describedby`). Form stays open; no duplicate submission.

**Business Rules:**
- BR-08: `startDate` validation: date value < today's local date → error (not on future or same-day). Validation key: `startDate < today`.
- BR-09: `endDate` validation: if provided, `endDate < startDate` → error. `endDate` is optional; omitting it is valid (defaults to `startDate` in the request body).
- BR-10: `reason` validation: `reason.trim().length < 10` → error. Whitespace-only counts as 0 chars.
- BR-11: `type` is required; select with no option chosen → submit disabled. Default placeholder is shown.
- BR-12: INT-005 is the only write; no other mutation occurs on form interaction.

**Non-functional constraints:** All form fields have `<label htmlFor>` associations (TR-NFR-004). Error elements have stable `id` values referenced by `aria-describedby`. Focus moves to first field (`startDate`) when form opens (TR-NFR-005). Focus returns to CTA toggle button when form closes. All inputs and the submit button have touch targets ≥ 44×44 px.

---

### UC-04 — Leave History: Rejected Entry with Reason Display

**Actor:** parent
**Goal:** Read a leave history entry where `status === "rejected"` and `rejectedReason` is non-null; confirm the rejection reason text is rendered in error-toned styling and no cancel control appears.

**Preconditions:**
1. Parent is authenticated; active child is selected.
2. INT-004 returns at least one entry with `status: "rejected"` and `rejectedReason: "Không đủ lý do hợp lệ theo quy định nhà trường."`.
3. Leave history list has loaded successfully.

**Postconditions:**
- Rejected entry renders with status badge in `var(--edu-error)` tone and i18n label `discipline.studentConduct.status.rejected`.
- `rejectedReason` text is rendered in `var(--edu-error)` color below the reason field, prefixed by i18n key `discipline.studentConduct.leaveHistory.rejectionReason`.
- No cancel, withdraw, or delete control is present on the entry.
- Approved entries show status badge in `var(--edu-success)` tone; pending entries in `var(--edu-warning)`.

**Main Success Flow:**

1. INT-004 resolves; leave history list renders.
2. Rejected entry row displays: leave type badge, reason text (truncated at 1 line / ellipsis), date range + day count.
3. Status badge renders "Bị từ chối" using i18n key `discipline.studentConduct.status.rejected`; badge background uses `var(--edu-error)/15`, text `var(--edu-error)`.
4. Below the reason text, rejection reason renders: "[discipline.studentConduct.leaveHistory.rejectionReason]: Không đủ lý do hợp lệ theo quy định nhà trường." in `var(--edu-error)` color.
5. No cancel / withdraw button is present anywhere in the rejected entry row or in the entire leave history section.

**Alternative Flows:**

**ALT-04a — Approved entry rendering:**
Approved entry: status badge "Đã duyệt" (`discipline.studentConduct.status.approved`) in `var(--edu-success)`. No rejection reason rendered. No cancel control.

**ALT-04b — Pending entry rendering:**
Pending entry: status badge "Chờ duyệt" (`discipline.studentConduct.status.pending`) in `var(--edu-warning)`. No rejection reason rendered. No cancel control.

**Exception Flows:**

**EXC-04a — `rejectedReason` is null on a rejected-status entry:**
`status === "rejected"` but `rejectedReason === null`. Rejection reason block is NOT rendered (no empty string or placeholder shown). Status badge still shows error tone.

**Business Rules:**
- BR-13: All leave history entries are read-only after submission — no cancel, withdraw, or edit controls for the parent role on any status (TR-009).
- BR-14: Rejection reason block is conditionally rendered: only when `status === "rejected"` AND `rejectedReason` is non-null and non-empty.
- BR-15: Status badge color must not rely solely on color — badge text label must be present (TR-NFR-003 pattern applied to leave status).

**Non-functional constraints:** Reason text truncated at 1 line with ellipsis on overflow; full text accessible via tooltip or expandable (implementation note — `[OPEN QUESTION]` OQ-4 pattern). Status badges carry text labels; color is not the sole indicator.

---

### UC-05 — Loading, Error, and Retry States

**Actor:** parent
**Goal:** Skeleton shimmer renders while data fetches are in-flight; when fetches fail the error state with retry button renders; clicking retry reloads data successfully.

**Preconditions:**
1. Parent is authenticated; role claim = `parent`.
2. Network is initially unreachable (simulated in mock by forcing a `network-error` failure).

**Postconditions (error scenario):**
- Full-page (or section-level) error state with retry button is visible.
- i18n key `discipline.studentConduct.loadError` is used for the error message.
- i18n key `discipline.studentConduct.retry` is used for the retry button label.
- No partial content visible; no half-rendered skeleton.

**Postconditions (retry success):**
- After clicking retry, all three data sections (conduct card, violations, leave history) render with correct data.
- Error state is no longer in the DOM.

**Main Success Flow (skeleton → error → retry):**

1. Parent navigates to `/parent/discipline`.
2. Within 320 ms of navigation, skeleton shimmers appear for:
   - Conduct card area: rectangle 70×70 px + two text-line skeletons.
   - Violation list: 3 rows of skeleton (small circle + two text lines each).
   - Leave history: 2 rows of skeleton.
3. INT-001, INT-002, INT-003, or INT-004 returns a network error (502–504).
4. Skeleton disappears; error state renders — error message using `discipline.studentConduct.loadError`; retry button using `discipline.studentConduct.retry`.
5. Parent clicks retry button.
6. Skeleton shimmers appear again for all sections.
7. Fetches resolve successfully; content replaces skeletons without layout shift.

**Alternative Flows:**

**ALT-05a — Section-level error (one section fails, others succeed):**
INT-002 succeeds but INT-003 returns network error. Conduct card renders with real data. Violation section shows its own error + retry. Leave history renders if INT-004 succeeded. Section-level isolation prevents full-page error.

**ALT-05b — Empty state on successful load:**
All fetches succeed; violations array = 0, leave requests array = 0. Conduct card renders. Violation section shows empty state (shield-check + `myViolations.empty`). Leave history shows empty state (`leaveHistory.empty`). No skeleton or error in DOM.

**Exception Flows:**

**EXC-05a — INT-001 (children list) fails:**
Children list cannot be fetched. No child selector, no content sections render. Full-page error state with retry button renders. This is the highest-severity failure as no child context exists.

**EXC-05b — Retry itself fails:**
After clicking retry, network error persists. Error state re-renders. Retry button remains available. No crash or blank screen.

**Business Rules:**
- BR-16: Skeleton must appear within 320 ms of initiating any data fetch (TR-NFR-006).
- BR-17: No content flicker between skeleton and real content; CLS ~ 0 target (TR-NFR-006).
- BR-18: Error state must display the retry control using exact i18n keys `loadError` + `retry` from `discipline.studentConduct.*` namespace.

**Non-functional constraints:** Skeleton shape approximates real content (not a generic spinner). Retry button is keyboard-reachable (focus ring visible using `var(--ring)`). Skeleton sections animate with shimmer respecting `@media (prefers-reduced-motion: reduce)` — shimmer pauses or is removed under reduced-motion preference.

---

### UC-06 — RBAC Enforcement: Non-Parent Roles Blocked

**Actor:** teacher, principal, student, admin (all excluded); unauthenticated user
**Goal:** Ensure that no non-parent actor reaches any rendered content at `/parent/discipline`; the route guard fires at the RSC layer before any API call is issued.

**Preconditions:**
1. A non-parent user has a valid session with role = `teacher` | `principal` | `student` | `admin`, or no session at all.
2. The user navigates directly to `/parent/discipline`.

**Postconditions:**
- Role `teacher` / `principal` / `student` / `admin`: user is redirected to their respective default workspace; no page content from `/parent/discipline` is rendered; no API call to INT-001 through INT-005 is made.
- Unauthenticated user: redirect to `/login`.
- No `childId`-scoped data is exposed to non-parent roles.

**Main Success Flow (teacher attempts access):**

1. Teacher navigates to `/parent/discipline`.
2. Page RSC evaluates role claim from `auth_token` cookie — role = `teacher`, not `parent`.
3. RSC issues a server-side redirect (no 200 response, no page content rendered).
4. Teacher browser arrives at teacher's default workspace (e.g., `/teacher/dashboard`).
5. No INT-001 through INT-005 request was initiated.

**Alternative Flows:**

**ALT-06a — Principal, student, admin attempt:**
Flow identical to main success flow steps 1–5; each role redirects to their own workspace. No content rendered.

**ALT-06b — Unauthenticated request:**
No valid `auth_token` cookie. RSC redirects to `/login`. After login as parent, redirect back to `/parent/discipline`.

**ALT-06c — Parent token with invalid childId (childId not in parent's list):**
Parent is authenticated (role = `parent`) but requests data for a `childId` not in their children list. BE returns 403 `FORBIDDEN` on INT-002/003/004. Error state renders: "Bạn không có quyền xem dữ liệu này." No data is rendered for that `childId`.

**Exception Flows:**

**EXC-06a — Token exists but role claim is missing or malformed:**
RSC cannot determine role from the token. Treat as unauthenticated; redirect to `/login`.

**EXC-06b — Token expired (proactive or reactive):**
Server-side `ensureFreshSession` attempts refresh. If refresh fails, redirect to `/login`. No page content rendered while token is expired.

**Business Rules:**
- BR-19: RBAC gate fires at the RSC page level before any data fetch (TR-010). No client-side role-check is relied upon as the sole guard.
- BR-20: `parentId` scoping is enforced by BE via JWT claim. FE must never pass `parentId` in request bodies or query params (TR-011, integration spec security notes).
- BR-21: The route `/parent/discipline` is not accessible from the sidebar navigation of teacher, principal, student, or admin role shell layouts (UI-level guard in addition to RSC guard).

**Non-functional constraints:** Redirect must complete before any partial render of parent-specific content. No race condition between client-side hydration and RSC redirect.

---

### UC-07 — Read-Only Enforcement: No Mutation Controls

**Actor:** parent
**Goal:** Confirm that no mutation control ("Ghi nhận vi phạm" button, edit, delete, cancel, or score-override action) appears anywhere in the DOM when the `parent` role views this screen, in every UI state.

**Preconditions:**
1. Parent is authenticated; role claim = `parent`.
2. Screen has loaded successfully with data (conduct card visible, violation rows present, leave history present).

**Postconditions:**
- "Ghi nhận vi phạm" button is absent from the DOM (not merely visually hidden).
- No edit control on conduct card score or grade.
- No delete/edit control on any violation row.
- No cancel/withdraw control on any approved, rejected, or pending leave history entry.
- Conduct card header shows lock icon + `t("discipline.studentConduct.conductCard.readOnly")` label (or equivalent "Chỉ xem" copy).

**Main Success Flow:**

1. Screen has loaded; conduct card, violation list, and leave history are all visible.
2. Inspect the DOM: no element with test-id or accessible label "Ghi nhận vi phạm" exists.
3. Conduct card header displays: lock icon + "Chỉ xem" / "Read-only" label (i18n key from `discipline.studentConduct.*`).
4. Violation rows: each row has date, type, description, severity badge, recorder name — no edit/delete button.
5. Leave history rows: each row has status badge, date range, reason text — no cancel button; rejected entries show rejection reason text (UC-04 scenario) — no delete button.
6. The leave request CTA toggle button and form (UC-01 / UC-03) are the only mutation surface; they create new leaves only, never modify existing entries.

**Alternative Flows:**

**ALT-07a — Loading state check:**
During skeleton loading (step 2 of UC-05), no "Ghi nhận vi phạm" button is present in skeleton content. Read-only constraint applies from initial page load.

**ALT-07b — Error state check:**
During error state (UC-05), no mutation control is rendered in the error card.

**ALT-07c — Empty violations state check:**
Violation empty state (shield-check icon + `myViolations.empty`): no "Add violation" or "Record violation" button appears even though the section is empty.

**Exception Flows:**

**EXC-07a — Attempted direct DOM injection (security):**
Any mutation endpoint (e.g., `PATCH /discipline/violations/:id`) not called by the `parent` presentation layer. BE enforces via role claim on every request; even if a non-standard client sent a mutation request, BE returns 403.

**Business Rules:**
- BR-22: "Ghi nhận vi phạm" button is never rendered for `role === "parent"` in any component in `features/discipline/presentation/parent-discipline/` (TR-006).
- BR-23: Leave entries after submission are read-only for the parent — no cancel endpoint exists (`DELETE` is out of scope; TR-009, integration spec INT-005 note).
- BR-24: Conduct score and grade are computed by the domain layer from violation data; the parent UI has no override control (TR-005).

**Non-functional constraints:** Absence of controls is a DOM-level guarantee, not a CSS `display: none` mask. Playwright E2E proof must query for the button and assert it does not exist in the DOM (story `ViolationsReadOnly` in the E2E matrix).

---

## 4. Acceptance Criteria

---

### UC-01 Acceptance Criteria

**AC-01-01 — Single-child screen load: child selector absent, conduct card visible**
- Given: parent with one linked child (`childId: "c1"`) navigates to `/parent/discipline`
- When: INT-001 resolves with one child
- Then: no element with `role="tablist"` is present in the DOM
- And: conduct card is visible with score value "82", grade badge label "Khá", and badge background token `var(--edu-primary)/15`
- And: progress bar fill is set to 82 % with token `var(--edu-primary)` and `transition: width 0.6s`
- Note: all strings served via `discipline.studentConduct.*`; data from `MockDisciplineRepository`

**AC-01-02 — Conduct score color token mapping (domain rule + visual)**
- Given: child's computed score is 82 (domain rule: `score = 100 + sum(violation.points)`, floor 0)
- When: conduct card renders
- Then: score circle background is `var(--edu-primary) + '18'`, border `var(--edu-primary) + '44'`
- And: score value rendered as "82" in font-size 28 px / weight 800
- And: the color-to-score domain rule is applied in the domain layer, NOT in the component
- Note: domain rule per TR-017; grade thresholds: ≥90 success, ≥70 primary, ≥50 warning, <50 error

**AC-01-03 — Leave form submit: pending entry prepended + success banner**
- Given: leave form is open; parent enters valid `startDate` (today), `endDate` (tomorrow), `type` = "medical", `reason` = "Khám bệnh định kỳ tại bệnh viện Nhi Trung ương."
- When: parent clicks the submit button and INT-005 returns success
- Then: form closes; form fields reset to empty
- And: a new leave entry with status badge "Chờ duyệt" (token `var(--edu-warning)`) appears at the TOP of the leave history list
- And: success banner text contains child name "Nguyễn Minh Khoa" and GVCN name "Nguyễn Thị Hương"
- And: banner is visible for 3 seconds, then removed from the DOM without user interaction
- Note: INT-005 is the ONLY write on this screen; `parentId` / `submittedBy` NOT in request body

**AC-01-04 — Leave form submit: loading state**
- Given: parent has clicked the submit button; POST is in-flight
- When: INT-005 request is pending
- Then: submit button has `aria-busy="true"` or equivalent disabled state and displays spinner + i18n key `discipline.studentConduct.leaveRequest.submitting`
- And: submit button is not clickable (no duplicate submission)

**AC-01-05 — Leave form submit: network error**
- Given: parent submits a valid form; INT-005 returns 502 (network-error)
- When: error response is received
- Then: form remains open; inline error message appears below the submit button
- And: no new entry is added to leave history
- And: submit button returns to enabled state (retryable = true per envelope)

**AC-01-06 — Empty violations state**
- Given: INT-003 returns an empty violations array for the selected child
- When: violation section renders
- Then: shield-check icon in `var(--edu-success)` is displayed
- And: i18n key `discipline.studentConduct.myViolations.empty` copy is shown
- And: no violation rows are rendered

---

### UC-02 Acceptance Criteria

**AC-02-01 — Multi-child selector renders with correct active state**
- Given: parent has two linked children (`c1`, `c2`); screen has loaded
- When: child selector renders with child A (`c1`) as default active
- Then: a container with `role="tablist"` is present
- And: child A pill has `aria-selected="true"`, border `1.5px solid #5D87FF`, background `#5D87FF14`
- And: child B pill has `aria-selected="false"`, border `1.5px solid var(--edu-border)`, background `var(--edu-card)`
- And: each pill displays avatar (initials, size 30, child.color) + child name + class + GVCN

**AC-02-02 — Child switch: data reloads for new childId**
- Given: child A is active; parent clicks child B pill
- When: child B pill becomes active
- Then: INT-002, INT-003, INT-004 are each called with `childId: "c2"`
- And: child B conduct card renders score "94", grade badge "Tốt" in `var(--edu-success)`
- And: violation section shows empty state (child B has zero violations)
- And: leave history shows child B's entries, not child A's

**AC-02-03 — Child switch: form reset (TR-015)**
- Given: parent has the leave form open for child A with `startDate` partially entered
- When: parent clicks child B pill
- Then: leave form is closed
- And: all four fields (`startDate`, `endDate`, `type`, `reason`) are reset to empty / default values
- And: the leave CTA toggle button is visible and shows "Tạo đơn xin nghỉ cho con" label (not "Đóng form")

**AC-02-04 — Keyboard navigation of child selector (TR-NFR-001)**
- Given: focus is on child A's tab pill
- When: parent presses Arrow Right key
- Then: focus moves to child B tab pill
- And: pressing Enter or Space activates child B (same behavior as click, triggering AC-02-02)
- And: pressing Arrow Left from child B returns focus to child A tab without activating

**AC-02-05 — No cross-child data bleed (TR-NFR-009)**
- Given: child A data is rendered; parent switches to child B
- When: child B data begins loading
- Then: child A's name, violations, and leave entries are removed from the DOM before child B's data renders
- And: no child A data is visible in the DOM at any point during or after the child B load cycle

---

### UC-03 Acceptance Criteria

**AC-03-01 — Past start date: inline error, submit disabled**
- Given: leave form is open; all fields initially empty
- When: parent sets `startDate` to yesterday (one day before today's local date) and blurs the field
- Then: `startDate` input has `aria-invalid="true"`
- And: an error message element is present with id referenced by the field's `aria-describedby`
- And: submit button is disabled (not just visually styled; `disabled` attribute set or `aria-disabled="true"`)
- And: no POST request to INT-005 is made

**AC-03-02 — End date before start date: inline error on endDate only**
- Given: parent sets valid `startDate` = today; sets `endDate` = yesterday
- When: parent blurs the `endDate` field
- Then: `endDate` input has `aria-invalid="true"` with visible error message
- And: `startDate` input does NOT have `aria-invalid="true"` (its own rule is satisfied)
- And: submit button is disabled

**AC-03-03 — Short reason: inline error on reason field**
- Given: parent sets valid `startDate`, valid `type`; enters reason = "abc" (3 chars)
- When: parent blurs the `reason` textarea or attempts submit
- Then: `reason` textarea has `aria-invalid="true"` with error message via `aria-describedby`
- And: submit button is disabled
- And: when parent edits reason to a 10+ char string (non-whitespace), the error clears and submit re-enables (given other fields are valid)

**AC-03-04 — All required fields empty: submit disabled without errors**
- Given: leave form is open; no fields have been interacted with
- When: form is in initial state
- Then: submit button is disabled
- And: no `aria-invalid` attributes are set on any field
- And: no error messages are visible

**AC-03-05 — Form field labels and focus management (TR-NFR-004, TR-NFR-005)**
- Given: leave form opens
- When: form becomes visible
- Then: focus moves to the `startDate` input (first field in tab order)
- And: each of the four fields has a `<label>` element associated via `htmlFor` matching the field's `id`
- And: all interactive elements (inputs, select, textarea, buttons) have a minimum touch target of 44×44 px on mobile viewport (375 px width)
- And: when form closes, focus returns to the CTA toggle button

---

### UC-04 Acceptance Criteria

**AC-04-01 — Rejected entry: error-toned rejection reason displayed**
- Given: leave history contains an entry with `status: "rejected"` and `rejectedReason: "Không đủ lý do hợp lệ theo quy định nhà trường."`
- When: leave history section renders
- Then: status badge renders label from `discipline.studentConduct.status.rejected` with token `var(--edu-error)/15` background and `var(--edu-error)` text
- And: below the reason text, a rejection reason block renders using i18n key prefix `discipline.studentConduct.leaveHistory.rejectionReason` with the rejection text in `var(--edu-error)` color
- And: no cancel, withdraw, or delete button is present on this entry row

**AC-04-02 — Approved entry: success badge, no rejection reason**
- Given: leave history contains an entry with `status: "approved"`
- When: leave history section renders
- Then: status badge uses token `var(--edu-success)/15` background + `var(--edu-success)` text, label from `discipline.studentConduct.status.approved`
- And: no rejection reason block is rendered for this entry

**AC-04-03 — Null rejectedReason on rejected entry**
- Given: leave history contains an entry with `status: "rejected"` and `rejectedReason: null`
- When: leave history section renders
- Then: status badge shows error tone
- And: no rejection reason block is rendered (null case produces no output)

---

### UC-05 Acceptance Criteria

**AC-05-01 — Skeleton renders within 320 ms**
- Given: parent navigates to `/parent/discipline`
- When: data fetches are initiated (INT-001 through INT-004 in-flight)
- Then: within 320 ms of navigation, skeleton shimmer elements are visible for conduct card area (rectangular 70×70 + two text-line shapes), violation list (3 row shapes), and leave history (2 row shapes)
- And: no real data content is shown before fetches resolve

**AC-05-02 — Error state renders correctly on fetch failure**
- Given: mock is configured to return a network error on INT-002 (or INT-001)
- When: error response is received
- Then: error message using i18n key `discipline.studentConduct.loadError` is visible
- And: retry button using i18n key `discipline.studentConduct.retry` is visible and keyboard-focusable
- And: no partial data from the failed fetch is rendered

**AC-05-03 — Retry reloads data successfully**
- Given: error state is displayed; retry button is focused
- When: parent clicks (or presses Enter on) the retry button
- Then: skeleton shimmers appear again for all affected sections
- And: when mock returns success on the second attempt, content renders and error state is removed from the DOM

**AC-05-04 — Empty state after successful load with zero items**
- Given: INT-003 returns `violations: []` and INT-004 returns `leaveRequests: []`
- When: both fetches resolve successfully
- Then: violation section displays shield-check icon + `discipline.studentConduct.myViolations.empty` text (no skeleton, no error)
- And: leave history section displays `discipline.studentConduct.leaveHistory.empty` text
- And: conduct card renders normally with score data

**AC-05-05 — Skeleton shimmer respects reduced-motion preference**
- Given: user's OS has `prefers-reduced-motion: reduce` enabled
- When: skeleton is rendered during data fetch
- Then: shimmer animation is paused or absent; static skeleton shapes are shown without motion

---

### UC-06 Acceptance Criteria

**AC-06-01 — Teacher redirect**
- Given: a user with `role: "teacher"` is authenticated
- When: they navigate to `/parent/discipline`
- Then: the RSC page guard redirects without rendering any parent-discipline content
- And: no request to INT-001 through INT-005 is made
- And: the user's browser is on their teacher workspace route

**AC-06-02 — Unauthenticated redirect to login**
- Given: no valid `auth_token` cookie exists
- When: user navigates to `/parent/discipline`
- Then: user is redirected to `/login`
- And: no page content from `/parent/discipline` is rendered

**AC-06-03 — Parent with out-of-scope childId: 403 error state**
- Given: parent is authenticated (`role: "parent"`) but requests a `childId` not in their children list
- When: INT-002 / INT-003 / INT-004 return 403 FORBIDDEN
- Then: error state renders: "Bạn không có quyền xem dữ liệu này."
- And: no child data is rendered
- And: the 403 error is mapped via `forbidden` failure type, not displayed as a raw HTTP status

**AC-06-04 — RBAC gate at RSC level (no client-side trust)**
- Given: the `/parent/discipline` route is built
- When: any request with non-parent role token reaches the server
- Then: the RSC page evaluates the role claim server-side and redirects before sending any HTML
- And: no react tree from `ParentDisciplineScreen` is included in the HTTP response for non-parent roles

---

### UC-07 Acceptance Criteria

**AC-07-01 — "Ghi nhận vi phạm" button absent from DOM**
- Given: parent is authenticated; screen has loaded with violations visible
- When: the full DOM is queried for any element with accessible label or text matching "Ghi nhận vi phạm"
- Then: no such element exists in the DOM (not merely hidden with CSS)
- And: this holds in loading state, empty state, error state, and success state

**AC-07-02 — Conduct card read-only indicator visible**
- Given: screen has loaded successfully
- When: conduct card header area renders
- Then: a lock icon is present in the conduct card header
- And: text using the "Chỉ xem" / "Read-only" i18n key from `discipline.studentConduct.*` is visible
- And: no edit or score-override control is present on the card

**AC-07-03 — No mutation control on violation rows**
- Given: violation list has at least one row rendered
- When: each violation row is inspected
- Then: no edit, delete, or flag button is present on any row
- And: rows are purely informational: date, type label, description, severity badge, recorder name

**AC-07-04 — No cancel control on leave history entries**
- Given: leave history has at least one entry (any status: pending, approved, or rejected)
- When: each leave history row is inspected
- Then: no cancel, withdraw, delete, or edit button is present on any entry
- And: the only interactive surface in the leave history section is the "Tạo đơn xin nghỉ" CTA button (for new submissions)

**AC-07-05 — Conduct score badge aria-label (not color alone, TR-NFR-002)**
- Given: conduct card renders with score = 82, grade = "good" (Khá)
- When: the score circle / grade badge is inspected for accessibility
- Then: the element carries `aria-label="Hạnh kiểm Khá: 82 điểm"` (vi) or `"Conduct Good: 82 points"` (en)
- And: the grade text label "Khá" is present as visible text, not conveyed by color alone

**AC-07-06 — Severity badge aria-label (TR-NFR-003)**
- Given: violation list has a row with `severity: "low"` (Nhẹ)
- When: the severity badge is inspected
- Then: badge carries `aria-label="Nhẹ"` (vi) or `"Mild"` (en)
- And: severity label text is present, not conveyed by color alone

---

## 5. Edge Case Matrix

| Feature | Empty state | Max-length / boundary | Concurrent | Auth expired | Network error | Wrong role |
|---|---|---|---|---|---|---|
| Child selector (UC-02) | Single child → selector hidden; no tablist in DOM | Name overflow in pill → truncate with ellipsis; pill min-width 140 px | Two children fetch in same instant → sequential rendering; no double render | Redirect to `/login` before selector renders | Skeleton persists until retry; selector absent | Non-parent redirected before selector renders |
| Conduct card (UC-01) | score = 100, violationsCount = 0 → card renders normally (no separate empty case) | score exactly 50 → `var(--edu-warning)` (boundary: ≥50); score exactly 90 → `var(--edu-success)` (boundary: ≥90) | Two rapid child switches → only the last `childId` data is rendered; stale fetch cancelled | Redirect to `/login` | Conduct card shows error state + retry | Absent (no conduct card for wrong role) |
| Violation list (UC-01, UC-07) | Empty array → empty state (shield-check icon) | Very long description text → truncated with ellipsis; no overflow | Child switch while violation fetch in-flight → previous fetch cancelled | Redirect | Section error state + retry | "Ghi nhận vi phạm" button absent for all roles on this route |
| Leave form (UC-03) | Form with only optional `endDate` absent → valid submission; `endDate` defaults to `startDate` | `reason` exactly 10 chars → valid (boundary: `trim().length >= 10`); `reason` exactly 9 chars → error | Parent double-clicks submit → second click has no effect (button disabled during POST) | Session refresh attempted; if fails → form error; redirect | Submit error → form stays open; no duplicate entry | No leave form rendered for non-parent (route blocked at UC-06) |
| Leave history (UC-04) | Empty array → empty state (`leaveHistory.empty`) | `reason` text very long → 1-line truncation + ellipsis | New submission while list is loading → list refetch after submit prepends new entry | — | Section error + retry | No leave history rendered for non-parent |
| Success banner (UC-01) | No banner unless submit succeeds | Banner text with very long child name / GVCN name → truncate | Multiple rapid submissions → each banner replaces prior; 3s timer resets | — | No banner on failure | N/A |
| RBAC (UC-06) | No content for blocked roles | — | Concurrent sessions: one parent, one teacher → teacher session blocked; parent session unaffected | Both sessions redirected to `/login` independently | Both redirects proceed even under network degradation | Teacher/principal/student/admin all blocked; each redirects to own workspace |
| Read-only enforcement (UC-07) | Empty DOM check: no mutation button even in empty states | — | DOM check must pass across all UI states (loading/empty/error/success) | N/A | Mutation controls absent in error state | Absent entirely for all non-parent roles (route never reached) |
| Conduct score domain rule (BR-01, TR-017) | score = 100 with 0 violations | score floor: `sum(violation.points)` = -200 → score = max(0, 100 − 200) = 0 | — | — | Domain rule applies regardless of data state | N/A |

---

## 6. Open Questions

**[OPEN QUESTION] OQ-1 — Child list service ownership**
INT-001 `GET /parent/children` is mapped under `core`. It could equally belong to `iam`. US-E13.7 (Parent Grade View) needs the same data. Until edu-api confirms service placement:
- Both stories mock under `core`.
- If moved to `iam`, endpoint constant and repository must be updated in both stories simultaneously.
- Recommend `ba-lead` issue an ADR (≥ 0023) covering child-list ownership shared by US-E09.4 and US-E13.7.

**[OPEN QUESTION] OQ-2 — Shared child-list endpoint constant across E09.4 and E13.7**
Two stories duplicating `parentChildren` endpoint constant in different endpoint files will drift. Recommend a single `PARENT_EP.children` constant consumed by both. Requires cross-story coordination via `ba-lead`.

**[OPEN QUESTION] OQ-3 — Rejection reason full text access**
AC-04-01 specifies rejection reason text may be truncated at 1 line with ellipsis on overflow. There is no specified mechanism for the parent to read the full rejection reason if it is long. Recommend: tooltip on hover, or an expand/collapse toggle. Product decision needed before FE models the component.

**[OPEN QUESTION] OQ-4 — Leave request cancellation future story**
The story explicitly states "parent cannot cancel after submission." However, product may need a `cancelled` status in a future story. No `DELETE` or `PATCH status=cancelled` endpoint is modeled. If added, a new UC and a new leave status variant (`cancelled` → muted tone?) must be specified. This use case explicitly excludes it; flag to `ba-lead`.

**[OPEN QUESTION] OQ-5 — Date format on wire vs. display**
Mock data uses pre-formatted `dd/MM/yyyy` strings in response. INT-005 request body uses ISO 8601. If BE returns ISO 8601 in real responses, the FE mapper must format for display. Mock-first masking this difference. Confirm with edu-api whether response dates are ISO 8601 or pre-formatted before `core` service ships.

**[OPEN QUESTION] OQ-6 — `avatarColor` as hex vs. semantic token**
Mock uses raw hex (`"#5D87FF"`). If BE returns a semantic key (`"primary"`, `"success"`), the FE mapper must translate. Decision needed on the wire format before real `core` service wiring.
