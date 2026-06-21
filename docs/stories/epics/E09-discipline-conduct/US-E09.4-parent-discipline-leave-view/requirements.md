# Requirements — US-E09.4 Parent Discipline & Leave View

**Status:** Draft
**Requirement ID prefix:** TR (this story)
**Story packet:** `docs/stories/epics/E09-discipline-conduct/US-E09.4-parent-discipline-leave-view/`
**Design source:** `design_src/edu/discipline.jsx` — `ParentDisciplineScreen` (~line 969)
**Design spec:** `docs/product/design-spec.jsonc` key `discipline.parent`
**Depends on:** US-E09.2 (implemented) — reuses `ConductSummary`, `Violation`, `LeaveRequest` domain entities

---

## 1. Requirements Summary

The `/parent/discipline` screen allows a `parent`-role user to read their child's conduct summary and violation history (read-only), and to submit leave requests on behalf of that child. When a parent has multiple children enrolled in the same tenant, a pill-tab child selector drives per-child data scoping. The screen is parent-exclusive — all other roles are refused access. Data is served mock-first (`core` service not yet shipped; decision 0014). UI reuses the `discipline.studentConduct.*` i18n namespace; no new keys are introduced.

**Actors:** `parent` (primary). `teacher`, `principal`, `student`, and `admin` are excluded.
**Key constraints:** childId scoping enforced by BE; FE trusts token claim; WCAG 2.1 AA; responsive down to 320 px; i18n vi/en; mock-first.

---

## 2. Actors & Roles

| Actor | Role token | Capabilities on this screen |
|---|---|---|
| Parent | `parent` | View child selector; read conduct card; read violation history; submit leave request; view leave history |
| Teacher | `teacher` | No access — redirect/403 |
| Principal | `principal` | No access — redirect/403 |
| Student | `student` | No access — redirect/403 |
| Admin | `admin` | No access — redirect/403 |

---

## 3. Functional Requirements

### TR-001 — Child List Fetch (Must)

**Description:** The system SHALL fetch the authenticated parent's linked children list from the mock `core` service on initial page load and supply each child's `childId`, `name`, `className`, `avatarInitials`, `color`, and `gvcnName` to the UI.

**Trigger:** Parent navigates to `/parent/discipline`.
**Preconditions:** Valid `auth_token` cookie; role claim equals `parent`.
**Postconditions:** Children list is available in component state; if list has exactly one child, `childSelector` is not rendered and the single child is automatically selected.
**Error conditions:** If fetch fails, the system SHALL display the error state (TR-012) — no partial data is rendered.

---

### TR-002 — Child Selector Display (Must)

**Description:** The system SHALL render a horizontal pill-tab selector (`role="tablist"`) when `childrenList.length >= 2`. Each pill SHALL display: child avatar (initials, `size=30`, child.color), child name (13 px / 700), class and GVCN line (11 px / muted). Active pill border: `1.5px solid child.color`; background: `child.color + '14'`. Inactive pill: `1.5px solid var(--edu-border)`; background: `var(--edu-card)`. The selector SHALL support horizontal scroll on overflow without wrapping to a second row on viewports < 768 px.

**Trigger:** `childrenList.length >= 2` after TR-001 resolves.
**Preconditions:** Children list loaded.
**Postconditions:** Selector is visible; first child is selected by default.
**Error conditions:** None specific — selector does not render on error state.

---

### TR-003 — Child Selector Hidden for Single Child (Must)

**Description:** The system SHALL hide the child selector entirely when `childrenList.length === 1`. The single child's data SHALL load automatically without requiring user action.

**Trigger:** Children list length resolves to 1.
**Preconditions:** Children list loaded.
**Postconditions:** No selector element is in the DOM; child data loads as if that child is selected.
**Error conditions:** N/A.

---

### TR-004 — Child Switch Reloads Data (Must)

**Description:** The system SHALL reload all per-child data (conduct summary, violations, leave history) scoped to the newly selected `childId` when the parent switches the active pill. The system SHALL also reset and close any open leave request form on child switch so that a half-filled draft for one child does not persist to another child's view.

**Trigger:** Parent clicks an inactive child pill.
**Preconditions:** Child selector rendered; different child pill selected.
**Postconditions:** Conduct card, violation list, and leave history reflect the newly selected child's data; leave form is closed and cleared.
**Error conditions:** If per-child data fetch fails, display error state for that child's content area (TR-012).

---

### TR-005 — Conduct Summary Card Display (Must)

**Description:** The system SHALL render a read-only conduct card for the selected child with the following elements:

- **Score circle:** 80 px square, `border-radius: 50%`, background `conductColor + '18'`, border `3px solid conductColor + '44'`; inner score value 28 px / 800; sub-label "/ 100".
- **Score-to-color mapping (non-negotiable):**
  - score >= 90 → `var(--edu-success)`
  - score >= 70 → `var(--edu-primary)`
  - score >= 50 → `var(--edu-warning)`
  - score < 50  → `var(--edu-error)`
- **Grade badge** (`Badge` component): label from `conductThresholds` (Tốt / Khá / TB / Yếu); color token matches the same mapping above (success / primary / warning / error).
- **Stats line:** violation count and unexcused-absence count (i18n keys `discipline.studentConduct.conductCard.violations` / `conductCard.absences`).
- **Child info line:** child name + class (13 px / 600 / `var(--edu-text-secondary)`).
- **GVCN line:** GVCN name with user icon (12 px / `var(--edu-text-muted)`).
- **Read-only indicator:** lock icon + "Chỉ xem" / "Read-only" label in card header.
- **Progress bar:** `ProgressBar` component, fill = conductColor, value = score (0–100), `transition: width 0.6s`.
- **Semester label:** from `child.conduct.semester` field.

**Trigger:** Child data loaded (TR-001 or TR-004).
**Preconditions:** `ConductSummary` entity available for selected child.
**Postconditions:** Conduct card visible and accurate.
**Error conditions:** N/A — handled by TR-012 at fetch level.

---

### TR-006 — Violation History Display — Read-Only (Must)

**Description:** The system SHALL render the selected child's violation history as a read-only list. Each row SHALL include: severity color bar (4 px wide, `var(--edu-*)`), violation type label, date and period, description text, recorder name, and a severity badge. The system SHALL NOT render a "Ghi nhận vi phạm" button or any create/edit/delete control for the parent role.

**Severity badge color mapping (non-negotiable):**
- Nhẹ (low) → `warning`
- Vừa (medium) → `error`
- Nặng (high) → `destructive`

When the violation list is empty, the system SHALL display the empty state: shield-check icon in `var(--edu-success)` and i18n key `discipline.studentConduct.myViolations.empty`.

**Trigger:** Child data loaded.
**Preconditions:** `Violation[]` entity available for selected child (may be an empty array).
**Postconditions:** Violation list or empty state rendered; no mutation controls visible.
**Error conditions:** Handled by TR-012.

---

### TR-007 — Leave Request CTA Panel (Must)

**Description:** The system SHALL render a secondary card alongside the conduct card with a call-to-action button ("Tạo đơn xin nghỉ cho con" / "Create Leave Request for Child") that toggles the leave request form inline (no modal). When the form is open, the button label SHALL change to "Đóng form" / "Close form" and the button style SHALL switch to secondary (background `var(--edu-bg)`, border `var(--edu-border)`). The panel SHALL display the child's name and GVCN name as context ("Đơn gửi cho … — đồng bộ tới GVCN …").

**Trigger:** Child data loaded.
**Preconditions:** Conduct card visible.
**Postconditions:** Toggle button visible; pressing it opens/closes the leave form inline.
**Error conditions:** N/A.

---

### TR-008 — Leave Request Form Submission (Must)

**Description:** The system SHALL render the inline leave request form with exactly four fields:

| Field ID | Type | Validation | i18n key |
|---|---|---|---|
| `startDate` | date input | Required; must be >= today | `discipline.studentConduct.leaveRequest.startDate` |
| `endDate` | date input | Optional; if provided must be >= startDate | `discipline.studentConduct.leaveRequest.endDate` |
| `type` | select | Required; options: medical, event, personal, other | `discipline.studentConduct.leaveRequest.type` |
| `reason` | textarea | Required; `trim().length >= 10` | `discipline.studentConduct.leaveRequest.reason` |

**Validation errors trigger conditions:**
- `startDate < today` → inline error using `aria-invalid="true"` + `aria-describedby` pointing to error message element.
- `endDate < startDate` → same inline error pattern on `endDate`.
- `reason.trim().length < 10` → same inline error pattern on `reason`.

The submit button SHALL be disabled (visually and functionally) while `startDate` is empty or `reason` is empty. While submission is in-flight the system SHALL display "Đang gửi..." (`discipline.studentConduct.leaveRequest.submitting`) and disable the button. On success the system SHALL: close the form, clear fields, prepend the new leave entry (status = `pending`) to the leave history list, and display a success banner for 3 seconds (i18n key `discipline.studentConduct.leaveRequest.success`). The new leave entry SHALL include submitter name (parent display name + parent role label).

**Trigger:** Parent clicks the submit button with valid data.
**Preconditions:** Form open; all required fields pass validation.
**Postconditions:** New leave request with `status: "pending"` appears at top of leave history; form is closed; success banner displayed.
**Error conditions:** API failure → system SHALL display an inline error message; form remains open; no duplicate submission occurs.

---

### TR-009 — Leave History Display (Must)

**Description:** The system SHALL render the selected child's leave request history list below the violation history. Each row SHALL display: leave type badge, reason text (truncated at 1 line with ellipsis on overflow), date range + day count, status badge, and when status is `rejected` the system SHALL display the rejection reason from `r.rejectReason` (i18n prefix `discipline.studentConduct.leaveHistory.rejectionReason`).

**Status badge color mapping:**
- `pending` → `warning`; label: `discipline.studentConduct.status.pending`
- `approved` → `success`; label: `discipline.studentConduct.status.approved`
- `rejected` → `error`; label: `discipline.studentConduct.status.rejected`

When the leave list is empty, the system SHALL display the empty state using i18n key `discipline.studentConduct.leaveHistory.empty`.

The system SHALL NOT render cancel, withdraw, or delete controls on any leave entry. Leave history is read-only after submission.

**Trigger:** Child data loaded or new leave successfully submitted.
**Preconditions:** `LeaveRequest[]` entity available for selected child.
**Postconditions:** Leave list or empty state rendered; rejection reason visible on rejected entries; no mutation controls.
**Error conditions:** Handled by TR-012.

---

### TR-010 — RBAC Enforcement — Parent-Only Route (Must)

**Description:** The system SHALL enforce that `/parent/discipline` is accessible only to authenticated users with `role === "parent"` in the active tenant context. Any request from a `teacher`, `principal`, `student`, or `admin` role SHALL be refused with a redirect to that role's own default workspace or a 403 error page. An unauthenticated request SHALL redirect to `/login`.

**Trigger:** Any user navigates to `/parent/discipline`.
**Preconditions:** Middleware / RSC route guard evaluates role claim.
**Postconditions:** Only parent-role users reach the page content; all other roles are redirected.
**Error conditions:** Token missing or invalid → redirect to `/login`.

---

### TR-011 — childId Scoping (Must)

**Description:** The system SHALL pass the currently selected `childId` as a scoped parameter on every API call (mock or real): conduct summary, violations, and leave requests. The FE SHALL NOT request data for a `childId` that is not present in the authenticated parent's children list. The BE enforces parentId scoping; the FE trusts the token claim and SHALL NOT render data from a `childId` returned outside the authenticated children list.

**Trigger:** Every data fetch in this screen.
**Preconditions:** `childId` is set (first child by default, or via selector).
**Postconditions:** All data on screen corresponds to the selected child only.
**Error conditions:** If `childId` is missing or invalid the system SHALL display the error state (TR-012).

---

### TR-012 — Loading, Empty, and Error States (Must)

**Description:** The system SHALL handle the following UI states for all async data sections (conduct card, violation list, leave history):

- **Loading:** skeleton shimmer rendered for each section while the fetch is in-flight. Skeleton SHALL approximate the shape of the real content (conduct card skeleton, list-row skeletons × 3).
- **Empty:** section-level empty state with contextual icon and i18n copy (see TR-006 and TR-009 for specifics).
- **Error:** full-screen (or section-level) error message with a retry button (i18n key `discipline.studentConduct.loadError` + `discipline.studentConduct.retry`).
- **Success:** populated content.

**Trigger:** Any data fetch initiated or failed.
**Preconditions:** Fetch in-flight or failed.
**Postconditions:** Correct UI state displayed; no half-rendered content.
**Error conditions:** N/A.

---

### TR-013 — i18n — Reuse Existing Namespace (Must)

**Description:** The system SHALL render all UI strings using the existing `discipline.studentConduct.*` i18n namespace keys already present in `src/bootstrap/i18n/messages/{vi,en}.json`. The system SHALL NOT introduce new i18n keys for this screen. All `useTranslations()` / `getTranslations()` calls SHALL reference this namespace. Both `vi` and `en` locales SHALL be fully covered by existing keys.

**Trigger:** Any UI string rendered.
**Preconditions:** Existing keys: `parentTitle`, `parentSubtitle`, `conductCard.*`, `leaveRequest.*`, `leaveHistory.*`, `status.*`, `myViolations.empty`, `loadError`, `retry` — all confirmed present in `vi.json` and `en.json`.
**Postconditions:** No new keys added; build does not fail `tsc --noEmit` key check.
**Error conditions:** Missing key → build fails (type-check catches it).

---

### TR-014 — Mock-First Data Layer (Must)

**Description:** The system SHALL implement all data access through `MockDisciplineRepository` (extending the existing mock from US-E09.2) with child-scoped methods: `getChildConductSummary(childId)`, `getChildViolations(childId)`, `getChildLeaveRequests(childId)`, and `submitLeaveForChild(childId, request)`. Mock data SHALL cover at least two children with different conduct grades, violation counts, and leave statuses (including at least one `rejected` entry with a `rejectReason`). The real `core` service API endpoints (listed in Design Notes of `story.md`) SHALL be declared as endpoint constants in `bootstrap/endpoint/discipline.endpoint.ts` but wired only to the mock implementation.

**Trigger:** Story implementation.
**Preconditions:** US-E09.2 `MockDisciplineRepository` exists.
**Postconditions:** Screen works end-to-end with mock data; real BE wiring is deferred.
**Error conditions:** N/A.

---

### TR-015 — Form Reset on Child Switch (Should)

**Description:** The system SHALL close and clear the leave request form — resetting all four fields to their initial values — whenever the parent switches to a different child pill. A draft started for child A SHALL NOT be visible or preserved when child B is selected.

**Trigger:** Active child pill changes (TR-004).
**Preconditions:** Leave form is open with partially or fully entered data.
**Postconditions:** Form is closed; all fields reset to empty / default values.
**Error conditions:** N/A.

---

### TR-016 — Success Banner Auto-Dismiss (Should)

**Description:** The system SHALL display an inline success banner after a leave request is submitted successfully. The banner SHALL contain a check icon, the child's name, and the GVCN's name. The banner SHALL auto-dismiss after 3 seconds without requiring user action.

**Trigger:** Successful leave submission (TR-008).
**Preconditions:** Submit API call succeeded.
**Postconditions:** Banner visible for 3 seconds then removed; new leave entry is already in the list.
**Error conditions:** N/A.

---

### TR-017 — Conduct Score Domain Rule (Must)

**Description:** The system SHALL apply the conduct score domain rule: `score = 100 + sum(violation.points)`, floored at 0. This logic SHALL reside in the domain layer (reused from US-E09.1 / E09.2) and SHALL NOT be duplicated in the presentation layer.

**Trigger:** Conduct summary data assembled by use case.
**Preconditions:** Violation list available with `points` field per entry.
**Postconditions:** Score displayed in conduct card matches the domain-computed value.
**Error conditions:** N/A.

---

## 4. Non-Functional Requirements

### TR-NFR-001 — Accessibility: Child Selector (Must)

**Category:** Accessibility — WCAG 2.1 AA
**Requirement:** The child selector SHALL implement `role="tablist"` on the container and `role="tab"` + `aria-selected` on each pill. The associated content panel SHALL carry `role="tabpanel"`. Keyboard navigation (Arrow Left / Arrow Right) SHALL move focus between tabs; Enter / Space SHALL activate. Tab order SHALL follow document reading order.
**Measurable target:** Passes WCAG 2.1 Success Criterion 4.1.2 (Name, Role, Value); no keyboard trap; all tab controls keyboard-reachable.

---

### TR-NFR-002 — Accessibility: Conduct Score Badge (Must)

**Category:** Accessibility — WCAG 2.1 AA
**Requirement:** The conduct score circle and grade badge SHALL carry `aria-label` that fully describes the content without relying on color alone. Format: `aria-label="Hạnh kiểm {grade}: {score} điểm"` (vi) / `"Conduct {grade}: {score} points"` (en). The badge component SHALL also carry a text label (not only an icon).
**Measurable target:** Passes WCAG 2.1 SC 1.4.1 (Use of Color); screen-reader announces full grade + score.

---

### TR-NFR-003 — Accessibility: Severity Badges (Must)

**Category:** Accessibility — WCAG 2.1 AA
**Requirement:** Each violation severity badge SHALL carry `aria-label` with the full severity name (Nhẹ / Vừa / Nặng in vi; Mild / Moderate / Severe in en) so the status is not conveyed by color alone.
**Measurable target:** Passes WCAG 2.1 SC 1.4.1; screen-reader announces severity textually.

---

### TR-NFR-004 — Accessibility: Leave Request Form (Must)

**Category:** Accessibility — WCAG 2.1 AA
**Requirement:** Every form field SHALL have a `<label>` element associated via `htmlFor`. On validation error the field SHALL have `aria-invalid="true"` and `aria-describedby` pointing to a visible error message element. The form submit button SHALL have a descriptive label (`aria-label` when icon-only). All interactive targets (inputs, select, buttons) SHALL meet a minimum touch target size of 44 × 44 px on mobile.
**Measurable target:** Passes WCAG 2.1 SC 1.3.1 (Info and Relationships), 3.3.1 (Error Identification), 3.3.3 (Error Suggestion); touch target ≥ 44 × 44 px.

---

### TR-NFR-005 — Accessibility: Focus Management (Must)

**Category:** Accessibility — WCAG 2.1 AA
**Requirement:** All interactive elements SHALL have a visible focus ring using `var(--ring)`. No `outline: none` without an equivalent replacement. When the leave form is opened, focus SHALL move to the first field. When closed, focus SHALL return to the toggle button.
**Measurable target:** Passes WCAG 2.1 SC 2.4.7 (Focus Visible); no focus lost or trapped.

---

### TR-NFR-006 — Performance: Skeleton on Fetch (Must)

**Category:** Performance
**Requirement:** A loading skeleton SHALL be rendered within 320 ms of initiating any data fetch. The skeleton SHALL approximate the visual structure of the conduct card, violation list, and leave history (not a generic spinner). No content flicker SHALL occur between skeleton and real content.
**Measurable target:** Skeleton visible ≤ 320 ms; content swap without layout shift (CLS ~ 0).

---

### TR-NFR-007 — Responsive: No Layout Break at 320 px (Must)

**Category:** Responsive
**Requirement:** The screen SHALL not overflow or produce horizontal scroll at viewport widths from 320 px to 1280 px. The two-column grid (conduct card + leave CTA) SHALL collapse to single-column below 768 px. The child selector pill row SHALL be horizontally scrollable (not wrapping to multiple rows) on narrow viewports.
**Measurable target:** No horizontal scroll at 320 px; grid collapses at 768 px breakpoint; all content readable at 375 px (primary mobile breakpoint).

---

### TR-NFR-008 — i18n: Full vi/en Coverage (Must)

**Category:** i18n
**Requirement:** All visible strings SHALL be served via the existing `discipline.studentConduct.*` namespace. No hardcoded Vietnamese or English strings SHALL appear in `.tsx` files (excluding test files and story fixtures). Both `vi` and `en` locales SHALL produce correct output. `useTranslations()` SHALL be called with the correct namespace at the presentation layer; no translations at server action / use-case / repository layers.
**Measurable target:** `bunx tsc --noEmit` passes (no missing key); grep for diacritic strings in `src/features/discipline/presentation/parent-discipline/` returns zero matches outside messages files.

---

### TR-NFR-009 — Security: No Cross-Child Data Leak (Must)

**Category:** Security
**Requirement:** The FE SHALL never request data for a `childId` outside the parent's own children list (as returned by the children fetch). Switching children SHALL initiate a fresh fetch scoped to the new `childId` and SHALL invalidate previously cached data for the previous child. No child data (name, violations, leave history) SHALL be visible in the DOM for a child that is not currently selected.
**Measurable target:** Switching child removes prior child's data from DOM within one render cycle; no cross-child data bleed in TanStack Query cache.

---

## 5. Scope Boundary

### In Scope

- `/parent/discipline` route and `ParentDisciplineScreen` component (feature-local: `features/discipline/presentation/parent-discipline/`).
- Child selector: pill tabs, child data fetch, per-child scope.
- Conduct summary card: score circle, grade badge, progress bar, stats line, child/GVCN info, read-only indicator.
- Violation history list: rows with severity badges, empty state — read-only.
- Leave request form: 4 fields, 3 validation rules, submit/cancel, success banner, auto-dismiss.
- Leave history: status badges, rejection reason, empty state — read-only after submit.
- RBAC guard: parent-only enforcement, redirect for non-parent roles.
- childId scoping: all fetches scoped to selected child.
- Loading, empty, error, and success UI states for all async sections.
- Mock data layer (`MockDisciplineRepository` extended with child-scoped methods).
- Domain use cases: `GetChildConductSummaryUseCase`, `GetChildViolationsUseCase`, `GetChildLeaveRequestsUseCase`, `SubmitLeaveRequestUseCase` (extended with `childId`).
- Endpoint constants: `GET/POST /discipline/children/:childId/...` added to `bootstrap/endpoint/discipline.endpoint.ts`.
- i18n: reuse of existing `discipline.studentConduct.*` keys — no new keys.
- Accessibility: WCAG 2.1 AA for all interactive and informational elements.
- Responsive: breakpoints 320 / 375 / 768 / 1280 px.

### Out of Scope

- Cancelling or withdrawing a submitted leave request (post-submit leave is read-only for parent).
- Approving or rejecting leave requests (teacher/principal workflow — US-E09.1 or a future story).
- Recording or editing violation entries (teacher-only — US-E09.1).
- Overriding the child's conduct score or grade (read-only for parent role).
- Push or email notifications triggered by leave request status changes (notification epic E10).
- Real `core` service API wiring (deferred; mock-first per decision 0014).
- Pagination or infinite scroll for violation/leave lists (mock data volume is low; deferred to future story if needed).
- Any auth session changes, token issuance, or RBAC rule modifications.
- Data migration or schema changes.
- Admin or principal views of parent-submitted leave requests (separate screens, separate stories).

### External Dependencies

| Dependency | Status | Notes |
|---|---|---|
| US-E09.2 domain entities (`ConductSummary`, `Violation`, `LeaveRequest`) | Implemented | Reused as-is; `SubmitLeaveRequestUseCase` extended with `childId` param |
| `features/discipline` module | Implemented (E09.2) | Extended with parent role variant in `presentation/parent-discipline/` |
| `bootstrap/endpoint/discipline.endpoint.ts` | Implemented (E09.2) | Extended with child-scoped endpoints |
| `core` BE service — `/discipline/children/:childId/*` | Not shipped | Mock-first; endpoint constants declared but wired to mock |
| `MockDisciplineRepository` | Implemented (E09.2) | Extended with child-scoped methods |
| i18n keys `discipline.studentConduct.*` | Implemented (E09.2) | Reused; no new keys added |

---

## 6. MoSCoW Summary Table

| Priority | TR # | Requirement |
|---|---|---|
| **Must** | TR-001 | Child list fetch |
| **Must** | TR-002 | Child selector pill tabs (multi-child) |
| **Must** | TR-003 | Child selector hidden (single child) |
| **Must** | TR-004 | Child switch reloads data |
| **Must** | TR-005 | Conduct summary card display (score circle + gradeBadge color map) |
| **Must** | TR-006 | Violation history — read-only, no add button, empty state |
| **Must** | TR-007 | Leave request CTA panel toggle |
| **Must** | TR-008 | Leave request form: 4 fields + 3 validation rules + submit |
| **Must** | TR-009 | Leave history: status badges + rejection reason + empty state |
| **Must** | TR-010 | RBAC enforcement: parent-only route |
| **Must** | TR-011 | childId scoping on all fetches |
| **Must** | TR-012 | Loading / empty / error / success UI states |
| **Must** | TR-013 | i18n: reuse `discipline.studentConduct.*`, no new keys |
| **Must** | TR-014 | Mock-first data layer |
| **Must** | TR-017 | Conduct score domain rule in domain layer |
| **Must** | TR-NFR-001 | A11y: child selector role=tablist + keyboard nav |
| **Must** | TR-NFR-002 | A11y: conduct score badge aria-label (not color alone) |
| **Must** | TR-NFR-003 | A11y: severity badges aria-label |
| **Must** | TR-NFR-004 | A11y: leave form — label, aria-invalid, aria-describedby, 44×44px targets |
| **Must** | TR-NFR-005 | A11y: focus ring always visible; focus management on form open/close |
| **Must** | TR-NFR-006 | Performance: skeleton ≤ 320 ms |
| **Must** | TR-NFR-007 | Responsive: no break at 320 px; grid collapses at 768 px |
| **Must** | TR-NFR-008 | i18n: full vi/en coverage; typed; translated at presentation only |
| **Must** | TR-NFR-009 | Security: no cross-child data leak |
| **Should** | TR-015 | Form reset on child switch |
| **Should** | TR-016 | Success banner auto-dismiss (3 s) |

**Rationale for Should vs Must:**
- TR-015 and TR-016 are UX polish items that improve experience quality but do not block core functionality (a parent can still read conduct and submit a leave request without them). They are included as implementation expectations but do not constitute a hard acceptance-criteria gate.

---

## 7. Assumptions

- [ASSUMPTION] The `parentId`-to-`childId` scoping contract is enforced by the `core` BE service; the FE trusts the children list returned from the authenticated session and does not perform additional ownership validation client-side.
- [ASSUMPTION] The `SubmitLeaveRequestUseCase` from US-E09.2 is extended (not replaced) by adding an optional `childId` parameter; when `childId` is absent the use case defaults to the student's own context (preserving US-E09.2 behavior).
- [ASSUMPTION] The `discipline.studentConduct.*` i18n keys confirmed present in `vi.json` and `en.json` cover all strings needed — specifically `parentTitle`, `parentSubtitle`, `conductCard.*`, `leaveRequest.*`, `leaveHistory.*`, `status.*`, `myViolations.empty`, `loadError`, `retry`. If any key is found missing during implementation, it is an oversight in US-E09.2 and should be raised before adding to this story.
- [ASSUMPTION] The `child.color` value used in the child selector is one of the design-system semantic tokens mapped in `src/app/tokens.css` (e.g., `var(--edu-primary)`, `var(--edu-success)`) — not a raw hex value.
- [ASSUMPTION] The severity badge color mapping (Nhẹ → warning, Vừa → error, Nặng → destructive) is already consistent with the token values from design-system.md and does not require a new token.

---

## 8. Open Questions

None blocking. The story packet, design spec, mockup, and existing AC are internally consistent. Implementation can proceed with the assumptions labeled above.

---

## 9. Handoff Notes

### For `ba-integration-analyst`

Data dependencies to map and mock:

| Source | Entity | Endpoint (mock-first) | Sensitivity |
|---|---|---|---|
| `mock` (core deferred) | Children list (parentId-scoped) | `GET /discipline/children` (parent-scoped) | Confidential |
| `mock` (core deferred) | `ConductSummary` | `GET /discipline/children/:childId/conduct-summary` | Confidential |
| `mock` (core deferred) | `Violation[]` | `GET /discipline/children/:childId/violations` | Confidential |
| `mock` (core deferred) | `LeaveRequest[]` | `GET /discipline/children/:childId/leave-requests` | Confidential |
| `mock` (core deferred) | `LeaveRequest` (create) | `POST /discipline/children/:childId/leave-requests` | Confidential |

All five endpoints are mock-first (decision 0014). Endpoint constants extend `bootstrap/endpoint/discipline.endpoint.ts`. The mock must include at least: two children, one `rejected` leave entry with `rejectReason`, one `approved` entry, and at least one child with zero violations (to exercise the empty state in TR-006).

### For `ba-use-case-modeler`

Flows requiring Given/When/Then AC (refine and formalize the ACs from `story.md`):

1. **Happy path — single child, submit leave**: Parent with one child loads the screen, views conduct card and empty violations, submits a valid leave request, sees it appear as `pending` in history.
2. **Multi-child switch**: Parent with two children switches from child A to child B — all sections reload, any open leave form is cleared (TR-004, TR-015).
3. **Leave form validation**: Each of the three validation rules fires independently — startDate in the past, endDate before startDate, reason < 10 chars.
4. **Rejected leave display**: A leave entry with `status: "rejected"` and a `rejectReason` displays the rejection reason text (TR-009).
5. **Error + retry**: Fetch fails → error state → parent clicks retry → data loads.
6. **RBAC block**: Teacher navigates to `/parent/discipline` → redirect to teacher workspace (TR-010).
7. **Read-only enforcement**: No "Ghi nhận vi phạm" button visible in any state (TR-006 AC3).
