# Spec — US-E09.4 Parent Discipline & Leave View

**Status:** Review
**Lane:** normal
**Sources:** requirements.md (TR-001–017, TR-NFR-001–009) · integration.md (INT-001–005) · use-cases.md (UC-01–07, 35 AC) · design-spec.jsonc key `discipline.parent` (~line 3132) · story.md

---

## 1. Overview

The `/parent/discipline` route gives a `parent`-role user a read-focused dashboard over their child's academic conduct: conduct score summary, violation history (read-only), and a single write surface — the leave-request form submitted on the child's behalf. When the authenticated parent has multiple children enrolled in the same tenant, a pill-tab child selector scopes every data section to the chosen `childId`. All other roles are refused access at the RSC page level before any API call is issued.

The `core` BE service is not yet shipped; all 5 endpoints are **mock-first** (decision 0014). The only write operation on this screen is **INT-005 `POST /discipline/children/:childId/leave-requests`**. All domain entities and the `MockDisciplineRepository` are extended from US-E09.2 — no new domain models are introduced.

**Key constraints:**
- Parent is the only actor; all other roles redirect before rendering.
- `parentId` scoping is BE-enforced via JWT claim; FE never sends `parentId` in request body.
- No new i18n keys — reuse `discipline.studentConduct.*` namespace established in US-E09.2.
- No new design tokens — all color references use tokens from `src/app/tokens.css`.
- WCAG 2.1 AA is a "done" criterion.

---

## 2. Screen & Route

| Attribute | Value |
|---|---|
| Route | `/parent/discipline` |
| Page RSC | `app/[locale]/(dashboard)/parent/discipline/page.tsx` |
| Client component | `features/discipline/presentation/parent-discipline/ParentDisciplineScreen.tsx` |
| Server action | `app/[locale]/(dashboard)/parent/discipline/actions.ts` |
| Design source | `design_src/edu/discipline.jsx` — `ParentDisciplineScreen` (~line 969) |
| Design spec key | `docs/product/design-spec.jsonc` → `discipline.parent` |
| Layout | 3-column on ≥1024 px (childSelector 220 px | conductCard 1fr | violations+leave 1fr); single-column on <768 px; content padding 28 px / 32 px; max-width 1100 px |

---

## 3. Actors & RBAC

| Actor | Role token | Access | Redirects to |
|---|---|---|---|
| Parent | `parent` | Full screen — view + submit leave | — |
| Teacher | `teacher` | **BLOCKED** — no access | `/teacher/dashboard` |
| Principal | `principal` | **BLOCKED** — no access | `/principal/dashboard` |
| Student | `student` | **BLOCKED** — no access | `/student/dashboard` |
| Admin | `admin` | **BLOCKED** — no access | `/admin/dashboard` |
| Unauthenticated | — | **BLOCKED** — no access | `/login` |

**RBAC enforcement rules:**
1. The RSC page (`page.tsx`) evaluates the role claim from `auth_token` cookie **before rendering any component or issuing any API call**. Non-parent roles are redirected server-side; the React tree for `ParentDisciplineScreen` is never included in the HTTP response.
2. `childId` scoping is enforced by BE via JWT claim. The FE fetches children from INT-001 (authenticated session) and only requests data for `childId` values present in that list.
3. The FE **never sends `parentId`** in any request body or query parameter — BE derives it from the Bearer token.
4. The route `/parent/discipline` is absent from the sidebar navigation of teacher, principal, student, and admin role shell layouts (UI-level guard in addition to RSC guard).

**READ-ONLY CONSTRAINT — PARENT ROLE:**
The parent role is a **pure reader** of conduct data. The system SHALL NOT render any of the following for the `parent` role on this screen, in any UI state (loading, empty, error, success):
- "Ghi nhận vi phạm" button (or any violation creation/edit/delete control)
- Edit or score-override control on the conduct card
- Cancel, withdraw, or delete control on any leave history entry
- Approve or reject action on leave entries

The **only mutation surface** is the leave request form (INT-005). This constraint must be enforced at the component level — absent from the DOM, not merely hidden with CSS.

---

## 4. Architecture Guidance

### Layers (Clean Architecture — no implementation decision, guidance only)

**Domain layer** (`features/discipline/domain/`) — reuse from US-E09.2:
- Entities: `ConductSummary`, `Violation`, `LeaveRequest` — reuse as-is; no new entity types.
- Failures: reuse existing `DisciplineFailure` union; add `invalid-child` variant if not already present.
- Repository interface: extend `IDisciplineRepository` with 5 child-scoped method signatures: `getChildren()`, `getChildConductSummary(childId)`, `getChildViolations(childId)`, `getChildLeaveRequests(childId)`, `submitLeaveForChild(childId, request)`.
- Use cases (3 new query + 1 extended):
  - `GetChildConductSummaryUseCase` — takes `childId`, returns `ConductSummary`.
  - `GetChildViolationsUseCase` — takes `childId`, returns `Violation[]`.
  - `GetChildLeaveRequestsUseCase` — takes `childId`, returns `LeaveRequest[]`.
  - `SubmitLeaveRequestUseCase` — **extend** from US-E09.2 by adding optional `childId` param; when `childId` is present the submission is on behalf of that child; when absent behavior defaults to the student's own context (US-E09.2 backward-compatible).
- Domain rule: `score = 100 + sum(violation.points)`, floored at 0 — resides in domain layer only (TR-017); must not be duplicated in presentation.

**Infrastructure layer** (`features/discipline/infrastructure/`) — mock-first:
- `MockDisciplineRepository` — extend existing mock from US-E09.2 with 5 child-scoped methods keyed by `childId`. Must cover at least two children (c1, c2), one `rejected` leave entry with `rejectReason`, at least one child with zero violations.
- Endpoint constants added to `src/bootstrap/endpoint/discipline.endpoint.ts` (see Section 5).

**Bootstrap / DI** (`bootstrap/di/discipline.di.ts`):
- Wire `MockDisciplineRepository` when `NEXT_PUBLIC_USE_MOCK=true` (established by decision 0014).
- Real `DisciplineRepository` wiring is deferred pending `core` service shipment.

**Presentation layer** (`features/discipline/presentation/parent-discipline/`):
- `ParentDisciplineScreen.tsx` — feature-local (single screen per component-organization.md rule); promote to `components/shared/` only when a second screen reuses it.
- Sub-components housed in the same folder; no shared-component promotion in this story.
- `useTranslations("discipline.studentConduct")` called at this layer only; no translation at action/use-case/repository layers.

**TanStack Query keys:**
- `['discipline', 'children']` — parent's children list (INT-001).
- `['discipline', 'conduct', childId]` — per-child conduct summary (INT-002).
- `['discipline', 'violations', childId]` — per-child violations (INT-003).
- `['discipline', 'leaveRequests', childId]` — per-child leave history (INT-004).
- On successful INT-005 submit: invalidate `['discipline', 'leaveRequests', childId]` for the submitted child; optimistically prepend new entry first, then invalidate for consistency.
- On child switch: prior child's TanStack Query cache may retain data; the component must not render data keyed to the previously active `childId`.

---

## 5. Data Contracts

**Service:** `core` — all 5 endpoints MOCK-FIRST (decision 0014)

### Endpoint constant names (extend `src/bootstrap/endpoint/discipline.endpoint.ts`)

```
parentChildren:           "/core/api/v1/parent/children"
childConductSummary:      (childId) => `/core/api/v1/discipline/children/${childId}/conduct-summary`
childViolations:          (childId) => `/core/api/v1/discipline/children/${childId}/violations`
childLeaveRequests:       (childId) => `/core/api/v1/discipline/children/${childId}/leave-requests`
submitChildLeaveRequest:  (childId) => `/core/api/v1/discipline/children/${childId}/leave-requests`
```

---

### INT-001 — Get Parent's Children List

**`GET /core/api/v1/parent/children`** | Protected | Role: `parent` | MOCK-FIRST

Request: no params — `parentId` is derived from Bearer token claim by BE.

Response payload (after envelope unwrap):
```
{
  children: [
    {
      childId:     string   // path param for INT-002–005
      name:        string   // PII — display only, never sent back to BE
      className:   string   // e.g. "11A2"
      avatar:      string   // initials, e.g. "NK"
      avatarColor: string   // hex or semantic key (see OQ-6)
      gvcnName:    string   // homeroom teacher full name (PII — display only)
    }
  ]
}
```

Error → UI mapping:

| Code | Status | Failure | UI behavior | Retryable |
|---|---|---|---|---|
| `UNAUTHORIZED` | 401 | `forbidden` | Redirect to `/login` (token-refresh interceptor fires first) | no |
| `FORBIDDEN` | 403 | `forbidden` | Toast: "Bạn không có quyền truy cập" | no |
| `PARENT_NOT_FOUND` | 404 | `not-found` | Inline banner: "Không tìm thấy hồ sơ phụ huynh." | no |
| network / 5xx | 502–504 | `network-error` | Full-page error state with retry | yes |

Empty state (`children` length = 0): inline notice "Chưa có học sinh nào liên kết với tài khoản này." — content sections do not render.

---

### INT-002 — Get Child Conduct Summary

**`GET /core/api/v1/discipline/children/:childId/conduct-summary`** | Protected | Role: `parent` | MOCK-FIRST

Request params: `childId` (path).

Response payload (after envelope unwrap):
```
{
  childId:         string   // echo; validate matches selected child
  score:           number   // 0–100
  grade:           "excellent" | "good" | "average" | "weak"
  violationsCount: number
  absences:        number   // unexcused absences
  semester:        string   // e.g. "HK1 2025–2026"
}
```

Grade → badge color mapping: `excellent` (≥90) → success | `good` (≥70) → primary | `average` (≥50) → warning | `weak` (<50) → error.

Error → UI mapping:

| Code | Status | Failure | UI behavior | Retryable |
|---|---|---|---|---|
| `CHILD_NOT_FOUND` | 404 | `not-found` | Conduct card inline: "Không tìm thấy dữ liệu hạnh kiểm." | no |
| `FORBIDDEN` | 403 | `forbidden` | "Bạn không có quyền xem dữ liệu này." | no |
| network / 5xx | 502–504 | `network-error` | Conduct card error state with retry | yes |

---

### INT-003 — Get Child Violations

**`GET /core/api/v1/discipline/children/:childId/violations`** | Protected | Role: `parent` | MOCK-FIRST

Request params: `childId` (path); `cursor` (query, optional); `limit` (query, optional, default 20).

Response payload (after envelope unwrap — use `{ raw: true }` + `parseEnvelope()` for pagination):
```
{
  violations: [
    {
      id:             string
      date:           string   // "dd/MM/yyyy" (mock format; ISO 8601 on real wire — see OQ-5)
      type:           string   // "late" | "uniform" | "behavior" | "other"
      severity:       "low" | "medium" | "high"
      description:    string
      handledBy:      string   // PII — display only
      pointsDeducted: number
    }
  ]
}
```

Severity → badge color: `low` → warning | `medium` → error | `high` → destructive.

Error → UI mapping:

| Code | Status | Failure | UI behavior | Retryable |
|---|---|---|---|---|
| `CHILD_NOT_FOUND` | 404 | `not-found` | Section: "Không tìm thấy dữ liệu vi phạm." | no |
| `FORBIDDEN` | 403 | `forbidden` | Section: "Không có quyền." | no |
| network / 5xx | 502–504 | `network-error` | Section error state with retry | yes |

Empty state (`violations` length = 0): shield-check icon (`var(--edu-success)`) + `discipline.studentConduct.myViolations.empty`. **No "Ghi nhận vi phạm" button ever rendered for parent role.**

---

### INT-004 — Get Child Leave Requests

**`GET /core/api/v1/discipline/children/:childId/leave-requests`** | Protected | Role: `parent` | MOCK-FIRST

Request params: `childId` (path); `cursor` (query, optional); `limit` (query, optional, default 20).

Response payload (after envelope unwrap):
```
{
  leaveRequests: [
    {
      id:             string
      startDate:      string   // "dd/MM/yyyy" (mock format)
      endDate:        string
      days:           number   // inclusive day count
      type:           "medical" | "personal" | "other"
      reason:         string   // PII — display only
      status:         "pending" | "approved" | "rejected"
      rejectedReason: string | null   // non-null only when status = "rejected"
      approvedBy:     string | null   // PII — display only
      submittedAt:    string
    }
  ]
}
```

Status → badge color: `pending` → warning | `approved` → success | `rejected` → error.

Error → UI mapping:

| Code | Status | Failure | UI behavior | Retryable |
|---|---|---|---|---|
| `CHILD_NOT_FOUND` | 404 | `not-found` | Section: "Không tìm thấy lịch sử đơn nghỉ." | no |
| `FORBIDDEN` | 403 | `forbidden` | Section: "Không có quyền." | no |
| network / 5xx | 502–504 | `network-error` | Section error state with retry | yes |

Empty state (`leaveRequests` length = 0): `discipline.studentConduct.leaveHistory.empty`.
Rejected entry: render `rejectedReason` only when `status === "rejected"` AND `rejectedReason` is non-null.
**No cancel/withdraw/delete button on any leave entry — read-only after submission.**

---

### INT-005 — Submit Leave Request for Child

> **THE ONLY WRITE OPERATION ON THIS SCREEN.**

**`POST /core/api/v1/discipline/children/:childId/leave-requests`** | Protected | Role: `parent` | MOCK-FIRST

Request body (camelCase JSON — `parentId`/`submittedBy` NOT included; BE derives from token):

| Field | Type | Location | Required | Validation |
|---|---|---|---|---|
| `childId` | string | path | yes | Must be in parent's children list |
| `startDate` | string | body | yes | ISO 8601; must be >= today (local date) |
| `endDate` | string | body | no | ISO 8601; if provided, must be >= `startDate`; defaults to `startDate` |
| `type` | string | body | yes | `"medical" \| "personal" \| "other"` |
| `reason` | string | body | yes | `reason.trim().length >= 10` |

Response payload (after envelope unwrap):
```
{
  id:          string    // newly created leave request ID
  childId:     string    // echo
  startDate:   string    // echoed as dd/MM/yyyy
  endDate:     string
  days:        number    // computed by BE
  type:        string
  reason:      string
  status:      "pending" // ALWAYS "pending" on creation
  submittedAt: string
}
```

On success: optimistically prepend the new entry to leave history with `status: "pending"`, then invalidate `['discipline', 'leaveRequests', childId]`.

Error → UI mapping:

| Code | Status | Failure | UI behavior | Retryable |
|---|---|---|---|---|
| `VALIDATION_ERROR` | 422 | `validation-error` | `error.fields[]` → per-field inline errors; `aria-invalid` + `aria-describedby` | no |
| `LEAVE_REQUEST_INVALID` | 422 | `validation-error` | Form-level inline: "Ngày hoặc lý do không hợp lệ." | no |
| `CHILD_NOT_FOUND` | 404 | `not-found` | Toast: "Không tìm thấy học sinh." — close form | no |
| `FORBIDDEN` | 403 | `forbidden` | Toast: "Bạn không có quyền nộp đơn cho học sinh này." | no |
| `DUPLICATE_LEAVE_REQUEST` | 409 | `conflict` | Toast warning: "Đã có đơn nghỉ cho khoảng thời gian này." | no |
| network / 5xx | 502–504 | `network-error` | Submit button retry state; form stays open | yes |

**No `DELETE` or `PATCH status=cancelled` endpoint exists — parent cannot cancel after submission.**

---

## 6. Use Cases & Acceptance Criteria

**Mock-first (decision 0014) — all data from `MockDisciplineRepository`. INT-005 is the only write.**

---

### UC-01 — Single-Child Happy Path: View Conduct and Submit Leave

**Actor:** parent (single linked child)
**Goal:** View the child's conduct summary and violation history, then submit a valid leave request and see it appear as `pending` in leave history.

**Preconditions:**
1. Parent is authenticated; `auth_token` cookie is valid; role claim = `parent`.
2. INT-001 returns exactly one child (`childId: "c1"`, name: "Nguyễn Minh Khoa").
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
- **ALT-01a** — Leave history empty on initial load: INT-004 returns empty array → empty state (`discipline.studentConduct.leaveHistory.empty`). After submission, new entry replaces empty state.
- **ALT-01b** — Violation list empty on initial load: INT-003 returns empty array → shield-check icon (`var(--edu-success)`) + `discipline.studentConduct.myViolations.empty`. Conduct card still renders.

**Exception Flows:**
- **EXC-01a** — INT-005 returns network error (502–504): form remains open; inline error below submit button; button re-enables; no duplicate in history.
- **EXC-01b** — INT-005 returns DUPLICATE_LEAVE_REQUEST (409): toast warning; form open; no duplicate.
- **EXC-01c** — INT-005 returns VALIDATION_ERROR (422): `error.fields[]` → per-field inline errors; `aria-invalid` + `aria-describedby`; submit disabled until corrected.

**Business Rules:**
- BR-01: `score = 100 + sum(violation.points)`, floor 0 (TR-017). Domain layer only.
- BR-02: `parentId`/`submittedBy` NOT in INT-005 request body.
- BR-03: INT-005 is the only write on this screen.
- BR-04: Success banner auto-dismisses after exactly 3 seconds (TR-016).

---

### UC-02 — Multi-Child Switcher: Data Scoping and Form Reset

**Actor:** parent (two or more linked children)
**Goal:** Select a child via pill-tab selector; confirm all data sections reload for new `childId`; confirm open leave form is closed and reset on child switch.

**Preconditions:**
1. Parent is authenticated; role claim = `parent`.
2. INT-001 returns two children: `c1` (Nguyễn Minh Khoa, 11A2) and `c2` (Nguyễn Thu Hà, 8B1).
3. Child A (`c1`): score 82, two violations, one approved leave.
4. Child B (`c2`): score 94, zero violations, one approved leave.
5. Initially child A (`c1`) is active.

**Postconditions:**
- After switching to child B: conduct card shows score 94 ("Tốt", `var(--edu-success)`); violation section shows empty state; leave history shows child B's entries.
- Any leave form open for child A is closed and all fields cleared.
- No child A data remains visible in the DOM.

**Main Success Flow:**
1. Parent on `/parent/discipline` with child A selected; pill row visible (two pills).
2. Child A pill active: border `1.5px solid #5D87FF`; background `#5D87FF14`. Child B pill inactive: `var(--edu-border)` border; `var(--edu-card)` background.
3. Parent has the leave form open for child A with `startDate` partially entered.
4. Parent clicks child B pill ("Nguyễn Thu Hà").
5. System: leave form closes; all four fields reset to empty/default.
6. Child B pill active (border `1.5px solid #13DEB9`; background `#13DEB914`).
7. System initiates INT-002, INT-003, INT-004 for `childId: "c2"` — skeleton shimmers for all three sections.
8. Child A's data removed from DOM before child B's data renders.
9. INT-002 resolves: conduct card shows score 94, grade badge "Tốt" in `var(--edu-success)`, progress bar fills to 94 %.
10. INT-003 resolves: zero violations — empty state with shield-check icon.
11. INT-004 resolves: child B leave history renders.
12. Leave CTA panel shows child B's name and GVCN.

**Alternative Flows:**
- **ALT-02a** — Keyboard navigation: Arrow Right moves focus to child B tab; Enter/Space activates. Behavior from step 5 onward is identical.
- **ALT-02b** — Switch back to child A: re-fetches INT-002/003/004 for `c1`; does not reuse stale cache.

**Exception Flows:**
- **EXC-02a** — Child B fetch fails: error state with retry for content sections; child selector still shows child B active; no child A data visible.

**Business Rules:**
- BR-05: Form reset on child switch is mandatory (TR-015). Draft for child A must not persist when child B is active.
- BR-06: Selector hidden when `childrenList.length === 1`; rendered only when length >= 2.
- BR-07: No cross-child data bleed — prior child's data removed from DOM within one render cycle (TR-NFR-009).

---

### UC-03 — Leave Form Validation: Three Independent Rules

**Actor:** parent
**Goal:** Submit button remains disabled and appropriate inline errors appear when any validation rule is violated; each rule fires independently.

**Preconditions:**
1. Parent is authenticated; active child is selected.
2. Leave form is open.
3. All fields in initial empty/unset state.

**Main Success Flow (3a — Past Start Date):**
1. Form is open; parent sets `startDate` to yesterday.
2. On blur: system evaluates `startDate >= today` — fails.
3. Field: `aria-invalid="true"`; error message element with id used by `aria-describedby`; i18n copy from `discipline.studentConduct.leaveRequest.startDate`.
4. Submit button disabled.
5. Parent corrects `startDate` to today or future; error clears; submit re-enables once all other required fields are valid.

**Alternative Flows:**
- **ALT-03a** — End date before start date (3b): valid `startDate`, `endDate = startDate - 1 day` → `endDate` gets `aria-invalid` + `aria-describedby`; `startDate` shows no error.
- **ALT-03b** — Short reason (3c): valid `startDate` and `type`, reason = "abc" (3 chars) → `reason` gets `aria-invalid` + `aria-describedby`; correcting to 10+ chars clears error.
- **ALT-03c** — All fields empty (3d): submit button disabled; no `aria-invalid` visible until field interaction.
- **ALT-03d** — Concurrent violations: past `startDate` AND short reason → both errors shown simultaneously; fixing one does not affect the other.

**Exception Flows:**
- **EXC-03a** — 422 after passing client-side checks: `error.fields[]` mapped to same inline error pattern. Form stays open; no duplicate submission.

**Business Rules:**
- BR-08: `startDate < today` (local date) → error.
- BR-09: If `endDate` provided, `endDate < startDate` → error. `endDate` is optional.
- BR-10: `reason.trim().length < 10` → error. Whitespace-only = 0 chars.
- BR-11: `type` is required; no option chosen → submit disabled.
- BR-12: INT-005 is the only write; no mutation on form interaction.

---

### UC-04 — Leave History: Rejected Entry with Reason Display

**Actor:** parent
**Goal:** Read a rejected leave entry; confirm rejection reason is rendered in error-toned styling; confirm no cancel control appears.

**Preconditions:**
1. Parent is authenticated; active child is selected.
2. INT-004 returns at least one entry with `status: "rejected"` and `rejectedReason: "Không đủ lý do hợp lệ theo quy định nhà trường."`.
3. Leave history list loaded successfully.

**Postconditions:**
- Rejected entry: status badge in `var(--edu-error)` tone with label `discipline.studentConduct.status.rejected`.
- `rejectedReason` text rendered in `var(--edu-error)` color, prefixed by `discipline.studentConduct.leaveHistory.rejectionReason`.
- No cancel, withdraw, or delete control on the entry.

**Main Success Flow:**
1. INT-004 resolves; leave history list renders.
2. Rejected entry row: leave type badge, reason text (truncated 1 line / ellipsis), date range + day count.
3. Status badge "Bị từ chối" with `var(--edu-error)/15` background, `var(--edu-error)` text.
4. Rejection reason block: `[rejectionReason i18n prefix]: Không đủ lý do hợp lệ theo quy định nhà trường.` in `var(--edu-error)`.
5. No cancel/withdraw button anywhere in the row or section.

**Alternative Flows:**
- **ALT-04a** — Approved entry: `var(--edu-success)` badge; no rejection reason.
- **ALT-04b** — Pending entry: `var(--edu-warning)` badge; no rejection reason.

**Exception Flows:**
- **EXC-04a** — `rejectedReason === null` on rejected-status entry: rejection reason block NOT rendered. Status badge still shows error tone.

**Business Rules:**
- BR-13: All leave entries read-only after submission — no cancel/withdraw/edit for parent role (TR-009).
- BR-14: Rejection reason block rendered only when `status === "rejected"` AND `rejectedReason` is non-null and non-empty.
- BR-15: Status badge text label required; color not the sole indicator.

---

### UC-05 — Loading, Error, and Retry States

**Actor:** parent
**Goal:** Skeleton shimmers while fetches are in-flight; error state with retry renders on failure; clicking retry reloads data.

**Preconditions:**
1. Parent is authenticated; role claim = `parent`.
2. Network initially unreachable (mock forcing `network-error`).

**Main Success Flow (skeleton → error → retry):**
1. Parent navigates to `/parent/discipline`.
2. Within 320 ms: skeleton shimmers for conduct card area (70×70 rect + two text-line shapes), violation list (3 row shapes), leave history (2 row shapes).
3. INT-001/002/003/004 returns network error (502–504).
4. Skeleton disappears; error state with `discipline.studentConduct.loadError`; retry button with `discipline.studentConduct.retry`.
5. Parent clicks retry.
6. Skeleton shimmers appear again for all sections.
7. Fetches resolve; content replaces skeletons without layout shift.

**Alternative Flows:**
- **ALT-05a** — Section-level error: INT-002 succeeds, INT-003 fails → conduct card renders with real data; violation section shows its own error + retry; no full-page error.
- **ALT-05b** — Empty state on success: all fetches succeed; violations array = 0, leave array = 0 → conduct card renders; both sections show their empty states.

**Exception Flows:**
- **EXC-05a** — INT-001 (children list) fails: no child selector, no content renders; full-page error + retry.
- **EXC-05b** — Retry itself fails: error state re-renders; retry button remains available; no crash.

**Business Rules:**
- BR-16: Skeleton within 320 ms (TR-NFR-006).
- BR-17: No content flicker; CLS ~ 0 (TR-NFR-006).
- BR-18: Error state uses exact keys `loadError` + `retry` from `discipline.studentConduct.*`.

---

### UC-06 — RBAC Enforcement: Non-Parent Roles Blocked

**Actor:** teacher, principal, student, admin (all excluded); unauthenticated user
**Goal:** No non-parent actor reaches rendered content at `/parent/discipline`.

**Preconditions:**
1. Non-parent user has valid session with role ≠ `parent`, or no session.
2. User navigates directly to `/parent/discipline`.

**Postconditions:**
- Role `teacher`/`principal`/`student`/`admin`: redirect to their workspace; no page content rendered; no API call to INT-001–005.
- Unauthenticated: redirect to `/login`.

**Main Success Flow (teacher):**
1. Teacher navigates to `/parent/discipline`.
2. Page RSC evaluates role claim — role = `teacher`, not `parent`.
3. RSC issues server-side redirect (no 200, no page content).
4. Teacher arrives at `/teacher/dashboard`.
5. No INT-001–005 request was initiated.

**Alternative Flows:**
- **ALT-06a** — Principal, student, admin: identical to main flow; each redirects to their own workspace.
- **ALT-06b** — Unauthenticated: redirect to `/login`; after parent login, redirect back to `/parent/discipline`.
- **ALT-06c** — Parent with invalid `childId`: BE returns 403 FORBIDDEN on INT-002/003/004; error state "Bạn không có quyền xem dữ liệu này."; no data rendered.

**Exception Flows:**
- **EXC-06a** — Role claim missing or malformed: treat as unauthenticated; redirect to `/login`.
- **EXC-06b** — Token expired: `ensureFreshSession` attempts refresh; if fails → redirect to `/login`.

**Business Rules:**
- BR-19: RBAC gate fires at RSC page level before any data fetch (TR-010).
- BR-20: `parentId` scoping enforced by BE JWT claim; FE never passes `parentId` in body or params (TR-011).
- BR-21: `/parent/discipline` absent from sidebar nav of teacher/principal/student/admin shell layouts.

---

### UC-07 — Read-Only Enforcement: No Mutation Controls

**Actor:** parent
**Goal:** Confirm no mutation control appears anywhere in the DOM for the parent role, in every UI state.

**Preconditions:**
1. Parent is authenticated; role claim = `parent`.
2. Screen loaded with data visible.

**Postconditions:**
- "Ghi nhận vi phạm" button absent from the DOM (not CSS-hidden — absent).
- No edit control on conduct card score or grade.
- No delete/edit on any violation row.
- No cancel/withdraw on any leave entry (any status).
- Conduct card header shows lock icon + `discipline.studentConduct.conductCard.readOnly` ("Chỉ xem").

**Main Success Flow:**
1. Screen loaded; all sections visible.
2. DOM query for "Ghi nhận vi phạm" — no element found.
3. Conduct card header: lock icon + "Chỉ xem" / "Read-only".
4. Violation rows: date, type, description, severity badge, recorder name — no edit/delete.
5. Leave history rows: status badge, date range, reason — no cancel; rejected entries show rejection reason text — no delete.
6. Leave request CTA toggle (UC-01/UC-03) is the only mutation surface: creates new leaves only.

**Alternative Flows:**
- **ALT-07a** — Loading state: no "Ghi nhận vi phạm" in skeleton content.
- **ALT-07b** — Error state: no mutation control in error card.
- **ALT-07c** — Empty violations state: shield-check icon + `myViolations.empty`; no "Add violation" button.

**Exception Flows:**
- **EXC-07a** — Any mutation endpoint (`PATCH /discipline/violations/:id`) not called by parent presentation layer; BE enforces 403 via role claim.

**Business Rules:**
- BR-22: "Ghi nhận vi phạm" never rendered for `role === "parent"` (TR-006).
- BR-23: Leave entries after submission read-only; no cancel endpoint (TR-009).
- BR-24: Conduct score/grade computed by domain layer; no override control for parent (TR-005).

---

### Acceptance Criteria

#### UC-01 Acceptance Criteria

**AC-01-01 — Single-child screen load: child selector absent, conduct card visible**
- Given: parent with one linked child (`childId: "c1"`) navigates to `/parent/discipline`
- When: INT-001 resolves with one child
- Then: no element with `role="tablist"` is present in the DOM
- And: conduct card is visible with score value "82", grade badge label "Khá", and badge background token `var(--edu-primary)/15`
- And: progress bar fill is set to 82 % with token `var(--edu-primary)` and `transition: width 0.6s`
- Note: all strings via `discipline.studentConduct.*`; data from `MockDisciplineRepository`

**AC-01-02 — Conduct score color token mapping (domain rule + visual)**
- Given: child's computed score is 82 (domain rule: `score = 100 + sum(violation.points)`, floor 0)
- When: conduct card renders
- Then: score circle background is `var(--edu-primary) + '18'`, border `var(--edu-primary) + '44'`
- And: score value rendered as "82" in font-size 28 px / weight 800
- And: the color-to-score domain rule is applied in the domain layer, NOT in the component

**AC-01-03 — Leave form submit: pending entry prepended + success banner**
- Given: leave form is open; parent enters valid `startDate` (today), `endDate` (tomorrow), `type` = "medical", `reason` = "Khám bệnh định kỳ tại bệnh viện Nhi Trung ương."
- When: parent clicks submit and INT-005 returns success
- Then: form closes; fields reset to empty
- And: new leave entry with status badge "Chờ duyệt" (`var(--edu-warning)`) appears at the TOP of leave history
- And: success banner contains child name "Nguyễn Minh Khoa" and GVCN name "Nguyễn Thị Hương"
- And: banner visible for 3 seconds, then removed from DOM without user interaction
- Note: INT-005 is the ONLY write; `parentId`/`submittedBy` NOT in request body

**AC-01-04 — Leave form submit: loading state**
- Given: parent has clicked submit; POST is in-flight
- When: INT-005 is pending
- Then: submit button has `aria-busy="true"` or equivalent disabled state; displays spinner + `discipline.studentConduct.leaveRequest.submitting`
- And: submit button is not clickable (no duplicate submission)

**AC-01-05 — Leave form submit: network error**
- Given: parent submits valid form; INT-005 returns 502
- When: error response received
- Then: form remains open; inline error below submit button
- And: no new entry added to leave history
- And: submit button returns to enabled state (retryable = true)

**AC-01-06 — Empty violations state**
- Given: INT-003 returns empty violations array
- When: violation section renders
- Then: shield-check icon in `var(--edu-success)` displayed
- And: `discipline.studentConduct.myViolations.empty` copy shown
- And: no violation rows rendered

---

#### UC-02 Acceptance Criteria

**AC-02-01 — Multi-child selector renders with correct active state**
- Given: parent has two linked children (`c1`, `c2`); screen loaded
- When: child selector renders with child A (`c1`) as default active
- Then: container with `role="tablist"` is present
- And: child A pill has `aria-selected="true"`, border `1.5px solid #5D87FF`, background `#5D87FF14`
- And: child B pill has `aria-selected="false"`, border `1.5px solid var(--edu-border)`, background `var(--edu-card)`
- And: each pill shows avatar (initials, size 30, child.color) + child name + class + GVCN

**AC-02-02 — Child switch: data reloads for new childId**
- Given: child A active; parent clicks child B pill
- When: child B becomes active
- Then: INT-002, INT-003, INT-004 each called with `childId: "c2"`
- And: conduct card shows score "94", grade badge "Tốt" in `var(--edu-success)`
- And: violation section shows empty state (child B has zero violations)
- And: leave history shows child B's entries, not child A's

**AC-02-03 — Child switch: form reset (TR-015)**
- Given: leave form is open for child A with `startDate` partially entered
- When: parent clicks child B pill
- Then: leave form is closed
- And: all four fields (`startDate`, `endDate`, `type`, `reason`) reset to empty/default
- And: leave CTA toggle button shows "Tạo đơn xin nghỉ cho con" (not "Đóng form")

**AC-02-04 — Keyboard navigation of child selector (TR-NFR-001)**
- Given: focus is on child A's tab pill
- When: parent presses Arrow Right key
- Then: focus moves to child B tab pill
- And: pressing Enter or Space activates child B (triggering AC-02-02)
- And: pressing Arrow Left from child B returns focus to child A without activating

**AC-02-05 — No cross-child data bleed (TR-NFR-009)**
- Given: child A data rendered; parent switches to child B
- When: child B data begins loading
- Then: child A's name, violations, and leave entries removed from DOM before child B's data renders
- And: no child A data visible in DOM at any point during or after child B load cycle

---

#### UC-03 Acceptance Criteria

**AC-03-01 — Past start date: inline error, submit disabled**
- Given: leave form open; fields empty
- When: parent sets `startDate` to yesterday and blurs
- Then: `startDate` input has `aria-invalid="true"`
- And: error message element present with id referenced by `aria-describedby`
- And: submit button disabled (`disabled` attribute or `aria-disabled="true"`)
- And: no POST to INT-005

**AC-03-02 — End date before start date: inline error on endDate only**
- Given: valid `startDate` = today; `endDate` = yesterday
- When: parent blurs `endDate`
- Then: `endDate` has `aria-invalid="true"` with visible error
- And: `startDate` does NOT have `aria-invalid="true"`
- And: submit button disabled

**AC-03-03 — Short reason: inline error on reason field**
- Given: valid `startDate`, valid `type`; reason = "abc" (3 chars)
- When: parent blurs reason or attempts submit
- Then: `reason` textarea has `aria-invalid="true"` with error via `aria-describedby`
- And: submit button disabled
- And: when reason edited to 10+ non-whitespace chars, error clears and submit re-enables

**AC-03-04 — All required fields empty: submit disabled without errors**
- Given: leave form open; no fields interacted with
- When: form in initial state
- Then: submit button disabled
- And: no `aria-invalid` on any field
- And: no error messages visible

**AC-03-05 — Form field labels and focus management (TR-NFR-004, TR-NFR-005)**
- Given: leave form opens
- When: form becomes visible
- Then: focus moves to `startDate` input (first field in tab order)
- And: each of the four fields has `<label>` associated via `htmlFor` matching field's `id`
- And: all interactive elements have minimum touch target 44×44 px at 375 px viewport
- And: when form closes, focus returns to CTA toggle button

---

#### UC-04 Acceptance Criteria

**AC-04-01 — Rejected entry: error-toned rejection reason displayed**
- Given: leave history contains entry with `status: "rejected"` and `rejectedReason: "Không đủ lý do hợp lệ theo quy định nhà trường."`
- When: leave history section renders
- Then: status badge uses `discipline.studentConduct.status.rejected` with `var(--edu-error)/15` background and `var(--edu-error)` text
- And: rejection reason block renders with i18n prefix `discipline.studentConduct.leaveHistory.rejectionReason` and rejection text in `var(--edu-error)` color
- And: no cancel, withdraw, or delete button on this row

**AC-04-02 — Approved entry: success badge, no rejection reason**
- Given: leave history contains entry with `status: "approved"`
- When: section renders
- Then: badge uses `var(--edu-success)/15` + `var(--edu-success)` text with `discipline.studentConduct.status.approved`
- And: no rejection reason block rendered

**AC-04-03 — Null rejectedReason on rejected entry**
- Given: entry with `status: "rejected"` and `rejectedReason: null`
- When: section renders
- Then: status badge shows error tone
- And: no rejection reason block rendered

---

#### UC-05 Acceptance Criteria

**AC-05-01 — Skeleton renders within 320 ms**
- Given: parent navigates to `/parent/discipline`
- When: fetches initiated (INT-001–004 in-flight)
- Then: within 320 ms, skeleton shimmers visible for conduct card area (70×70 rect + two text-line shapes), violation list (3 row shapes), leave history (2 row shapes)
- And: no real data content shown before fetches resolve

**AC-05-02 — Error state renders correctly on fetch failure**
- Given: mock configured to return network error on INT-002 (or INT-001)
- When: error response received
- Then: error message using `discipline.studentConduct.loadError` visible
- And: retry button using `discipline.studentConduct.retry` visible and keyboard-focusable
- And: no partial data from failed fetch rendered

**AC-05-03 — Retry reloads data successfully**
- Given: error state displayed; retry button focused
- When: parent clicks (or presses Enter on) retry
- Then: skeleton shimmers appear for all affected sections
- And: when mock returns success, content renders and error state removed from DOM

**AC-05-04 — Empty state after successful load with zero items**
- Given: INT-003 returns `violations: []` and INT-004 returns `leaveRequests: []`
- When: both resolve successfully
- Then: violation section shows shield-check + `discipline.studentConduct.myViolations.empty`
- And: leave history shows `discipline.studentConduct.leaveHistory.empty`
- And: conduct card renders normally

**AC-05-05 — Skeleton shimmer respects reduced-motion preference**
- Given: OS has `prefers-reduced-motion: reduce` enabled
- When: skeleton rendered
- Then: shimmer animation paused or absent; static skeleton shapes shown without motion

---

#### UC-06 Acceptance Criteria

**AC-06-01 — Teacher redirect**
- Given: user with `role: "teacher"` is authenticated
- When: they navigate to `/parent/discipline`
- Then: RSC page guard redirects without rendering any parent-discipline content
- And: no request to INT-001–005 made
- And: user is on their teacher workspace route

**AC-06-02 — Unauthenticated redirect to login**
- Given: no valid `auth_token` cookie
- When: user navigates to `/parent/discipline`
- Then: redirect to `/login`
- And: no page content rendered

**AC-06-03 — Parent with out-of-scope childId: 403 error state**
- Given: parent authenticated but requests `childId` not in their children list
- When: INT-002/003/004 return 403 FORBIDDEN
- Then: error state renders "Bạn không có quyền xem dữ liệu này."
- And: no child data rendered
- And: 403 mapped via `forbidden` failure type

**AC-06-04 — RBAC gate at RSC level**
- Given: `/parent/discipline` route is built
- When: any request with non-parent role reaches server
- Then: RSC evaluates role claim server-side and redirects before sending any HTML
- And: no React tree from `ParentDisciplineScreen` included in HTTP response

---

#### UC-07 Acceptance Criteria

**AC-07-01 — "Ghi nhận vi phạm" button absent from DOM**
- Given: parent authenticated; screen loaded with violations visible
- When: full DOM queried for element with label/text "Ghi nhận vi phạm"
- Then: no such element exists (not CSS-hidden — absent from DOM)
- And: holds in loading, empty, error, and success states

**AC-07-02 — Conduct card read-only indicator visible**
- Given: screen loaded successfully
- When: conduct card header renders
- Then: lock icon present in header
- And: text from "Chỉ xem"/"Read-only" i18n key visible
- And: no edit or score-override control present

**AC-07-03 — No mutation control on violation rows**
- Given: violation list has at least one row
- When: each row inspected
- Then: no edit, delete, or flag button present
- And: rows show only: date, type label, description, severity badge, recorder name

**AC-07-04 — No cancel control on leave history entries**
- Given: leave history has at least one entry (any status)
- When: each row inspected
- Then: no cancel, withdraw, delete, or edit button present
- And: only interactive surface in leave history is the "Tạo đơn xin nghỉ" CTA (new submissions only)

**AC-07-05 — Conduct score badge aria-label (not color alone, TR-NFR-002)**
- Given: conduct card renders with score = 82, grade = "good" (Khá)
- When: score circle/grade badge inspected for accessibility
- Then: element carries `aria-label="Hạnh kiểm Khá: 82 điểm"` (vi) or `"Conduct Good: 82 points"` (en)
- And: grade text label "Khá" present as visible text, not conveyed by color alone

**AC-07-06 — Severity badge aria-label (TR-NFR-003)**
- Given: violation list row with `severity: "low"` (Nhẹ)
- When: severity badge inspected
- Then: badge carries `aria-label="Nhẹ"` (vi) or `"Mild"` (en)
- And: severity label text present, not conveyed by color alone

---

## 7. UI States Coverage

| Section | Loading skeleton | Empty state (i18n key) | Error state (retry?) | Success |
|---|---|---|---|---|
| Child selector | 2 pill-shaped placeholders ~160 px wide | — (not shown if list empty; show "Chưa có học sinh nào liên kết" inline notice) | Full-page error + retry | Pill tabs (hidden if 1 child) |
| Conduct card | 70×70 rect + 2 text-line shapes | No separate empty: score 100 / 0 violations = clean state, card renders normally | Conduct card error state + retry | Score circle, grade badge, progress bar, stats, child/GVCN info, read-only indicator |
| Violation list | 3 row shapes (small circle + 2 text lines each) | `discipline.studentConduct.myViolations.empty` (shield-check icon, `var(--edu-success)`) | Section error state + retry | Violation rows with severity badges; **no add button** |
| Leave request form | — (not a fetch surface; toggle-driven) | — | Inline form error on submit failure; form stays open | Form closed after submit; success banner 3 s |
| Leave history | 2 row shapes | `discipline.studentConduct.leaveHistory.empty` | Section error state + retry | Leave entries with status badges; rejection reason for rejected; **no cancel button** |

---

## 8. Design Tokens & Visual Rules

All color values are semantic tokens from `src/app/tokens.css`. No raw hex colors.

### Conduct score → conductColor (non-negotiable)

| Score range | Token |
|---|---|
| score >= 90 | `var(--edu-success)` |
| score >= 70 | `var(--edu-primary)` |
| score >= 50 | `var(--edu-warning)` |
| score < 50 | `var(--edu-error)` |

### Conduct grade badge color mapping

| Grade (display) | API value | Badge color token |
|---|---|---|
| Tốt | `excellent` | success |
| Khá | `good` | primary |
| TB | `average` | warning |
| Yếu | `weak` | error |

Badge component: `Badge`; padding 3 px 10 px; radius full; 11 px / 600; `bg = color/15`.

### Violation severity badge mapping

| Severity (display) | API value | Badge color token |
|---|---|---|
| Nhẹ | `low` | warning |
| Vừa | `medium` | error |
| Nặng | `high` | destructive |

### Leave status badge mapping

| Status | Badge color token | i18n key |
|---|---|---|
| pending | warning | `discipline.studentConduct.status.pending` |
| approved | success | `discipline.studentConduct.status.approved` |
| rejected | error | `discipline.studentConduct.status.rejected` |

### Score circle

| Property | Value |
|---|---|
| Size | 80×80 px, `border-radius: 50%` |
| Background | `conductColor + '18'` |
| Border | `3px solid conductColor + '44'` |
| Value font-size | 28 px |
| Value font-weight | 800 |
| Sub-label | "/ 100" |

### Child selector active/inactive

| State | Border | Background |
|---|---|---|
| Active | `1.5px solid child.color` | `child.color + '14'` |
| Inactive | `1.5px solid var(--edu-border)` | `var(--edu-card)` |

Avatar: `Avatar` component, size 30, color = `child.color`.

### Conduct card

| Property | Value |
|---|---|
| Background | `var(--edu-card)` |
| Border | `1px solid var(--edu-border)` |
| Border-radius | 14 px |
| Shadow | `0 2px 12px rgba(0,0,0,0.04)` |
| Padding | 20 px |

### Progress bar

| Property | Value |
|---|---|
| Component | `ProgressBar` |
| Track | `var(--edu-border)` |
| Fill | `conductColor` |
| Transition | `width 0.6s` |
| Value | conduct score (0–100) |

### Typography

| Element | Font size | Weight | Color |
|---|---|---|---|
| Child name in conduct card | 13 px | 600 | `var(--edu-text-secondary)` |
| GVCN line | 12 px | — | `var(--edu-text-muted)` |
| Violation date | 12 px | — | `var(--edu-text-muted)` |
| Violation description | 13 px | 600 | `var(--edu-text-primary)` |
| Points deduction | 12 px | 700 | `var(--edu-error)` |
| Leave rejection reason | — | — | `var(--edu-error)` |

### Read-only indicators (PARENT ROLE — see Section 3)

- Conduct card header: lock icon + `discipline.studentConduct.conductCard.readOnly` text ("Chỉ xem").
- Violation section: no add/edit/delete controls in DOM.
- Leave history: no cancel/withdraw/delete controls in DOM.

---

## 9. Accessibility Requirements

All items below are WCAG 2.1 AA testable requirements.

### Child Selector (TR-NFR-001)

- Container: `role="tablist"`.
- Each pill: `role="tab"` + `aria-selected` (true/false).
- Content area: `role="tabpanel"`.
- Keyboard navigation: Arrow Left / Arrow Right moves focus between tabs without activating; Enter / Space activates.
- Tab order follows document reading order; no keyboard trap.
- **Measurable target:** Passes WCAG 2.1 SC 4.1.2 (Name, Role, Value); all tab controls keyboard-reachable.

### Conduct Score Badge (TR-NFR-002)

- Score circle + grade badge: `aria-label="Hạnh kiểm {grade}: {score} điểm"` (vi) / `"Conduct {grade}: {score} points"` (en).
- Grade badge carries a visible text label (not icon-only); color is not the sole indicator.
- **Measurable target:** Passes WCAG 2.1 SC 1.4.1 (Use of Color); screen-reader announces full grade + score.

### Severity Badges (TR-NFR-003)

- Each badge: `aria-label` with full severity name (Nhẹ / Vừa / Nặng in vi; Mild / Moderate / Severe in en).
- Text label always present; color is not the sole indicator.
- **Measurable target:** Passes WCAG 2.1 SC 1.4.1.

### Leave Request Form (TR-NFR-004)

- Each field has `<label htmlFor>` matching the field's `id`.
- On validation error: `aria-invalid="true"` + `aria-describedby` pointing to a visible error element with stable `id`.
- Submit button has descriptive `aria-label` when icon-only.
- All inputs, select, textarea, and buttons: minimum touch target 44×44 px on mobile (375 px viewport).
- **Measurable target:** Passes WCAG 2.1 SC 1.3.1, 3.3.1, 3.3.3; touch targets ≥ 44×44 px.

### Focus Management (TR-NFR-005)

- All interactive elements have visible focus ring using `var(--ring)`.
- No `outline: none` without an equivalent replacement.
- When leave form opens: focus moves to `startDate` (first field).
- When leave form closes: focus returns to the CTA toggle button.
- **Measurable target:** Passes WCAG 2.1 SC 2.4.7 (Focus Visible); no focus lost or trapped.

### Motion

- Skeleton shimmer animation gated behind `@media (prefers-reduced-motion: reduce)` — shimmer pauses or is removed; static skeleton shapes shown.
- Progress bar `transition: width 0.6s` — no motion concern (not auto-play; user-triggered on data load).
- No auto-play video, audio, or moving content.
- **Measurable target:** Passes WCAG 2.1 SC 2.3.3 (motion-safe); `AC-05-05`.

### Status Badges (leave history)

- Status badges carry text labels (pending/approved/rejected); color is not the sole indicator (same pattern as TR-NFR-003).
- Rejection reason text in `var(--edu-error)` — minimum contrast ratio ≥ 4.5:1 against card background.

---

## 10. i18n Requirements

**Namespace:** `discipline.studentConduct.*`
**Rule:** NO new i18n keys. All strings must already exist in `src/bootstrap/i18n/messages/{vi,en}.json` from US-E09.2.

### Required key list (all must exist in vi.json and en.json)

| Key path | Usage |
|---|---|
| `discipline.studentConduct.parentTitle` | Page title |
| `discipline.studentConduct.parentSubtitle` | Page subtitle |
| `discipline.studentConduct.conductCard.*` | All conduct card labels |
| `discipline.studentConduct.conductCard.readOnly` | "Chỉ xem" / "Read-only" indicator |
| `discipline.studentConduct.leaveRequest.startDate` | Field label + validation error copy |
| `discipline.studentConduct.leaveRequest.endDate` | Field label |
| `discipline.studentConduct.leaveRequest.type` | Field label + options |
| `discipline.studentConduct.leaveRequest.reason` | Field label + validation error copy |
| `discipline.studentConduct.leaveRequest.submitting` | "Đang gửi..." in-progress label |
| `discipline.studentConduct.leaveRequest.success` | Success banner text (with child + GVCN name interpolation) |
| `discipline.studentConduct.leaveRequest.submit` | Submit button label |
| `discipline.studentConduct.leaveHistory.*` | All leave history labels |
| `discipline.studentConduct.leaveHistory.rejectionReason` | Prefix for rejection reason text |
| `discipline.studentConduct.leaveHistory.empty` | Empty state copy |
| `discipline.studentConduct.status.pending` | Badge label |
| `discipline.studentConduct.status.approved` | Badge label |
| `discipline.studentConduct.status.rejected` | Badge label |
| `discipline.studentConduct.myViolations.empty` | Empty state copy |
| `discipline.studentConduct.loadError` | Error state message |
| `discipline.studentConduct.retry` | Retry button label |

**Translation boundary:** `useTranslations()` called at the presentation layer only (`ParentDisciplineScreen.tsx` and sub-components). Server actions, use cases, and repositories return stable error keys (`DisciplineFailure["type"]`); the presentation layer translates them.

**Verification:** `bunx tsc --noEmit` must pass (compile-time key check). Grep for diacritic strings in `src/features/discipline/presentation/parent-discipline/` must return zero matches outside message files, test files, and story fixtures.

---

## 11. Non-Functional Requirements

### Performance (TR-NFR-006)

- The system SHALL render a loading skeleton within **320 ms** of initiating any data fetch.
- The skeleton SHALL approximate the visual structure of the conduct card, violation list, and leave history — not a generic spinner.
- No content flicker between skeleton and real content; CLS ~ 0.
- **QA verification:** Storybook story `ParentDisciplineScreen_Loading` with interaction assertion checking skeleton renders ≤ 320 ms (via `vitest` fake timer or Playwright timing).

### Responsive (TR-NFR-007)

- No horizontal scroll at viewport widths from 320 px to 1280 px.
- Two-column grid (conduct card + leave CTA) collapses to single-column below 768 px.
- Child selector pill row horizontally scrollable on narrow viewports; no wrap to second row.
- **QA verification:** Storybook story rendered at 320 px and 375 px viewports; no overflow; grid collapse confirmed at 768 px.

### Security (TR-NFR-009)

- The FE SHALL never request data for a `childId` outside the parent's children list.
- Switching children initiates a fresh fetch for the new `childId` and invalidates the previous child's TanStack Query cache.
- No child data (name, violations, leave history) visible in DOM for a child not currently selected.
- `parentId` / `submittedBy` NEVER included in request bodies or query params.
- PII fields (`name`, `gvcnName`, `handledBy`, `reason`, `approvedBy`, `rejectedReason`) are display-only; never written back to BE in other requests; not stored in client-side state beyond component lifecycle.
- `accessToken` / `refreshToken` in httpOnly cookies (decisions 0018/0019); presentation layer never reads them.
- **QA verification:** DOM assertion on child switch confirms prior child's data absent; `parentId` field absence verified in request payload snapshots.

### i18n (TR-NFR-008)

- All visible strings via `discipline.studentConduct.*` namespace.
- No hardcoded Vietnamese or English strings in `.tsx` files (excluding test files and story fixtures).
- Both `vi` and `en` produce correct output.
- **QA verification:** `bunx tsc --noEmit` passes; diacritic grep on `presentation/parent-discipline/` returns zero matches outside messages/test/story files.

### RBAC / Auth (TR-010)

- RBAC gate at RSC page level; fires before any data fetch.
- No client-side role check is relied upon as the sole guard.
- **QA verification:** `AC-06-01` through `AC-06-04` Storybook stories (RBAC enforcement via mock role in server context).

---

## 12. Test Plan

### Storybook Stories (required)

| Story name | AC covered |
|---|---|
| `ParentDisciplineScreen_Loading` | AC-05-01, AC-05-05 |
| `ParentDisciplineScreen_SingleChild` | AC-01-01, AC-01-02, AC-07-01, AC-07-02 |
| `ParentDisciplineScreen_MultiChild` | AC-02-01, AC-02-02 |
| `ParentDisciplineScreen_ChildSwitch_FormReset` | AC-02-03, AC-02-04, AC-02-05 |
| `ParentDisciplineScreen_EmptyViolations` | AC-01-06, AC-05-04, AC-07-01 (empty state check) |
| `ParentDisciplineScreen_LeaveForm_Valid` | AC-01-03, AC-01-04 (submit flow) |
| `ParentDisciplineScreen_LeaveForm_Validation` | AC-03-01, AC-03-02, AC-03-03, AC-03-04, AC-03-05 |
| `ParentDisciplineScreen_LeaveHistoryWithRejection` | AC-04-01, AC-04-02, AC-04-03 |
| `ParentDisciplineScreen_ErrorState` | AC-05-02, AC-05-03 |
| `ParentDisciplineScreen_ReadOnlyEnforcement` | AC-07-01, AC-07-02, AC-07-03, AC-07-04, AC-07-05, AC-07-06 |

Each story must have a `play()` function with interaction assertions. Loading/empty/error stories are mandatory per `.claude/rules/tdd.md`.

### Unit Tests (required — domain layer, TDD red→green→refactor)

**`GetChildConductSummaryUseCase`:**
- success with `childId: "c1"` — returns `ConductSummary` with score 82, grade "good"
- success with `childId: "c2"` — returns score 94, grade "excellent"
- `childId` not in parent's list → `child-not-found` failure
- 403 from repository → `forbidden` failure

**`GetChildViolationsUseCase`:**
- success with violations (`childId: "c1"`, 2 items)
- success with empty list (`childId: "c2"`)
- `childId` not found → `child-not-found` failure

**`GetChildLeaveRequestsUseCase`:**
- success with entries including rejected entry
- success with empty list
- `childId` not found → `child-not-found` failure

**`SubmitLeaveRequestUseCase` (extended with `childId`):**
- valid submission with `childId` → returns `LeaveRequest` with `status: "pending"`
- `startDate < today` → `invalid-date` failure
- `reason.trim().length < 10` → `reason-too-short` failure
- `endDate < startDate` → `invalid-date` failure
- missing `childId` → `invalid-child` failure
- backward-compatibility: absence of `childId` defaults to student own context (US-E09.2 behavior unchanged)

**`MockDisciplineRepository` integration:**
- `getChildConductSummary("c1")` returns score 82
- `getChildConductSummary("c2")` returns score 94
- `getChildViolations("c1")` returns 2 items; `getChildViolations("c2")` returns empty
- `submitLeaveForChild("c1", validPayload)` prepends pending entry to c1's leave list
- cross-child isolation: after submitting for c1, c2's leave list unchanged
- `submitLeaveForChild("c1", { reason: "too short" })` throws mock `VALIDATION_ERROR`

**Conduct score domain rule:**
- `score = 100 + sum(violation.points)`, floor 0
- boundary: sum = 0 → score 100; sum = -100 → score 0; sum = -200 → score 0 (floor)
- score exactly 90 → conductColor = `var(--edu-success)`; score exactly 50 → `var(--edu-warning)`

---

## 13. Open Questions

The following open questions are inherited from `integration.md` and `use-cases.md`. Items marked **[NON-BLOCKING]** do not prevent FE from starting; items marked **[BLOCKING BEFORE REAL WIRING]** must be resolved before the real `core` service endpoints replace the mock.

**OQ-1 — [NON-BLOCKING] Child list service placement**
`GET /parent/children` is mapped under `core` (following enrollment context). It could belong to `iam` (user/member relationship). US-E13.7 (Parent Grade View) needs the same data. Until edu-api confirms service placement: mock under `core` as `/core/api/v1/parent/children`. If moved to `iam`, endpoint constant and repository must update in both US-E09.4 and US-E13.7 simultaneously. Recommend `ba-lead` issue an ADR (≥ 0023) covering child-list ownership shared by both stories.

**OQ-2 — [NON-BLOCKING] Shared child-list endpoint constant across E09.4 and E13.7**
Two stories duplicating `parentChildren` endpoint constant in different endpoint files will drift. Recommend a single `PARENT_EP.children` consumed by both. Requires cross-story coordination via `ba-lead`.

**OQ-3 — [NON-BLOCKING] Rejection reason full text access**
AC-04-01 shows rejection reason truncated at 1 line with ellipsis. No specified mechanism for the parent to read full text if long. Recommend tooltip on hover or expand/collapse toggle. Product decision needed before FE models the component; default to truncation-only in V1.

**OQ-4 — [NON-BLOCKING] Leave request cancellation future story**
Story explicitly excludes cancellation. No `DELETE` or `PATCH status=cancelled` endpoint modeled. If added in a future story, requires a new UC, new `cancelled` status variant in `LeaveRequest` entity, and a new badge color (muted tone). Flag to `ba-lead`.

**OQ-5 — [BLOCKING BEFORE REAL WIRING] Date format on wire vs. display**
Mock data uses pre-formatted `dd/MM/yyyy` strings. INT-005 request body uses ISO 8601. If BE returns ISO 8601 in real responses, the FE mapper must format for display. Confirm with edu-api before `core` service ships.

**OQ-6 — [BLOCKING BEFORE REAL WIRING] `avatarColor` as hex vs. semantic token**
Mock uses raw hex (`"#5D87FF"`). If BE returns a semantic key (`"primary"`, `"success"`), the FE mapper must translate to design-system token. Confirm wire format with edu-api before real wiring.

---

## 14. Traceability Matrix

| AC ID | TR source | INT endpoint(s) | UC | Storybook Story |
|---|---|---|---|---|
| AC-01-01 | TR-001, TR-003, TR-005 | INT-001, INT-002 | UC-01 | `ParentDisciplineScreen_SingleChild` |
| AC-01-02 | TR-005, TR-017 | INT-002 | UC-01 | `ParentDisciplineScreen_SingleChild` |
| AC-01-03 | TR-008, TR-009, TR-016 | INT-005 | UC-01 | `ParentDisciplineScreen_LeaveForm_Valid` |
| AC-01-04 | TR-008 | INT-005 | UC-01 | `ParentDisciplineScreen_LeaveForm_Valid` |
| AC-01-05 | TR-008, TR-012 | INT-005 | UC-01 | `ParentDisciplineScreen_ErrorState` |
| AC-01-06 | TR-006, TR-012 | INT-003 | UC-01 | `ParentDisciplineScreen_EmptyViolations` |
| AC-02-01 | TR-002, TR-NFR-001 | INT-001 | UC-02 | `ParentDisciplineScreen_MultiChild` |
| AC-02-02 | TR-004, TR-011 | INT-002, INT-003, INT-004 | UC-02 | `ParentDisciplineScreen_MultiChild` |
| AC-02-03 | TR-015, TR-004 | — (form state) | UC-02 | `ParentDisciplineScreen_ChildSwitch_FormReset` |
| AC-02-04 | TR-NFR-001 | — (keyboard nav) | UC-02 | `ParentDisciplineScreen_ChildSwitch_FormReset` |
| AC-02-05 | TR-NFR-009, TR-004 | INT-002, INT-003, INT-004 | UC-02 | `ParentDisciplineScreen_ChildSwitch_FormReset` |
| AC-03-01 | TR-008, TR-NFR-004 | INT-005 (blocked) | UC-03 | `ParentDisciplineScreen_LeaveForm_Validation` |
| AC-03-02 | TR-008, TR-NFR-004 | INT-005 (blocked) | UC-03 | `ParentDisciplineScreen_LeaveForm_Validation` |
| AC-03-03 | TR-008, TR-NFR-004 | INT-005 (blocked) | UC-03 | `ParentDisciplineScreen_LeaveForm_Validation` |
| AC-03-04 | TR-008 | — | UC-03 | `ParentDisciplineScreen_LeaveForm_Validation` |
| AC-03-05 | TR-NFR-004, TR-NFR-005 | — | UC-03 | `ParentDisciplineScreen_LeaveForm_Validation` |
| AC-04-01 | TR-009, TR-NFR-003 | INT-004 | UC-04 | `ParentDisciplineScreen_LeaveHistoryWithRejection` |
| AC-04-02 | TR-009 | INT-004 | UC-04 | `ParentDisciplineScreen_LeaveHistoryWithRejection` |
| AC-04-03 | TR-009 | INT-004 | UC-04 | `ParentDisciplineScreen_LeaveHistoryWithRejection` |
| AC-05-01 | TR-NFR-006, TR-012 | INT-001–004 | UC-05 | `ParentDisciplineScreen_Loading` |
| AC-05-02 | TR-012 | INT-001–004 | UC-05 | `ParentDisciplineScreen_ErrorState` |
| AC-05-03 | TR-012 | INT-001–004 | UC-05 | `ParentDisciplineScreen_ErrorState` |
| AC-05-04 | TR-006, TR-009, TR-012 | INT-003, INT-004 | UC-05 | `ParentDisciplineScreen_EmptyViolations` |
| AC-05-05 | TR-NFR-006 | — | UC-05 | `ParentDisciplineScreen_Loading` |
| AC-06-01 | TR-010 | — (RBAC, no API) | UC-06 | `ParentDisciplineScreen_ReadOnlyEnforcement` |
| AC-06-02 | TR-010 | — | UC-06 | `ParentDisciplineScreen_ReadOnlyEnforcement` |
| AC-06-03 | TR-011, TR-010 | INT-002–004 | UC-06 | `ParentDisciplineScreen_ErrorState` |
| AC-06-04 | TR-010 | — | UC-06 | `ParentDisciplineScreen_ReadOnlyEnforcement` |
| AC-07-01 | TR-006 | — | UC-07 | `ParentDisciplineScreen_ReadOnlyEnforcement` |
| AC-07-02 | TR-005, TR-007 | — | UC-07 | `ParentDisciplineScreen_ReadOnlyEnforcement` |
| AC-07-03 | TR-006 | — | UC-07 | `ParentDisciplineScreen_ReadOnlyEnforcement` |
| AC-07-04 | TR-009 | — | UC-07 | `ParentDisciplineScreen_ReadOnlyEnforcement` |
| AC-07-05 | TR-NFR-002 | — | UC-07 | `ParentDisciplineScreen_ReadOnlyEnforcement` |
| AC-07-06 | TR-NFR-003 | — | UC-07 | `ParentDisciplineScreen_ReadOnlyEnforcement` |

---

## 10. Handoff to FE

### What `fe-lead` should build

This is a **normal lane** story. The `ParentDisciplineScreen` is a **new client component** housed in `features/discipline/presentation/parent-discipline/` (feature-local, single screen). The `features/discipline` module already exists from US-E09.2; this story extends it with a parent-role variant.

**Pipeline recommended:**
1. `fe-planner` — phased plan: (a) domain extension + mock repo, (b) page RSC + route guard, (c) child selector + conduct card, (d) violation list, (e) leave form + history, (f) a11y audit + design-review gate.
2. `fe-component-architect` — component tree for `ParentDisciplineScreen`; verify no shared-component promotion needed (single screen → feature-local per component-organization.md).
3. `fe-state-engineer` — TanStack Query keys and invalidation strategy per Section 4.
4. `fe-nextjs-engineer` — TDD implementation; domain tests first, then infrastructure, then presentation + Storybook stories.
5. `fe-tech-lead-reviewer` + `fe-accessibility-auditor` — parallel gate (tokens-only, WCAG 2.1 AA, read-only constraint DOM-level verified).
6. `fe-qa-playwright` — Storybook interaction tests against the 10 required stories.

### Proof owed (TEST_MATRIX rows)

| Layer | Expected proof |
|---|---|
| Unit | `GetChildConductSummaryUseCase` (4 tests), `GetChildViolationsUseCase` (3), `GetChildLeaveRequestsUseCase` (3), `SubmitLeaveRequestUseCase` extended (6), `MockDisciplineRepository` child-scoped (7), conduct score boundary (3) = ~26 unit tests |
| Integration | `MockDisciplineRepository` child-scoped methods: c1/c2 conduct, c1/c2 violations, submit prepends to c1 list, cross-child isolation |
| Story / E2E | 10 Storybook stories with `play()` assertions covering all 35 AC items |
| a11y | `fe-accessibility-auditor` WCAG 2.1 AA pass; `/impeccable audit` pass (no blocking findings) |
| Design-review | `docs/DESIGN_REVIEW.md` gate passed; tokens-only confirmed; read-only enforcement verified at DOM level |

### Critical reminders for `fe-nextjs-engineer`

1. INT-005 is the **only write** — no other mutation endpoint is called.
2. `parentId` / `submittedBy` are **never sent** in request bodies.
3. The "Ghi nhận vi phạm" button must be **absent from the DOM** — not `display: none`.
4. Domain rule `score = 100 + sum(violation.points)` lives in the domain layer only.
5. No new i18n keys — reuse `discipline.studentConduct.*` from US-E09.2.
6. No new design tokens — all colors from `src/app/tokens.css`.
7. `MockDisciplineRepository` extension must key data by `childId` so child switching exercises different data per child.
8. OQ-5 (date format) and OQ-6 (`avatarColor`) are non-blocking for mock-first but must be resolved before real `core` wiring.
