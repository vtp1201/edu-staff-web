# Integration Map — US-E09.4 Parent Discipline & Leave View

Screen: `/parent/discipline`  
Role: `parent` only  
Generated: 2026-06-21

---

## 1. Integration Overview

| # | Name | Method + Path | Service | Status |
|---|------|---------------|---------|--------|
| INT-001 | Get Parent's Children List | `GET /core/api/v1/parent/children` | `core` | MOCK-FIRST |
| INT-002 | Get Child Conduct Summary | `GET /core/api/v1/discipline/children/:childId/conduct-summary` | `core` | MOCK-FIRST |
| INT-003 | Get Child Violations | `GET /core/api/v1/discipline/children/:childId/violations` | `core` | MOCK-FIRST |
| INT-004 | Get Child Leave Requests | `GET /core/api/v1/discipline/children/:childId/leave-requests` | `core` | MOCK-FIRST |
| INT-005 | Submit Leave Request for Child | `POST /core/api/v1/discipline/children/:childId/leave-requests` | `core` | MOCK-FIRST — THE ONLY WRITE |

**Endpoints count:** 5 (4 reads + 1 write)  
**Services touched:** `core` only  
**Real vs mock-first:** ALL 5 are mock-first — `core` service is not shipped (decision 0014)  
**Endpoint constant file to extend:** `src/bootstrap/endpoint/discipline.endpoint.ts` (add 5 new keys)

**Risk notes:**
- Child list source is architecturally ambiguous (see Open Questions § OQ-1). This map places it under `core` following the same pattern as US-E13.7 grades child-list. Until edu-api resolves the placement, the mock is the contract.
- INT-001 shares the same logical data as the child-list needed by US-E13.7 (grades). If edu-api later moves child enumeration to `iam`, both stories must update together. Flag this dependency to ba-lead for cross-story alignment.
- All 5 endpoints must have their mock shapes keyed by `childId` so child switching (AC2) exercises different data per child.

---

## 2. Endpoint Catalogue

---

### INT-001  Get Parent's Children List

```
Service: core                        Method+Path: GET /core/api/v1/parent/children
Status: MOCK-FIRST (core not built)
Protected: yes                       Role required: parent
```

**Request (outbound, camelCase):**

| Field | In | Meaning | Sensitivity |
|-------|----|---------|-------------|
| — | — | parentId is derived server-side from the Bearer token claim; no query param needed | — |

**Response payload (inbound, after envelope unwrap):**

```
{
  children: [
    {
      childId:    string   — unique child identifier, used as path param in INT-002–005
      name:       string   — child's full name (PII — display only, never sent back to BE)
      className:  string   — e.g. "11A2"
      avatar:     string   — initials, e.g. "NK"
      avatarColor: string  — hex/token, e.g. "#5D87FF" (for avatar background)
      gvcnName:   string   — homeroom teacher full name
    }
  ]
}
```

**Pagination:** none (a parent's children count is small, no cursor needed)

**Errors → UI behavior:**

| Code | Status | Mapped failure | UI behavior | Retryable? |
|------|--------|----------------|-------------|------------|
| `UNAUTHORIZED` | 401 | `forbidden` | Redirect to `/login` (interceptor handles token refresh first) | no |
| `FORBIDDEN` | 403 | `forbidden` | Show "Bạn không có quyền truy cập" toast; no retry | no |
| `PARENT_NOT_FOUND` | 404 | `not-found` | Inline error banner: "Không tìm thấy hồ sơ phụ huynh." | no |
| network / 5xx | 502–504 | `network-error` | Full-page error state with retry button | yes |

**Loading / empty expectation:**
- Loading: skeleton card strip (2 pill-shaped placeholders, width ~160px each).
- Empty (children array length = 0): show inline notice "Chưa có học sinh nào liên kết với tài khoản này." — the rest of the screen should not render.

---

### INT-002  Get Child Conduct Summary

```
Service: core                        Method+Path: GET /core/api/v1/discipline/children/:childId/conduct-summary
Status: MOCK-FIRST (core not built)
Protected: yes                       Role required: parent
```

**Request (outbound, camelCase):**

| Field | In | Meaning | Sensitivity |
|-------|----|---------|-------------|
| `childId` | path | Selected child's identifier from INT-001 response | — |

**Response payload (inbound, after envelope unwrap):**

```
{
  childId:         string   — echo; used to validate response is for the selected child
  score:           number   — conduct score 0–100
  grade:           "excellent" | "good" | "average" | "weak"
                            — maps to UI badge: excellent=success, good=primary, average=warning, weak=error
  violationsCount: number   — total violations this semester
  absences:        number   — unexcused absences
  semester:        string   — e.g. "HK1 2025–2026"
}
```

**Pagination:** none

**Errors → UI behavior:**

| Code | Status | Mapped failure | UI behavior | Retryable? |
|------|--------|----------------|-------------|------------|
| `CHILD_NOT_FOUND` | 404 | `not-found` | Inline: "Không tìm thấy dữ liệu hạnh kiểm." | no |
| `FORBIDDEN` | 403 | `forbidden` | Inline: "Bạn không có quyền xem dữ liệu này." | no |
| network / 5xx | 502–504 | `network-error` | Conduct card shows error state with retry | yes |

**Loading / empty expectation:**
- Loading: conduct card skeleton — rectangle 70×70 + two lines of text.
- Empty: grade returns with `score: 100, violationsCount: 0, absences: 0` (clean state) — no separate empty case; card always renders.

---

### INT-003  Get Child Violations

```
Service: core                        Method+Path: GET /core/api/v1/discipline/children/:childId/violations
Status: MOCK-FIRST (core not built)
Protected: yes                       Role required: parent
```

**Request (outbound, camelCase):**

| Field | In | Meaning | Sensitivity |
|-------|----|---------|-------------|
| `childId` | path | Selected child's identifier | — |
| `cursor` | query (optional) | Pagination cursor from previous response's `meta.pagination.nextCursor` | — |
| `limit` | query (optional) | Page size; default 20 | — |

**Response payload (inbound, after envelope unwrap — with `{ raw: true }` for pagination):**

```
{
  violations: [
    {
      id:          string   — unique violation ID
      date:        string   — display date, e.g. "21/04/2026" (dd/MM/yyyy)
      type:        string   — violation type key, e.g. "late" | "uniform" | "behavior" | "other"
      severity:    "low" | "medium" | "high"
                            — maps to badge: low=warning, medium=error, high=destructive
      description: string   — human-readable description
      handledBy:   string   — teacher/staff name who recorded this violation (PII — display only)
      pointsDeducted: number — points deducted for this violation (e.g. 5)
    }
  ]
}
```

**Pagination:** cursor (`nextCursor` / `hasMore`) — call with `{ raw: true }` then `parseEnvelope()` to read `meta.pagination`. Use `useInfiniteQuery` on the client if the list can grow long; for typical student (0–15 violations/semester), a single page of 20 is sufficient.

**Errors → UI behavior:**

| Code | Status | Mapped failure | UI behavior | Retryable? |
|------|--------|----------------|-------------|------------|
| `CHILD_NOT_FOUND` | 404 | `not-found` | Section shows "Không tìm thấy dữ liệu vi phạm." | no |
| `FORBIDDEN` | 403 | `forbidden` | Section shows "Không có quyền." | no |
| network / 5xx | 502–504 | `network-error` | Section error state with retry | yes |

**Loading / empty expectation:**
- Loading: 3-row skeleton (each row: small circle + two lines of text).
- Empty (`violations` array length = 0): "Con bạn chưa có vi phạm nào." — styled as a centered muted message inside the card. No action available to parent (read-only; no "record violation" CTA).

---

### INT-004  Get Child Leave Requests

```
Service: core                        Method+Path: GET /core/api/v1/discipline/children/:childId/leave-requests
Status: MOCK-FIRST (core not built)
Protected: yes                       Role required: parent
```

**Request (outbound, camelCase):**

| Field | In | Meaning | Sensitivity |
|-------|----|---------|-------------|
| `childId` | path | Selected child's identifier | — |
| `cursor` | query (optional) | Pagination cursor | — |
| `limit` | query (optional) | Page size; default 20 | — |

**Response payload (inbound, after envelope unwrap):**

```
{
  leaveRequests: [
    {
      id:             string   — unique leave request ID
      startDate:      string   — e.g. "12/03/2026" (dd/MM/yyyy)
      endDate:        string   — e.g. "12/03/2026" (same as startDate for 1-day leave)
      days:           number   — inclusive day count
      type:           "medical" | "personal" | "other"
      reason:         string   — leave reason text (PII — submitted by parent; display only)
      status:         "pending" | "approved" | "rejected"
      rejectedReason: string | null   — only present when status = "rejected"; teacher's rejection note
      approvedBy:     string | null   — teacher name who approved (PII — display only)
      submittedAt:    string   — submission timestamp, e.g. "11/03/2026 21:00"
    }
  ]
}
```

**Pagination:** cursor (`nextCursor` / `hasMore`) — same pattern as INT-003. A single page of 20 covers most use cases.

**Errors → UI behavior:**

| Code | Status | Mapped failure | UI behavior | Retryable? |
|------|--------|----------------|-------------|------------|
| `CHILD_NOT_FOUND` | 404 | `not-found` | Section: "Không tìm thấy lịch sử đơn nghỉ." | no |
| `FORBIDDEN` | 403 | `forbidden` | Section: "Không có quyền." | no |
| network / 5xx | 502–504 | `network-error` | Section error state with retry | yes |

**Loading / empty expectation:**
- Loading: 2-row skeleton inside leave history card.
- Empty (`leaveRequests` array length = 0): "Chưa có đơn xin nghỉ nào." centered inside the card.
- Rejected entry: must display `rejectedReason` in error-toned text below the reason field when `status === "rejected"` and `rejectedReason` is non-null.

---

### INT-005  Submit Leave Request for Child

> **THE ONLY WRITE OPERATION on this screen.**

```
Service: core                        Method+Path: POST /core/api/v1/discipline/children/:childId/leave-requests
Status: MOCK-FIRST (core not built)
Protected: yes                       Role required: parent
```

**Request (outbound, camelCase — JSON body):**

| Field | Type | Meaning | Validation (client-side before submit) |
|-------|------|---------|----------------------------------------|
| `childId` | string (path) | Scopes the request to the selected child; BE also validates against parent's children list | required |
| `startDate` | string | ISO 8601 date, e.g. `"2026-03-12"` | required; must be >= today (local date) |
| `endDate` | string | ISO 8601 date | optional; defaults to `startDate` if omitted; must be >= `startDate` |
| `type` | `"medical" \| "personal" \| "other"` | Leave category | required |
| `reason` | string | Plain-text justification | required; `reason.trim().length >= 10` |

Note: `parentId` / `submittedBy` are NOT sent in the body — BE derives them from the Bearer token claim. The FE must never include PII identity fields in the request body.

**Response payload (inbound, after envelope unwrap):**

```
{
  id:          string    — newly created leave request ID
  childId:     string    — echo
  startDate:   string    — echoed as dd/MM/yyyy
  endDate:     string    — echoed as dd/MM/yyyy
  days:        number    — inclusive day count computed by BE
  type:        string
  reason:      string
  status:      "pending" — ALWAYS "pending" on creation; parent cannot pre-approve
  submittedAt: string    — server timestamp
}
```

The newly created record is optimistically appended to the leave history list with `status: "pending"` immediately after a successful response, then the list is invalidated/refetched to ensure consistency.

**Parent cannot cancel after submission.** There is no `DELETE /discipline/children/:childId/leave-requests/:id` endpoint on this screen. The submitted record is read-only for the parent (only teacher/GVCN can approve or reject via their own screen).

**Pagination:** none (single-item creation response)

**Errors → UI behavior:**

| Code | Status | Mapped failure | UI behavior | Retryable? |
|------|--------|----------------|-------------|------------|
| `VALIDATION_ERROR` | 422 | `validation-error` | `error.fields[]` → per-field inline errors below each input (`aria-invalid` + `aria-describedby`) | no |
| `LEAVE_REQUEST_INVALID` | 422 | `validation-error` | Inline form-level error: "Ngày hoặc lý do không hợp lệ." | no |
| `CHILD_NOT_FOUND` | 404 | `not-found` | Toast error: "Không tìm thấy học sinh." — close form | no |
| `FORBIDDEN` | 403 | `forbidden` | Toast error: "Bạn không có quyền nộp đơn cho học sinh này." | no |
| `DUPLICATE_LEAVE_REQUEST` | 409 | `conflict` | Toast warning: "Đã có đơn nghỉ cho khoảng thời gian này." | no |
| network / 5xx | 502–504 | `network-error` | Submit button shows retry state; form stays open | yes (retryable=true from envelope) |

**Loading / empty expectation:**
- Submit button shows spinner + disabled state while `submitting = true`.
- On success: form closes; success banner "Đơn xin nghỉ cho [child name] đã gửi tới [GVCN name]." shown for ~3 seconds; leave history list refreshes.

---

## 3. Auth & Security

| Concern | Detail |
|---------|--------|
| Bearer token | All 5 endpoints are protected. Token is in httpOnly cookie; `createServerHttpClient()` reads it server-side. The FE never reads the token. |
| `parentId` scoping | BE derives the calling parent's identity from the JWT claim. The FE does NOT pass `parentId` in any request param or body — doing so would be a security risk. |
| `childId` validation | BE enforces that the requested `childId` belongs to the authenticated parent's children list. If the FE passes a `childId` for a different parent's child, BE returns `403 FORBIDDEN`. |
| Role gate | The `/parent/discipline` route must be protected at the RSC page level: if the session role is not `parent`, redirect to the appropriate dashboard before any API call is made. This prevents non-parents from ever reaching these endpoints. |
| PII fields | `name` (child), `gvcnName`, `handledBy`, `approvedBy`, `reason`, `submittedAt` — all are display-only; never written back to BE in other requests. Not stored in client-side state beyond the component lifecycle. |
| No client-side token | `accessToken` / `refreshToken` are in httpOnly cookies (decision 0018/0019). The presentation layer never sees them. |

---

## 4. Mock-First Plan

All 5 endpoints are mock-first. Extend `MockDisciplineRepository` (established in US-E09.2) with the following 5 child-scoped methods.

**Location:** `src/features/discipline/infrastructure/repositories/mock-discipline.repository.ts`

**Endpoint constants to add to `src/bootstrap/endpoint/discipline.endpoint.ts`:**

```
parentChildren:           "/core/api/v1/parent/children"
childConductSummary:      (childId) => `/core/api/v1/discipline/children/${childId}/conduct-summary`
childViolations:          (childId) => `/core/api/v1/discipline/children/${childId}/violations`
childLeaveRequests:       (childId) => `/core/api/v1/discipline/children/${childId}/leave-requests`
submitChildLeaveRequest:  (childId) => `/core/api/v1/discipline/children/${childId}/leave-requests`
```

**Mock seed shapes** (derived from `PARENT_CHILDREN_DISCIPLINE` at `design_src/edu/discipline.jsx` line 939):

### Children list mock (INT-001)

```js
{
  children: [
    { childId: "c1", name: "Nguyễn Minh Khoa", className: "11A2",
      avatar: "NK", avatarColor: "#5D87FF",
      gvcnName: "Nguyễn Thị Hương" },
    { childId: "c2", name: "Nguyễn Thu Hà", className: "8B1",
      avatar: "NH", avatarColor: "#13DEB9",
      gvcnName: "Trần Bích Vân" },
  ]
}
```

### Conduct summary mock (INT-002, keyed by childId)

```js
// childId = "c1"
{ childId: "c1", score: 82, grade: "good",
  violationsCount: 2, absences: 1, semester: "HK1 2025–2026" }

// childId = "c2"
{ childId: "c2", score: 94, grade: "excellent",
  violationsCount: 0, absences: 0, semester: "HK1 2025–2026" }
```

Grade mapping for badge color:
- `excellent` (≥90) → `success`
- `good` (≥70) → `primary`
- `average` (≥50) → `warning`
- `weak` (<50) → `error`

### Violations mock (INT-003, keyed by childId)

```js
// childId = "c1" — 2 violations
{ violations: [
    { id: "pc-k1", date: "21/04/2026", type: "late",
      severity: "low", description: "Muộn 10 phút tiết 1.",
      handledBy: "Nguyễn Thị Hương", pointsDeducted: 3 },
    { id: "pc-k2", date: "15/04/2026", type: "uniform",
      severity: "low", description: "Không đeo huy hiệu trường.",
      handledBy: "Phạm Quốc Bảo", pointsDeducted: 3 },
] }

// childId = "c2" — empty (excellent conduct)
{ violations: [] }
```

### Leave requests mock (INT-004, keyed by childId)

```js
// childId = "c1" — 1 approved leave
{ leaveRequests: [
    { id: "pl-k1", startDate: "12/03/2026", endDate: "12/03/2026", days: 1,
      type: "medical", reason: "Khám bệnh định kỳ tại bệnh viện Nhi.",
      status: "approved", rejectedReason: null,
      approvedBy: "Nguyễn Thị Hương", submittedAt: "11/03/2026 21:00" },
] }

// childId = "c2" — 1 approved leave + exercise rejected case
{ leaveRequests: [
    { id: "pl-h1", startDate: "05/02/2026", endDate: "06/02/2026", days: 2,
      type: "personal", reason: "Việc gia đình đột xuất — về quê.",
      status: "approved", rejectedReason: null,
      approvedBy: "Trần Bích Vân", submittedAt: "04/02/2026 19:30" },
] }
```

Add a rejected entry for Storybook `LeaveHistoryWithRejection` state:

```js
{ id: "pl-rejected-demo", startDate: "10/01/2026", endDate: "10/01/2026", days: 1,
  type: "other", reason: "Đi dự đám cưới họ hàng xa.",
  status: "rejected",
  rejectedReason: "Không đủ lý do hợp lệ theo quy định nhà trường.",
  approvedBy: null, submittedAt: "09/01/2026 18:00" }
```

### Submit leave request mock (INT-005)

Mock `submitLeaveForChild(childId, payload)` in `MockDisciplineRepository` should:
1. Validate `payload.startDate` is present and `payload.reason.trim().length >= 10` — throw mock `VALIDATION_ERROR` otherwise (exercises client-side validation flow).
2. Return a new leave object with `status: "pending"`, `id: \`pl-${childId}-${Date.now()}\``, computed `days` (inclusive), echoed fields.
3. Prepend the new object to the in-memory `leavesByChild[childId]` map so the list reflects it immediately.

**`NEXT_PUBLIC_USE_MOCK` flag:** when `NEXT_PUBLIC_USE_MOCK=true`, `discipline.di.ts` wires `MockDisciplineRepository` instead of the real `DisciplineRepository`. This flag is already established via decision 0014; extend its usage here.

---

## 5. Open Questions

**OQ-1 — Child list service placement (OPEN QUESTION)**
The `GET /parent/children` endpoint is proposed under `core` (following the enrollment/class context). However, a parent's children could equally be served by `iam` (user/member relationship). This same ambiguity was flagged for US-E13.7 (grades). Until edu-api confirms which service owns this data:
- Mock under `core` as `/core/api/v1/parent/children`.
- If edu-api assigns it to `iam`, the endpoint constant and repository move to `iam`; the mock shape stays the same.
- Flag to ba-lead for a cross-story ADR (≥0023) covering child-list ownership, shared by US-E09.4 and US-E13.7.

**OQ-2 — Shared child-list endpoint with US-E13.7 (OPEN QUESTION)**
US-E13.7 (Parent Grade View) needs the same child-list data. If both stories implement separate mock endpoints, they will drift on field names. Recommend ba-lead coordinate a single endpoint constant `PARENT_EP.children` that both E09.4 and E13.7 consume, rather than duplicating in `discipline.endpoint.ts` and `grades.endpoint.ts`.

**OQ-3 — Pagination for violations and leave requests (OPEN QUESTION)**
Story does not specify pagination requirements. For most students, 0–15 violations/semester fits in one page of 20. Proposal: implement with cursor pagination support in the repository interface (pass `cursor?` + `limit?`) but render as a flat list without "load more" in V1. If BE confirms pagination is required, `useInfiniteQuery` can be wired without changing the domain layer.

**OQ-4 — Leave request cancellation (OPEN QUESTION)**
Story and design notes both say "parent cannot cancel after submission." However, the product may later need a cancel flow (e.g., before teacher reviews). No `DELETE` or `PATCH status=cancelled` endpoint is included in this map. If cancellation is added in a future story, it requires a new endpoint and a `cancelled` status variant in the `LeaveRequest` entity.

**OQ-5 — Date format on wire (OPEN QUESTION)**
The mock data in `discipline.jsx` uses `dd/MM/yyyy` for display dates. The request body for INT-005 should use ISO 8601 (`YYYY-MM-DD`) to be consistent with REST conventions. BE must confirm: does the response return ISO 8601 dates (which the FE formats for display) or pre-formatted `dd/MM/yyyy` strings? This map assumes ISO 8601 on the wire; mock data uses pre-formatted strings for simplicity.

**OQ-6 — `avatarColor` field name (OPEN QUESTION)**
The mock uses `avatarColor` as a hex string. If BE returns a role-based color key instead (e.g., `"primary"`, `"success"`), the FE mapper must translate it to the design-system token. Confirm with BE whether the color is a raw hex or a semantic key.
