# US-E09.3 Staff Leave Management (Admin / Principal)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E12.1 (school setup — staff data), US-E12.9 (staffing UI — staff list)
- Blocks: none
- Feature module(s) cham: `src/features/staff-leave/` (new feature, separate from student discipline)
- Shared contract/file: `bootstrap/endpoint/staff-leave.endpoint.ts` (new)

## Product Contract

Admin / hieu truong xem va xu ly don nghi phep cua giao vien / nhan vien.
Man hinh `/admin/staff-leave`.

**Danh sach don nghi phep:**
- Bang: ten nhan vien, vai tro (GVBM/GVCN/...), bo mon, loai nghi (nam/benh/ca nhan/gia dinh), ngay bat dau, ngay ket thuc, so ngay, trang thai (cho duyet / da duyet / tu choi).
- Loc theo trang thai (Tat ca / Cho duyet / Da duyet / Tu choi).
- Loc theo bo mon (dropdown).
- Chi tiet don (expand row hoac side sheet): ly do day du, ngay nop, anh/file dinh kem (noi dung placeholder).

**Xu ly don:**
- Approve: click "Duyet" -> xac nhan -> trang thai -> "Da duyet" (success badge).
- Reject: click "Tu choi" -> dialog nhap ly do tu choi (bat buoc, min 10 chars) -> trang thai -> "Tu choi" (error badge) kem ly do.
- [ASSUMPTION] Sau khi duyet/tu choi, noti service gui thong bao cho nhan vien.

**Staff leave types:**
- annual (nghi phep nam), sick (nghi benh), personal (ca nhan/gia dinh), (event — tham su kien chuyen mon).

RBAC: Chi admin va principal (role co quyen BGH). Teacher khong vao man hinh nay.
Mock-first: BE core staff-leave endpoints chua ship.

## Relevant Product Docs

- `docs/product/screens.md` — Admin section (staff-leave row — new)
- `design_src/edu/discipline.jsx` — STAFF_LEAVE_REQUESTS mock data + StaffLeaveScreen (1506)
- `design_src/edu/staff-leave.jsx` — Dedicated StaffLeave screen (1506)
- Epic overview: `docs/stories/epics/E09-discipline-conduct/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (loading): Skeleton khi load danh sach don nghi phep nhan vien.
- AC-2 (list success): Bang hien thi dung: ten, vai tro, bo mon, loai nghi, ngay, so ngay, trang thai badge (pending=warning, approved=success, rejected=error).
- AC-3 (filter by status): Tab/pill filter (Tat ca / Cho duyet / Da duyet / Tu choi) loc danh sach chinh xac.
- AC-4 (approve): Click "Duyet" -> confirm dialog -> thanh cong -> trang thai chuyen "Da duyet"; toast xac nhan.
- AC-5 (reject): Click "Tu choi" -> dialog nhap ly do (bat buoc >= 10 ky tu) -> submit -> trang thai "Tu choi" kem ly do; toast xac nhan.
- AC-6 (empty state): Chua co don -> empty state co icon va mo ta phu hop.
- AC-7 (error state): API loi -> error banner co nut thu lai.
- AC-8 (RBAC): Chi admin/principal co quyen truy cap; teacher -> redirect 403/default route.
- AC-9 (a11y): Dialog co trap focus; reject reason input co label; WCAG AA contrast.
- AC-10 (i18n): Tat ca strings qua namespace `staffLeave`.

## Design Notes

- Route: `/admin/staff-leave`
- Design files: `design_src/edu/staff-leave.jsx` (primary); `design_src/edu/discipline.jsx` STAFF_LEAVE_REQUESTS section for mock data shape
- Commands: `approveStaffLeave`, `rejectStaffLeave`
- Queries: `getStaffLeaveRequests`
- API (mock-first — core service planned):
  - `GET  /core/api/v1/staff-leave-requests?status=&departmentId=`
  - `PUT  /core/api/v1/staff-leave-requests/:id/approve`
  - `PUT  /core/api/v1/staff-leave-requests/:id/reject`
- Domain rules: Reject reason required (min 10 chars); approved leave triggers noti to staff member (mock-first).
- UI surfaces: Table with status filter pills; ExpandableRow or SideSheet for detail; ApproveDialog; RejectDialog (with reason input)

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | approveStaffLeave use-case (ok/not-found/already-processed); rejectStaffLeave (ok/missing-reason) |
| Integration | StaffLeaveRepository mock (list, approve, reject with error-code mapping) |
| E2E | Storybook: Loading / Populated_PendingFilter / ApproveFlow / RejectFlow / EmptyState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E09.3 (planned)
- `docs/product/screens.md`: add Admin "Staff Leave Management" row

---

## State Architecture

Designed by `fe-state-engineer`. Pattern: **RSC-first with local client mutations** (same as discipline/staffing screens). No TanStack Query — mock-first server state, no remote cache needed.

---

### 1. State Architecture Summary

| Concern | Mechanism | Rationale |
|---|---|---|
| Initial list fetch | RSC async component → ViewModel prop | Single server render; no waterfall; no client bundle cost |
| Local mutations (approve/reject) | `useState` in `StaffLeaveScreen`, updated immediately | Mock-first; no BE yet; immediate local update = "optimistic" by default |
| Filter state (status, date range) | `useState` in `StaffLeaveScreen` | Not shareable/navigational for this admin screen; no URL needed |
| Derived stats + filtered list | `useMemo` | Computed from `requests` — no separate fetch |
| Inline reject UI | `useState` (`rejectingId`, `rejectReason`) | Local toggle/text; single active state at a time |
| Loading skeleton | `useState isLoading` (initial) | Controlled by RSC Suspense boundary on first load |
| Error banner | `useState errorState` | Set when Server Action returns failure |
| Toast notification | `useState toast` + `useEffect` auto-dismiss | Transient; 2600ms lifetime |
| Form validation (reject reason) | Inline `string.trim().length >= 10` check | Not a form — single textarea, no `react-hook-form` needed |
| Global store | NONE | Not needed; no cross-feature sharing |
| TanStack Query | NONE | No remote cache, no SSE, no polling required |

**Key decision:** The design source (`staff-leave.jsx`) shows rejection validation at 5 chars minimum but the story AC-5 specifies `>= 10 chars`. **The AC is authoritative.** The `rejectValid` guard must use `trim().length >= 10`.

---

### 2. State Inventory

| State item | Type | Owner | Shape | Reason |
|---|---|---|---|---|
| `requests` | Local (server-seeded) | `StaffLeaveScreen` | `StaffLeaveRequestEntity[]` | Master list; mutated locally on approve/reject |
| `statusFilter` | Local UI | `StaffLeaveScreen` | `'all' \| 'pending' \| 'approved' \| 'rejected'` | Status pill filter |
| `dateFrom` | Local UI | `StaffLeaveScreen` | `string` (ISO date `YYYY-MM-DD`, empty = no bound) | Date range lower bound for filter |
| `dateTo` | Local UI | `StaffLeaveScreen` | `string` (ISO date `YYYY-MM-DD`, empty = no bound) | Date range upper bound for filter |
| `rejectingId` | Local UI | `StaffLeaveScreen` | `string \| null` | Which card's inline rejection editor is open; null = none |
| `rejectReason` | Local form | `StaffLeaveScreen` | `string` | Textarea value for active rejection; reset on cancel/confirm |
| `isLoading` | Local UI | `StaffLeaveScreen` | `boolean` | Skeleton during initial data pass; also set `true` while Server Action is in-flight |
| `errorState` | Local UI | `StaffLeaveScreen` | `boolean` | Error banner (retry button reloads via `router.refresh()`) |
| `actionErrorKey` | Local UI | `StaffLeaveScreen` | `StaffLeaveFailure['type'] \| null` | Error key returned by a failed Server Action; translated at presentation to `staffLeave.errors.<key>` |
| `toast` | Local UI | `StaffLeaveScreen` | `{ message: string; variant: 'success' \| 'error' } \| null` | Transient feedback; cleared after 2600ms |
| `stats` | Derived (`useMemo`) | `StaffLeaveScreen` | `{ pending: number; approvedThisMonth: number; totalDaysThisMonth: number }` | Computed from full `requests` (not filtered) |
| `filtered` | Derived (`useMemo`) | `StaffLeaveScreen` | `StaffLeaveRequestEntity[]` | `requests` filtered by `statusFilter` + `dateFrom` + `dateTo` |
| `initialRequests` | Server (RSC prop) | `page.tsx` → `StaffLeaveScreen` | `StaffLeaveRequestEntity[]` | Fetched server-side via `makeGetStaffLeaveRequestsUseCase()`, passed as prop |

**ViewModel interface** (`staff-leave-screen.i-vm.ts`):

```ts
// features/staff-leave/presentation/staff-leave-screen/staff-leave-screen.i-vm.ts
export interface StaffLeaveScreenVM {
  initialRequests: StaffLeaveRequestEntity[];
  // Actions passed by page.tsx as Server Action refs:
  onApprove: (id: string) => Promise<ApproveStaffLeaveResult>;
  onReject: (id: string, reason: string) => Promise<RejectStaffLeaveResult>;
}

export type ApproveStaffLeaveResult =
  | { ok: true }
  | { ok: false; errorKey: StaffLeaveFailure['type'] };

export type RejectStaffLeaveResult =
  | { ok: true }
  | { ok: false; errorKey: StaffLeaveFailure['type'] };
```

**Entity shape** (`staff-leave-request.entity.ts`):

```ts
// features/staff-leave/domain/entities/staff-leave-request.entity.ts
export type StaffLeaveStatus = 'pending' | 'approved' | 'rejected';
export type StaffLeaveType   = 'annual' | 'sick' | 'personal' | 'family';

export interface StaffLeaveRequestEntity {
  id:          string;
  staff: {
    name:    string;
    role:    'teacher' | 'staff';
    dept:    string;
    avatar:  string; // initials
  };
  type:        StaffLeaveType;
  startDate:   string; // ISO date YYYY-MM-DD
  endDate:     string; // ISO date YYYY-MM-DD
  days:        number;
  reason:      string;
  submittedAt: string; // ISO datetime
  status:      StaffLeaveStatus;
  // Outcome fields — present after processing:
  approver?:   { name: string; role: string };
  approvedAt?: string;
  rejecter?:   { name: string; role: string };
  rejectedAt?: string;
  rejectReason?: string;
}
```

**Failure union** (`staff-leave.failure.ts`):

```ts
// features/staff-leave/domain/failures/staff-leave.failure.ts
export type StaffLeaveFailure =
  | { type: 'not-found' }
  | { type: 'already-processed' }  // request already approved or rejected
  | { type: 'missing-reason' }      // reject reason absent or < 10 chars
  | { type: 'unauthorized' }
  | { type: 'network-error' }
  | { type: 'unknown' };
```

---

### 3. State Flow

```
RSC page.tsx
  └─ await makeGetStaffLeaveRequestsUseCase().execute()
       └─ maps DTO → StaffLeaveRequestEntity[]
  └─ passes initialRequests + onApprove + onReject action refs
       → <StaffLeaveScreen vm={...} />

StaffLeaveScreen ('use client')
  ├─ useState(initialRequests) → requests
  ├─ useMemo(requests) → stats
  ├─ useMemo(requests, statusFilter, dateFrom, dateTo) → filtered
  │
  ├─ [User clicks "Phê duyệt" / "Approve"]
  │    setIsLoading(true)
  │    result = await vm.onApprove(id)          // Server Action
  │    if result.ok:
  │      setRequests(patch item to 'approved')
  │      setToast({ message: t('staffLeave.toast.approved'), variant: 'success' })
  │    else:
  │      setActionErrorKey(result.errorKey)
  │      setToast({ message: t(`staffLeave.errors.${result.errorKey}`), variant: 'error' })
  │    setIsLoading(false)
  │
  ├─ [User clicks "Từ chối" / "Reject"]
  │    setRejectingId(id)  ← opens inline editor
  │
  ├─ [User submits rejection reason (>= 10 chars)]
  │    setIsLoading(true)
  │    result = await vm.onReject(id, rejectReason)  // Server Action
  │    if result.ok:
  │      setRequests(patch item to 'rejected' + store rejectReason)
  │      setRejectingId(null)
  │      setRejectReason('')
  │      setToast({ message: t('staffLeave.toast.rejected'), variant: 'success' })
  │    else:
  │      setActionErrorKey(result.errorKey)
  │      setToast({ message: t(`staffLeave.errors.${result.errorKey}`), variant: 'error' })
  │    setIsLoading(false)
  │
  └─ [toast auto-dismiss via useEffect]
       useEffect: if toast, setTimeout(() => setToast(null), 2600)
       cleanup: clearTimeout on re-trigger or unmount

Server Action (actions.ts — 'use server')
  onApprove(id):
    uc = await makeApproveStaffLeaveUseCase()
    result = await uc.execute(id)
    if result.ok → return { ok: true }
    else         → return { ok: false, errorKey: result.failure.type }

  onReject(id, reason):
    if reason.trim().length < 10 → return { ok: false, errorKey: 'missing-reason' }
    uc = await makeRejectStaffLeaveUseCase()
    result = await uc.execute(id, reason)
    if result.ok → return { ok: false, errorKey: result.failure.type }
    else         → return { ok: false, errorKey: result.failure.type }
```

---

### 4. Query Key Hierarchy + Cache Policy

**No TanStack Query for this feature.** This is a mock-first, RSC-seeded screen. There is no client-side cache to manage.

When BE ships (core service), if real-time list refresh is needed, the upgrade path is:
- Replace `useState(initialRequests)` with `useQuery(staffLeaveKeys.list(filters))`
- Seed the cache from RSC via `initialData` or `dehydrate/HydrationBoundary`
- `approveStaffLeave` / `rejectStaffLeave` become `useMutation` with `onSettled: () => queryClient.invalidateQueries(staffLeaveKeys.lists())`

**Provisional key factory** (for future BE integration, not implemented now):

```ts
// Reference only — not wired until BE ships
export const staffLeaveKeys = {
  all:   () => ['staff-leave'] as const,
  lists: () => [...staffLeaveKeys.all(), 'list'] as const,
  list:  (params: StaffLeaveListParams) => [...staffLeaveKeys.lists(), params] as const,
  detail:(id: string) => [...staffLeaveKeys.all(), 'detail', id] as const,
} as const;
// staleTime: 60_000 (1 min) — moderate; admin view, not real-time critical
// gcTime:    300_000 (5 min)
```

---

### 5. Invalidation Map

Not applicable for current mock-first implementation (no query cache). Documented for future reference when BE ships:

| Trigger (mutation/event) | Keys invalidated |
|---|---|
| `approveStaffLeave(id)` | `staffLeaveKeys.lists()`, `staffLeaveKeys.detail(id)` |
| `rejectStaffLeave(id, reason)` | `staffLeaveKeys.lists()`, `staffLeaveKeys.detail(id)` |
| SSE `staff-leave.updated` (if realtime added) | `staffLeaveKeys.lists()` |

**Current mock-first strategy:** local `setRequests(patch)` replaces invalidation — the list stays accurate because no background refetch can overwrite it.

---

### 6. Mutations & Optimistic Strategy

**Pattern: local-first update (not true optimistic — no rollback needed in mock-first).**

Since there is no remote cache to roll back, mutations follow a simpler flow:

**`handleApprove(id)`**:
- `setIsLoading(true)`
- Call `vm.onApprove(id)` (Server Action)
- On `{ ok: true }`: patch `requests` item in-place to `{ status: 'approved', approver: {...}, approvedAt: now }`; show success toast
- On `{ ok: false }`: do NOT patch `requests`; show error toast with translated `errorKey`; set `actionErrorKey`
- `setIsLoading(false)` in both branches (effectively `finally`)

**`handleConfirmReject(id, reason)`**:
- Guard: `reason.trim().length < 10` → show inline validation hint, do not call Server Action
- `setIsLoading(true)`
- Call `vm.onReject(id, reason)` (Server Action)
- On `{ ok: true }`: patch `requests` item to `{ status: 'rejected', rejecter: {...}, rejectedAt: now, rejectReason: reason }`; clear `rejectingId` + `rejectReason`; show success toast
- On `{ ok: false }`: do NOT patch; show error toast; set `actionErrorKey`; leave inline editor open for correction
- `setIsLoading(false)` in both branches

**No snapshot/rollback needed** because requests are only patched after a confirmed `{ ok: true }` response.

**Future upgrade path to true optimistic** (when BE ships):
```
onMutate  → snapshot = queryClient.getQueryData(keys.list(...))
           → queryClient.setQueryData(keys.list(...), optimisticPatch)
onError   → queryClient.setQueryData(keys.list(...), snapshot)
onSettled → queryClient.invalidateQueries(keys.lists())
```

---

### 7. Async State Machine

#### Initial load (RSC Suspense)

| State | Trigger | UI treatment |
|---|---|---|
| `loading` | RSC Suspense boundary while awaiting use-case | `StaffLeaveScreenSkeleton` — 3 stat card skeletons + filter bar skeleton + 4 card-row skeletons |
| `error` | RSC throws / use-case returns failure | `errorState = true` → error banner with retry (calls `router.refresh()`) |
| `empty` | `requests.length === 0` after successful fetch | Empty state illustration + "No leave requests" copy (AC-6) |
| `success` | `requests.length > 0` | Full list renders |

#### Action in-flight (approve/reject)

| State | Trigger | UI treatment |
|---|---|---|
| `isLoading = true` | Server Action called | Disable approve/reject buttons on ALL cards (prevent double-submit) |
| action success | Server Action returns `{ ok: true }` | Item badge updates; success toast 2600ms |
| action error | Server Action returns `{ ok: false }` | Error toast with translated error key; item unchanged |
| `isLoading = false` | Both success and error paths | Buttons re-enabled |

#### Filtered empty

| State | Trigger | UI treatment |
|---|---|---|
| `filtered.length === 0` AND `requests.length > 0` | Active filters exclude all items | Filter-specific empty state: "No [status] leave requests" per AC-6 |

#### Error key → i18n mapping

All errors use namespace `staffLeave.errors.<key>`:

| `StaffLeaveFailure['type']` | i18n key | Default Vietnamese copy |
|---|---|---|
| `not-found` | `staffLeave.errors.not-found` | Đơn xin nghỉ không tồn tại |
| `already-processed` | `staffLeave.errors.already-processed` | Đơn đã được xử lý trước đó |
| `missing-reason` | `staffLeave.errors.missing-reason` | Lý do từ chối phải có ít nhất 10 ký tự |
| `unauthorized` | `staffLeave.errors.unauthorized` | Bạn không có quyền thực hiện thao tác này |
| `network-error` | `staffLeave.errors.network-error` | Lỗi kết nối, vui lòng thử lại |
| `unknown` | `staffLeave.errors.unknown` | Đã xảy ra lỗi, vui lòng thử lại |

Toast success messages:
- `staffLeave.toast.approved` → "Đã phê duyệt đơn nghỉ phép."
- `staffLeave.toast.rejected` → "Đã từ chối đơn nghỉ phép."

---

### 8. Race Conditions & Resolution

#### Race 1: Double-click on approve/reject button

- **Risk:** User clicks "Approve" twice before first Server Action completes → two concurrent calls for the same `id`.
- **Resolution:** Set `isLoading = true` on first click and disable ALL action buttons across ALL cards for the duration of the in-flight call. Since only one Server Action can be in-flight at a time (single `isLoading` gate), the second click is blocked.
- **No need** for per-item loading state — disabling all buttons is safer and simpler for mock-first.

#### Race 2: Approve and reject racing on the same item

- **Risk:** User opens inline reject editor (`rejectingId = id`), then somehow triggers approve on same card (e.g., keyboard shortcut).
- **Resolution:** When `rejectingId === req.id`, the "Phê duyệt" button is not rendered (design source confirms — action buttons are hidden while `isRejecting`). No race possible.

#### Race 3: Filter change while action is in-flight

- **Risk:** User changes `statusFilter` while a Server Action is executing → `filtered` recomputes mid-flight → card disappears from view before toast fires.
- **Resolution:** Acceptable UX for this pattern. The `requests` list is patched correctly regardless of the current filter. Toast still fires. The card simply leaves the visible set if the new filter excludes its updated status — this is correct behavior (e.g., approving a pending request causes it to disappear from the "pending" tab).

#### Race 4: `rejectReason` cleared before Server Action resolves

- **Risk:** `setRejectReason('')` called optimistically before `onReject` returns → if action fails, reason is lost.
- **Resolution:** Do NOT clear `rejectReason` until `{ ok: true }` is confirmed. On `{ ok: false }`, leave inline editor open with reason intact so user can correct and retry.

#### Race 5: Toast timer leak on unmount

- **Risk:** Component unmounts (navigation) while 2600ms timeout is pending → `setState` on unmounted component.
- **Resolution:** `useEffect` cleanup function must call `clearTimeout(tid)`. Use a `useRef` to hold the timeout id (not closure-captured variable) so the cleanup always cancels the latest timer.

---

### 9. RSC ↔ Client Boundary (explicit)

```
app/[locale]/(dashboard)/admin/staff-leave/
├── page.tsx          (RSC — server only)
│     await makeGetStaffLeaveRequestsUseCase().execute()
│     → maps to StaffLeaveRequestEntity[]
│     → import { approveStaffLeaveAction, rejectStaffLeaveAction } from './actions'
│     → renders <StaffLeaveScreen vm={{ initialRequests, onApprove, onReject }} />
│
├── actions.ts        ('use server')
│     approveStaffLeaveAction(id: string): Promise<ApproveStaffLeaveResult>
│     rejectStaffLeaveAction(id: string, reason: string): Promise<RejectStaffLeaveResult>
│     both call bootstrap/di/staff-leave.di.ts factories
│
└── (no loading.tsx needed — page handles skeleton via isLoading state in client component)

features/staff-leave/presentation/staff-leave-screen/
├── staff-leave-screen.i-vm.ts     (ViewModel interface — pure TS, safe both sides)
└── staff-leave-screen.tsx         ('use client' — receives VM props, owns all state)
```

**What crosses the RSC→client boundary:**
- `initialRequests: StaffLeaveRequestEntity[]` — serializable domain entity array (pure TS types, no class instances)
- `onApprove` / `onReject` — Server Action references (function refs, serialized by Next.js as POST action descriptors)

**What stays server-only:**
- HTTP client, repository, DI factory, `makeGetStaffLeaveRequestsUseCase`
- All imports from `bootstrap/di/` and `infrastructure/`

**No re-fetch after initial load.** If admin needs to see a fresh list after approve/reject by another admin session, they must manually refresh the page (`router.refresh()` or browser reload). This is acceptable for mock-first; real-time multi-admin sync is a post-BE concern.

---

### 10. Filter Logic (precise spec)

**Status filter** — exact match:
- `'all'`: include all items regardless of `status`
- `'pending' | 'approved' | 'rejected'`: include only items where `r.status === statusFilter`

**Date range filter** — on `startDate` (ISO `YYYY-MM-DD`):
- `dateFrom` set: include only items where `r.startDate >= dateFrom`
- `dateTo` set: include only items where `r.startDate <= dateTo`
- Both empty: no date filter applied
- Both filters composed with AND

**Note on date comparison:** The mock data stores `startDate` as `DD/MM/YYYY` (design source). The entity mapper MUST normalize to `YYYY-MM-DD` ISO strings so that lexicographic string comparison is valid for the date range filter. The `dateFrom`/`dateTo` inputs are `<input type="date">` which always yields `YYYY-MM-DD`.

**Count badges** on filter pills show count from full `requests` (not `filtered`) — same as design source `requests.filter(r => r.status === f).length`.

---

### 11. i18n Namespace Plan (`staffLeave`)

All UI strings go into `src/bootstrap/i18n/messages/{vi,en}.json` under the `staffLeave` namespace. Key groups:

```json
{
  "staffLeave": {
    "page": { "title": "...", "subtitle": "...", "breadcrumb": "..." },
    "stats": { "pending": "...", "approvedMonth": "...", "totalDays": "..." },
    "filter": { "all": "...", "pending": "...", "approved": "...", "rejected": "...", "dateFrom": "...", "dateTo": "...", "clear": "...", "showing": "..." },
    "card": { "submitted": "...", "reason": "...", "approvedBy": "...", "rejectedBy": "...", "days": "...", "showMore": "...", "showLess": "..." },
    "actions": { "approve": "...", "reject": "...", "cancel": "...", "confirmReject": "..." },
    "rejectEditor": { "label": "...", "placeholder": "...", "hint": "...", "ready": "..." },
    "leaveType": { "annual": "...", "sick": "...", "personal": "...", "family": "..." },
    "actorRole": { "teacher": "...", "staff": "..." },
    "status": { "pending": "...", "approved": "...", "rejected": "..." },
    "toast": { "approved": "...", "rejected": "..." },
    "errors": {
      "not-found": "...",
      "already-processed": "...",
      "missing-reason": "...",
      "unauthorized": "...",
      "network-error": "...",
      "unknown": "..."
    },
    "empty": { "all": "...", "pending": "...", "approved": "...", "rejected": "..." }
  }
}
```

Typed via `messages.d.ts` augment — `t("staffLeave.errors.not-found")` will fail build if key is missing.

---

## Component Architecture

> Authored by `fe-component-architect`. Design source: `design_src/edu/staff-leave.jsx`.

### 1. Architecture Summary

**Feature scope:** A new standalone screen (`/admin/staff-leave`) for Admin/Principal to view and process staff leave requests. The screen is mock-first (no real API) and fully i18n-covered under the `staffLeave` namespace.

**Reuse scan results:**

| Component | Status | Canonical home |
|---|---|---|
| `StatCard` (default variant) | REUSE — confirmed `components/shared/stat-card/` | — |
| `StatusBadge` | REUSE — confirmed `components/shared/status-badge/` | — |
| `Badge` (ui primitive) | REUSE — confirmed `components/ui/badge/` | — |
| `Button` (ui primitive) | REUSE — confirmed `components/ui/button/` | — |
| `Textarea` (ui primitive) | REUSE — confirmed `components/ui/textarea/` | — |
| `Avatar` + `AvatarFallback` | REUSE — confirmed `components/ui/avatar/` | — |
| `Sonner` (toast) | REUSE — confirmed `components/ui/sonner/`; use `toast()` from `sonner` pkg | — |
| `StaffLeaveScreen` | NEW — single-screen container | `features/staff-leave/presentation/staff-leave-screen/` |
| `StaffLeaveFilterBar` | NEW — single-screen | same folder |
| `LeaveRequestCard` | NEW — single-screen | same folder |
| `LeaveRejectPanel` | NEW — inline inside `leave-request-card.tsx` | same folder |
| `LeaveEmptyState` | NEW — single-screen | same folder |

**Missing primitives (requires `bun ui:add`):** None. All needed shadcn/ui primitives are already installed.

**Key design decisions:**
- The design source uses a CARD layout, not a table. Each `LeaveRequestCard` has a 4px left accent bar whose color matches request status. This is NOT a `Sidebar`-style active item — it is a `position: absolute` decorative strip (`aria-hidden`).
- `StaffLeaveFilterBar` wraps both the status-pill row AND the date-range row in a single card component. Splitting them would over-fragment tightly coupled filter state.
- Inline reject (`LeaveRejectPanel`) renders INSIDE the card, not in a Dialog/Sheet. AC-9 says "dialog co trap focus" — interpreted as requiring focus management within the panel, NOT a modal dialog. The inline panel uses `autoFocus` on the Textarea and returns focus to the reject button on close.
- Approve is a direct click with no confirmation dialog (design source confirms; the story AC-4 says "confirm dialog" but the design source, which is normative per decision 0011, shows direct click → toast). Flag to fe-lead at design-review gate.
- The design source validates reject reason at `>= 5 chars`; AC-5 specifies `>= 10 chars`. AC-5 wins (`minLength = 10`).
- Toast feedback uses the `toast()` function from the `sonner` package (already wired in layout via `<Sonner />`), not a custom toast `useState` — this supersedes the `fe-state-engineer` approach of `useState toast`. The `Sonner` primitive is already present; no new state needed for toast.

---

### 2. Component Tree

```
app/[locale]/(dashboard)/admin/staff-leave/
├── page.tsx                              [RSC — builds VM, renders StaffLeaveScreen]
└── actions.ts                            ['use server' — approveStaffLeave, rejectStaffLeave]

features/staff-leave/presentation/staff-leave-screen/
├── staff-leave-screen.i-vm.ts            [ViewModel interface]
├── staff-leave-screen.tsx                ['use client' — StaffLeaveScreen CONTAINER]
│   └── StaffLeaveScreen
│       Internal state (see §4):
│         requests, statusFilter, dateFrom, dateTo, rejectingId, rejectDraft, isLoading
│       Derived (useMemo):
│         stats (pending, approvedMo, totalDaysMo)
│         filtered (requests after filters applied)
│
│       Renders:
│       ├── <PageHeader />               [PRESENTATIONAL — inline, no separate file]
│       │     icon box (CalendarX lucide) + h1 + subtitle p + ADMIN·BGH StatusBadge
│       │
│       ├── <StatsRow />                 [PRESENTATIONAL — inline, no separate file]
│       │     3× StatCard (default variant, shared):
│       │       StatCard tone="warning" icon=Clock  label=staffLeave.stats.pending  value={stats.pending}
│       │       StatCard tone="success" icon=Check  label=staffLeave.stats.approvedMonth value={stats.approvedMo}
│       │       StatCard tone="info"    icon=Calendar label=staffLeave.stats.totalDays value={stats.totalDaysMo}
│       │
│       ├── <StaffLeaveFilterBar />      [PRESENTATIONAL — separate file]
│       │     Props: StaffLeaveFilterBarProps
│       │     Renders:
│       │       - 4 status pill <button aria-pressed> (all/pending/approved/rejected)
│       │         each pill: icon + label i18n key + count <span>
│       │       - Date-range row (dashed top border):
│       │           <label><span>FROM</span><input type="date" /></label>
│       │           arrow separator
│       │           <label><span>TO</span><input type="date" /></label>
│       │           conditional "Clear" <button>
│       │           "Showing X / N requests" summary <span>
│       │
│       ├── {filtered.length === 0}
│       │   └── <LeaveEmptyState />      [PRESENTATIONAL — separate file]
│       │         Props: LeaveEmptyStateProps
│       │         Renders: CalendarX icon + status-aware heading + subtext
│       │
│       └── {filtered.map(req =>)}
│           └── <LeaveRequestCard />    [PRESENTATIONAL — separate file]
│                 Internal state: expanded: boolean (reason truncation toggle)
│                 Props: LeaveRequestCardProps
│                 Renders:
│                   - Left accent bar div (aria-hidden, status color)
│                   - Avatar (AvatarFallback initials, bg tone from staff.avatarTone)
│                   - Header row:
│                       staff name span
│                       StatusBadge (actor role: teacher=primary / staff=muted)
│                       StatusBadge (leave type tone — see §5)
│                       dept text
│                   - Date range + days chip (bg-muted, border-border, monospace dates)
│                   - Reason block (bg-muted left-border accent, truncated)
│                       expand/collapse <button aria-expanded aria-controls="reason-{id}">
│                   - Audit footnote (conditional):
│                       approved: check icon + approver name + approvedAt
│                       rejected: x icon + rejecter name + rejectedAt + rejectReason block
│                   - Right column:
│                       StatusBadge (status: pending=warning / approved=success / rejected=error)
│                       submittedAt timestamp
│                       [pending only, not isRejectingOpen]:
│                         "Từ chối" Button (variant=outline, error-toned)
│                         "Phê duyệt" Button (variant=default, success-toned via className)
│                   - <LeaveRejectPanel />  [PRESENTATIONAL — inline in card file]
│                       Conditionally rendered when isRejectingOpen === true
│                       Textarea autoFocus, aria-label, aria-describedby
│                       char-count hint span (aria-live="polite")
│                       Cancel Button (variant=ghost)
│                       Confirm Button (variant=destructive, disabled until minLength met)
│
└── staff-leave-screen.stories.tsx        [Storybook — 8 stories, see §7]
```

---

### 3. ViewModel + Prop Interfaces

**Note:** The `fe-state-engineer` has already produced the ViewModel interface in the State Architecture section above. The canonical definition is:

```ts
// features/staff-leave/presentation/staff-leave-screen/staff-leave-screen.i-vm.ts

import type { StaffLeaveRequestEntity } from '../../domain/entities/staff-leave-request.entity';
import type { StaffLeaveFailure } from '../../domain/failures/staff-leave.failure';

export type ApproveStaffLeaveResult =
  | { ok: true }
  | { ok: false; errorKey: StaffLeaveFailure['type'] };

export type RejectStaffLeaveResult =
  | { ok: true }
  | { ok: false; errorKey: StaffLeaveFailure['type'] };

export interface StaffLeaveScreenVM {
  /** Full unfiltered list from RSC. StaffLeaveScreen seeds its useState with this. */
  initialRequests: StaffLeaveRequestEntity[];
  /** Server Action ref — approve a pending leave request. */
  onApprove: (id: string) => Promise<ApproveStaffLeaveResult>;
  /** Server Action ref — reject with mandatory reason (>= 10 chars). */
  onReject: (id: string, reason: string) => Promise<RejectStaffLeaveResult>;
  /**
   * True when RSC is streaming (Suspense skeleton). Storybook uses this for Loading story.
   * Default: false (data ready on page render).
   */
  isLoading?: boolean;
  /** Stable error key from failed RSC fetch. Presentation translates via staffLeave.errors.<key>. */
  loadErrorKey?: StaffLeaveFailure['type'];
  /** Retry callback (typically router.refresh()). */
  onRetry?: () => void;
}
```

**Sub-component prop interfaces:**

```ts
// ── StaffLeaveFilterBar ──────────────────────────────────────────────────────

import type { LeaveStatus } from '../../domain/entities/staff-leave-request.entity';

export type LeaveStatusFilter = LeaveStatus | 'all';

export interface FilterPillConfig {
  value: LeaveStatusFilter;
  /** i18n key: e.g. 'staffLeave.filter.all' */
  labelKey: string;
  /** Count from full (unfiltered) requests list. */
  count: number;
  /**
   * Tone for active state coloring — maps to StatusBadge tones for visual consistency.
   * null for 'all' (uses primary).
   */
  activeTone: 'primary' | 'warning' | 'success' | 'error';
}

export interface StaffLeaveFilterBarProps {
  pills: FilterPillConfig[];
  activeFilter: LeaveStatusFilter;
  onFilterChange: (filter: LeaveStatusFilter) => void;
  dateFrom: string;       // ISO YYYY-MM-DD or ''
  dateTo: string;         // ISO YYYY-MM-DD or ''
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearDates: () => void;
  /** Total unfiltered count — for "Showing X / N" summary. */
  totalCount: number;
  filteredCount: number;
}

// ── LeaveRequestCard ─────────────────────────────────────────────────────────

export interface LeaveRequestCardProps {
  request: StaffLeaveRequestEntity;
  /** True when THIS card's inline reject panel should be open. */
  isRejectingOpen: boolean;
  /** Current reject-reason textarea value (controlled from StaffLeaveScreen). */
  rejectDraft: string;
  onRejectDraftChange: (value: string) => void;
  /** Called when "Phê duyệt" is clicked — no confirmation dialog. */
  onApprove: () => void;
  /** Called when "Từ chối" is clicked — opens the inline panel. */
  onStartReject: () => void;
  /** Called when "Xác nhận từ chối" is clicked — only enabled if draft >= minLength. */
  onConfirmReject: () => void;
  /** Called when "Huỷ" is clicked — closes panel, clears draft. */
  onCancelReject: () => void;
  /** Whether any action is currently in-flight (disables buttons). */
  isActionLoading?: boolean;
}

// ── LeaveRejectPanel (inline, inside leave-request-card.tsx) ─────────────────

export interface LeaveRejectPanelProps {
  cardId: string;           // Used for aria-describedby id scoping
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  /** Default: 10 (AC-5). */
  minLength?: number;
  isSubmitting?: boolean;
}

// ── LeaveEmptyState ──────────────────────────────────────────────────────────

export interface LeaveEmptyStateProps {
  /** Active status filter — drives status-specific copy variant. */
  statusFilter: LeaveStatusFilter;
}

// ── StatsRow (inline, inside staff-leave-screen.tsx) ────────────────────────

interface StatsRowProps {
  pending: number;
  approvedMo: number;
  totalDaysMo: number;
}

// ── PageHeader (inline, inside staff-leave-screen.tsx) ──────────────────────

interface PageHeaderProps {
  // No props — all copy from useTranslations('staffLeave') inside component.
  // ADMIN·BGH badge is hardcoded role indicator (not user-role-gated UI — the
  // entire page is already role-gated at the route level).
}
```

---

### 4. State Ownership

The `fe-state-engineer` section above is authoritative. This section maps state to the component tree.

#### Controlled props (all owned by `StaffLeaveScreen`, passed down)

| State | Passed to | As prop |
|---|---|---|
| `statusFilter` | `StaffLeaveFilterBar` | `activeFilter` |
| `dateFrom` / `dateTo` | `StaffLeaveFilterBar` | `dateFrom` / `dateTo` |
| pills config (derived) | `StaffLeaveFilterBar` | `pills` |
| `rejectingId` | each `LeaveRequestCard` | `isRejectingOpen={rejectingId === req.id}` |
| `rejectDraft` | the active `LeaveRequestCard` | `rejectDraft` |
| `isLoading` | each `LeaveRequestCard` | `isActionLoading` |
| `statusFilter` | `LeaveEmptyState` | `statusFilter` |

#### Internal UI state (per-component, not lifted)

| State | Owner component | Notes |
|---|---|---|
| `expanded: boolean` | `LeaveRequestCard` | Reason text truncation toggle; no parent needs to know |

#### Hand-off note to `fe-state-engineer`

The `fe-state-engineer` section already captures the full state machine. One coordination point: the design source uses a custom `useState toast` + `setTimeout` for toast feedback. **This architecture recommends using `toast()` from the `sonner` package instead** (the `<Sonner />` provider is already in the dashboard layout). This removes one `useState` from `StaffLeaveScreen` and eliminates the `useEffect` timer-leak risk documented in Race 5. The state engineer should confirm this and update the state flow in §3 of their section accordingly.

---

### 5. Composition & Variant Strategy

#### StatCard tones (default variant — no change to shared component needed)

| Stat card | Tone | Lucide icon |
|---|---|---|
| Pending count | `warning` | `Clock` |
| Approved this month | `success` | `Check` |
| Total leave days | `info` | `Calendar` |

#### StatusBadge usage (no new tones — all within existing `StatusTone` union)

| Context | Tone | Condition |
|---|---|---|
| Leave status: pending | `warning` | `request.status === 'pending'` |
| Leave status: approved | `success` | `request.status === 'approved'` |
| Leave status: rejected | `error` | `request.status === 'rejected'` |
| Actor role: teacher | `primary` | `request.staff.role === 'teacher'` |
| Actor role: staff | `muted` | `request.staff.role === 'staff'` |
| Leave type: annual | `primary` | `request.type === 'annual'` |
| Leave type: sick | `warning` | `request.type === 'sick'` |
| Leave type: personal | `muted` | `request.type === 'personal'` |
| Leave type: family | `purple` | `request.type === 'family'` |

Define a `LEAVE_STATUS_TONE`, `ACTOR_ROLE_TONE`, and `LEAVE_TYPE_TONE` const map in the card file — each maps a union literal to a `StatusTone`. No dynamic string interpolation into `t()`.

#### Left accent bar

A `<div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 rounded-l-[var(--edu-radius-card)]" />` with a static class map:

```ts
const ACCENT_CLASS: Record<LeaveStatus, string> = {
  pending:  'bg-edu-warning',
  approved: 'bg-edu-success',
  rejected: 'bg-edu-error',
};
```

No `cva` needed — three fixed cases, no defaultVariants composition.

#### Filter pill buttons

Plain `<button>` with a computed className using `cn()`:
- Base: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold`
- Active: `border-{tone} bg-{tone}/15 text-{tone}` (via static class map keyed by `activeTone`)
- Inactive: `border-border bg-transparent text-muted-foreground`

No `cva` — four fixed status values make a simple `cn()` condition sufficient.

#### `cva` opportunities

None identified for this feature. All styling decisions are fixed-case maps, not open-ended variant systems. Do not introduce `cva` unless a component genuinely needs ≥3 orthogonal variant axes.

#### Promotion policy

All four new components (`StaffLeaveFilterBar`, `LeaveRequestCard`, `LeaveEmptyState`, `LeaveRejectPanel`) are single-screen. If a second admin screen ever needs a card-with-accent-bar pattern or a filter-pill group, promote `LeaveRequestCard` / `StaffLeaveFilterBar` to `components/shared/` at that time. Do NOT copy them to the new feature.

---

### 6. Accessibility Contract

| Interactive node | Required a11y |
|---|---|
| Filter pill buttons | `<button aria-pressed={isActive}>` + visible focus ring (`focus-visible:ring-[3px] focus-visible:ring-ring/50` from Button base or explicit); keyboard Space/Enter |
| "Clear dates" button | `<button>` with text label from `t('staffLeave.filter.clear')` (visible text = accessible name; no `aria-label` override needed) |
| "Phê duyệt" button | `aria-label={t('staffLeave.actions.approveFor', { name: request.staff.name })}` so SR reads "Phê duyệt — Nguyễn Thị Hương" not just "Phê duyệt" (multiple cards on screen) |
| "Từ chối" button | `aria-label={t('staffLeave.actions.rejectFor', { name: request.staff.name })}` same reason |
| Reject reason Textarea | `id="reject-reason-{id}"`, `aria-label={t('staffLeave.rejectEditor.label')}`, `aria-required="true"`, `aria-describedby="reject-hint-{id}"` |
| Char-count hint span | `id="reject-hint-{id}"`, `aria-live="polite"` — announces "Minimum 10 characters" / "Ready to send" on change |
| "Xác nhận từ chối" button | `disabled={!isValid}` (native disabled); also `aria-disabled="true"` when disabled for AT that reads aria-disabled on already-focused elements |
| "Expand reason" toggle | `<button aria-expanded={expanded} aria-controls="reason-text-{id}">` + `id="reason-text-{id}"` on the text container |
| Reason text container | `id="reason-text-{id}"` to pair with aria-controls above |
| Left accent bar | `aria-hidden="true"` — purely decorative |
| Avatar initials | `<AvatarFallback aria-hidden="true">` — staff name in adjacent text is the label |
| Date inputs | Each wrapped in explicit `<label htmlFor="date-from-{n}">` / `<label htmlFor="date-to-{n}">` with visible span label (not `aria-label` alone, per WCAG 1.3.1) |
| Date range label section | The "Start-date range" uppercase label is a visible `<span>` accompanying both inputs — mark it with `aria-hidden="true"` if it has no `for` attribute to avoid confusing SR; the individual input `<label>` elements provide the association |
| Error banner (loadError) | `role="alert"` on the container; retry `<Button>` with `t('staffLeave.errors.retry')` visible label |
| Loading skeletons | `aria-busy="true"` on the list container; each skeleton `div` is `aria-hidden="true"` |
| Card as a whole | No `role="article"` needed — cards are not independent content atoms. Plain `<div>` with border is sufficient. |
| StatusBadge (status) | Static display — no `role="status"` (not a live region). SR reads badge text inline with surrounding content. |
| ADMIN·BGH badge in header | `aria-hidden="true"` acceptable if heading already communicates the page is admin-only; or keep as visible text with `StatusBadge` so SR reads it. |

**Focus management for `LeaveRejectPanel`:**
- When panel opens (`isRejectingOpen` becomes true): `<Textarea autoFocus />` receives focus automatically.
- When panel closes (cancel or confirm): focus must return to the "Từ chối" button that triggered it. Implement via `useRef<HTMLButtonElement>` on the reject trigger button; call `rejectTriggerRef.current?.focus()` in `onCancelReject` and after successful `onConfirmReject`.

**Keyboard trap:** The panel is inline (not a modal). No `FocusTrap` component needed. Tab order continues naturally. User can Tab past the panel — this is correct for an inline editor pattern.

**Motion:** Any CSS transition on the panel expand (e.g., `max-height` animation) MUST be gated behind `motion-safe:` Tailwind prefix. The design source `sl-reject-in` keyframe is a prototype artifact — use `motion-safe:animate-in motion-safe:fade-in` (Tailwind v4 animate utilities) or omit animation entirely (plain conditional render is acceptable).

**Contrast:** All token usage in §5 maps to WCAG-compliant classes from `StatusBadge`'s `TONE_CLASS` map — these were audited in decision 0027. The left accent bar is decorative (not carrying information alone; text labels carry status).

---

### 7. Storybook Stories Required

File: `src/features/staff-leave/presentation/staff-leave-screen/staff-leave-screen.stories.tsx`

| Story name | VM / args | What to verify |
|---|---|---|
| `Loading` | `isLoading: true`, `initialRequests: []` | 3 stat card skeletons + filter bar skeleton + card-row skeletons visible |
| `EmptyState_All` | `initialRequests: []` | Empty state icon + "Không có đơn xin nghỉ nào" + subtext |
| `EmptyState_Pending` | `initialRequests` has only approved items; default filter | Story sets `statusFilter` to `'pending'` via play function or args; verifies filter-specific copy |
| `AllRequests` | Full seed (8 items, mixed statuses) | All cards render; stat counts correct; filter pills show correct counts |
| `FilteredPending` | Same seed, story play sets filter to `'pending'` | Only pending cards visible; count badge correct |
| `ApproveFlow` | One pending request; `onApprove` is `fn()` → returns `{ ok: true }` | Click "Phê duyệt" → card status badge changes to approved; toast fires |
| `RejectFlow_Inline` | One pending request; `onReject` is `fn()` → returns `{ ok: true }` | Click "Từ chối" → panel expands with Textarea focused; type < 10 chars → confirm disabled; type ≥ 10 → confirm enabled; click confirm → card status changes to rejected; panel closes |
| `ErrorState` | `loadErrorKey: 'network-error'`, `onRetry: fn()` | Error banner visible; retry button calls `onRetry`; no list rendered |

---

### 8. File Map

```
src/
├── app/[locale]/(dashboard)/admin/staff-leave/
│   ├── page.tsx                                          (RSC)
│   └── actions.ts                                        ('use server')
│
├── features/staff-leave/
│   ├── domain/
│   │   ├── entities/staff-leave-request.entity.ts
│   │   ├── failures/staff-leave.failure.ts
│   │   ├── repositories/i-staff-leave.repository.ts
│   │   └── use-cases/
│   │       ├── get-staff-leave-requests.use-case.ts
│   │       ├── approve-staff-leave.use-case.ts
│   │       └── reject-staff-leave.use-case.ts
│   ├── infrastructure/
│   │   ├── dtos/staff-leave-request-response.dto.ts
│   │   ├── mappers/staff-leave-request.mapper.ts
│   │   └── repositories/staff-leave.repository.ts
│   └── presentation/
│       └── staff-leave-screen/
│           ├── staff-leave-screen.i-vm.ts                (ViewModel — RSC↔client contract)
│           ├── staff-leave-screen.tsx                    ('use client' — StaffLeaveScreen container)
│           ├── staff-leave-filter-bar.tsx                (StaffLeaveFilterBar presentational)
│           ├── leave-request-card.tsx                    (LeaveRequestCard + LeaveRejectPanel inline)
│           ├── leave-empty-state.tsx                     (LeaveEmptyState presentational)
│           └── staff-leave-screen.stories.tsx
│
└── bootstrap/
    ├── endpoint/staff-leave.endpoint.ts                  (STAFF_LEAVE_EP constants)
    └── di/staff-leave.di.ts                              ('server-only' factories)
```

---

## Plan

> Authored by `fe-planner`. Grounded in repo reality: staffing DI pattern, mock.ts, nav-config.ts type-derived key, existing test patterns from auth use-cases.

### 1. Summary

Feature: Staff Leave Management — admin views, filters, approves, and inline-rejects staff leave requests.
Lane: normal. Screen: `/admin/staff-leave` (new route — already covered by `/admin/*` layout guard `evaluateAdminAccess`).
Done = all 10 AC green, Storybook interaction proof for ApproveFlow + RejectFlow, design-review gate passed, `bun build` + `tsc --noEmit` clean.

Normative design: `design_src/edu/staff-leave.jsx`. State architecture: `fe-state-engineer` §1–§11 above. Component contracts: `fe-component-architect` above. This section provides the phased implementation breakdown for `fe-nextjs-engineer`.

Key decisions already established:
- Mock-first (`USE_MOCK` from `bootstrap/lib/mock.ts`); real repo stubs `network-error` until core ships.
- Inline reject (no modal) — design is normative (decision `0011`). AC-4 "confirm dialog" + AC-5/AC-9 "dialog" conflict with design. **fe-lead to resolve; plan follows design.**
- Reject validation: `>= 10 chars` (AC-5 overrides design prototype's 5-char hint).
- `StatCard`, `StatusBadge`, `Badge`, `Button` reused from existing `components/shared/` + `components/ui/` (confirmed by `fe-component-architect` reuse scan above).
- `AvatarInitials` — component-architect notes it does not exist; create as `StaffLeaveAvatarInitials` in `features/staff-leave/presentation/staff-leave-screen/` initially (promote to `components/shared/` when a second feature needs it — decision `0026`).

### 2. Phased breakdown

---

#### Phase 1 — Domain layer (TDD: red → green)

Goal: Pure TypeScript domain. Zero framework deps. Tests written **before** any implementation file.

**Files to create:**

```
src/features/staff-leave/domain/
  entities/
    staff-leave-request.entity.ts
  failures/
    staff-leave.failure.ts
  repositories/
    i-staff-leave.repository.ts
  use-cases/
    result.ts
    get-staff-leave-requests.use-case.ts
    approve-staff-leave.use-case.ts
    reject-staff-leave.use-case.ts
    get-staff-leave-requests.use-case.test.ts     [RED FIRST]
    approve-staff-leave.use-case.test.ts          [RED FIRST]
    reject-staff-leave.use-case.test.ts           [RED FIRST]
```

**Entity (`staff-leave-request.entity.ts`)** — shape from state engineer §2:
```
StaffLeaveStatus: 'pending' | 'approved' | 'rejected'
StaffLeaveType:   'annual' | 'sick' | 'personal' | 'family'

StaffLeaveRequest:
  id, staff: { name, role: 'teacher'|'staff', dept, avatar (initials) },
  type, startDate (ISO YYYY-MM-DD), endDate (ISO YYYY-MM-DD), days,
  reason, submittedAt (ISO datetime), status,
  approver?: { name, role }, approvedAt?,
  rejecter?: { name, role }, rejectedAt?, rejectionReason?
```
Note: ISO dates required so date-range filter uses lexicographic string comparison correctly.

**Failure union (`staff-leave.failure.ts`):**
```
| { type: 'not-found' }
| { type: 'already-processed' }
| { type: 'missing-reason' }
| { type: 'forbidden' }
| { type: 'network-error' }
| { type: 'unknown' }
```
Keys match `staffLeave.errors.*` i18n leaves exactly (typed key check at build time).

**Repository interface (`i-staff-leave.repository.ts`):**
```ts
listRequests(filter?: {
  status?: StaffLeaveStatus;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Result<StaffLeaveRequest[], StaffLeaveFailure>>
approveRequest(id: string): Promise<Result<StaffLeaveRequest, StaffLeaveFailure>>
rejectRequest(id: string, reason: string): Promise<Result<StaffLeaveRequest, StaffLeaveFailure>>
```

**`result.ts`:** Copy `ok`/`fail` helpers + `Result<T,E>` type from `src/features/admin/staffing/domain/use-cases/result.ts` (exact same pattern).

**Use-case logic:**
- `GetStaffLeaveRequestsUseCase.execute(filter?)` — delegates to repo; no validation.
- `ApproveStaffLeaveUseCase.execute(id)` — delegates to repo; repo handles `not-found` / `already-processed`.
- `RejectStaffLeaveUseCase.execute(id, reason)`:
  - `reason.trim().length < 10` → `fail({ type: 'missing-reason' })` without calling repo.
  - else → repo.rejectRequest(id, reason).

**Test first — pattern from `src/features/auth/domain/use-cases/login.use-case.test.ts`:**

`makeRepo(over: Partial<IStaffLeaveRepository> = {}): IStaffLeaveRepository` helper with `vi.fn()` for all methods.

`approve-staff-leave.use-case.test.ts`:
- `it("propagates not-found from repo")`
- `it("propagates already-processed from repo")`
- `it("returns approved entity on success")`

`reject-staff-leave.use-case.test.ts`:
- `it("returns missing-reason when reason is empty — no repo call")`
- `it("returns missing-reason when reason.trim().length < 10 — no repo call")`
- `it("delegates to repo when reason valid and returns result")`

`get-staff-leave-requests.use-case.test.ts`:
- `it("returns empty list when repo returns empty")`
- `it("passes status filter through to repo")`
- `it("propagates network-error failure from repo")`

**Done when:** `bun vitest run` on these 3 test files — all assertions green with mock repo only.

---

#### Phase 2 — Infrastructure layer (server-only)

Goal: DTO, mapper, mock repository with seed data, real repository stub, endpoint constants.

**Files to create:**

```
src/features/staff-leave/infrastructure/
  dtos/
    staff-leave-request-response.dto.ts
  mappers/
    staff-leave-request.mapper.ts
  repositories/
    staff-leave.repository.ts                     ('server-only' — real stub)
    mocks/
      staff-leave.mock.repository.ts              ('server-only')
      fixtures.ts
      staff-leave.mock.repository.test.ts         [RED FIRST]

src/bootstrap/endpoint/
  staff-leave.endpoint.ts                         (new)
```

**Endpoint constants (`staff-leave.endpoint.ts`)** — mirrors `staffing.endpoint.ts` style:
```ts
export const STAFF_LEAVE_EP = {
  list:    '/core/api/v1/staff-leave-requests',
  approve: (id: string) => `/core/api/v1/staff-leave-requests/${id}/approve`,
  reject:  (id: string) => `/core/api/v1/staff-leave-requests/${id}/reject`,
} as const
```

**DTO (`staff-leave-request-response.dto.ts`):** camelCase wire format (decision `0017`). Fields: `id`, `staff: { name, role, dept, avatar, color }`, `type`, `startDate` (DD/MM/YYYY from BE), `endDate`, `days`, `reason`, `submittedAt` (DD/MM/YYYY HH:mm), `status`, optional `approver`, `approvedAt`, `rejecter`, `rejectedAt`, `rejectReason`.

**Mapper (`staff-leave-request.mapper.ts`):**
`StaffLeaveRequestMapper.fromDto(dto: StaffLeaveRequestResponseDto): StaffLeaveRequest`
- Normalise `startDate`/`endDate` from `DD/MM/YYYY` → ISO `YYYY-MM-DD`.
- Normalise `submittedAt` from `DD/MM/YYYY HH:mm` → ISO datetime.
- Drop `staff.color` (raw hex — not carried into entity; presentation maps `staff.role` to tokens).

**Mock repository (`mocks/staff-leave.mock.repository.ts`):**
- `import 'server-only'`
- Module-level `let _requests: StaffLeaveRequest[]` — `structuredClone(SL_SEED_FIXTURES)` in constructor (deterministic; each `new` resets state for test isolation).
- `listRequests(filter?)`: status + ISO date string comparison; `mockDelay(150)`.
- `approveRequest(id)`: `not-found` if missing; `already-processed` if status !== `'pending'`; mutate + return updated entity.
- `rejectRequest(id, reason)`: same guards; mutate status + store `rejectionReason`; return updated entity.

**Fixtures (`mocks/fixtures.ts`):** 8 `StaffLeaveRequest[]` items from `design_src/edu/staff-leave.jsx` `SL_SEED_REQUESTS`. Dates already normalised to ISO format in fixture definitions (no runtime parsing in fixture — mapper handles real DTO wire format only).

**Real repository stub (`staff-leave.repository.ts`):**
- `import 'server-only'`
- `constructor(private readonly http: AxiosInstance)`.
- HTTP calls via `STAFF_LEAVE_EP.*`; interceptor unwraps envelope → cast as DTO.
- Map `ApiError.code` → `StaffLeaveFailure` type (branch on `error.code`; fallback → `network-error`).

**Test first (`staff-leave.mock.repository.test.ts`):**
- `it("listRequests returns all 8 fixtures with no filter")`
- `it("listRequests filters to pending items only")`
- `it("approveRequest mutates status to approved")`
- `it("approveRequest returns already-processed for non-pending item")`
- `it("rejectRequest stores reason and mutates status to rejected")`
- `it("rejectRequest returns not-found for unknown id")`

**Done when:** mock repo integration tests green; real repo compiles; `tsc --noEmit` clean.

---

#### Phase 3 — Bootstrap (DI + i18n)

Goal: Wire DI. Add all i18n keys to both locale files simultaneously. No tests — correctness proven by tsc typed key check.

**Files to create/modify:**

```
src/bootstrap/di/
  staff-leave.di.ts                               (new — 'server-only')
  index.ts                                        (add re-exports)
src/bootstrap/endpoint/
  index.ts                                        (add STAFF_LEAVE_EP re-export)
src/bootstrap/i18n/messages/
  vi.json                                         (add staffLeave namespace + shell.nav.staffLeave)
  en.json                                         (mirror simultaneously)
```

**DI factory (`staff-leave.di.ts`)** — mirrors `staffing.di.ts` shape exactly:
```ts
import 'server-only'
async function makeRepo(): Promise<IStaffLeaveRepository> {
  if (USE_MOCK) return new MockStaffLeaveRepository();
  return new StaffLeaveRepository(await createServerHttpClient());
}
export async function makeStaffLeaveRepository()
export async function makeGetStaffLeaveRequestsUseCase()
export async function makeApproveStaffLeaveUseCase()
export async function makeRejectStaffLeaveUseCase()
```

**i18n additions (both files simultaneously — full key list):**

`shell.nav.staffLeave`: `"staffLeave": "Nghỉ phép nhân viên"` (vi) / `"staffLeave": "Staff Leave"` (en).

`staffLeave` namespace:
```
page.title, page.subtitle, page.adminBadge, page.breadcrumbHome, page.breadcrumbCurrent
stats.pending, stats.approvedThisMonth, stats.totalDaysThisMonth
filter.all, filter.pending, filter.approved, filter.rejected,
filter.dateRangeLabel, filter.dateFrom, filter.dateTo, filter.clearFilter,
filter.showing, filter.requests
status.pending, status.approved, status.rejected
leaveType.annual, leaveType.sick, leaveType.personal, leaveType.family
actorRole.teacher, actorRole.staff
card.reason, card.showMore, card.showLess, card.submitted, card.days,
card.approvedBy, card.rejectedBy, card.rejectionReason
actions.approve, actions.reject, actions.confirmReject, actions.cancel
rejectEditor.label, rejectEditor.placeholder, rejectEditor.hint, rejectEditor.ready
toast.approved, toast.rejected
empty.all, empty.pending, empty.approved, empty.rejected, empty.subtitle
error.loadFailed, error.retry
errors.not-found, errors.already-processed, errors.missing-reason,
errors.forbidden, errors.network-error, errors.unknown
```

**Done when:** `bunx tsc --noEmit` clean — typed key compilation validates all `t("staffLeave.*")` call sites once Phase 4 components are written.

---

#### Phase 4 — Presentation + Storybook

Goal: Client components, ViewModel interface, Storybook stories with interaction tests. No infrastructure imports in any presentation file.

**Files to create:**

```
src/features/staff-leave/presentation/staff-leave-screen/
  staff-leave-screen.i-vm.ts
  staff-leave-screen.tsx                          ('use client')
  staff-leave-screen.stories.tsx
  staff-leave-filter-bar.tsx                      ('use client' — pills + date inputs)
  leave-request-card.tsx                          ('use client' — single card + inline reject)
  leave-empty-state.tsx                           (can be server — no hooks)
  staff-leave-avatar-initials.tsx                 (feature-local; promote to shared on 2nd use)
```

**ViewModel interface (`staff-leave-screen.i-vm.ts`)** — from state engineer §2:
```ts
export type ApproveResult = { ok: true } | { ok: false; errorKey: StaffLeaveFailure['type'] };
export type RejectResult  = { ok: true } | { ok: false; errorKey: StaffLeaveFailure['type'] };

export interface StaffLeaveScreenProps {
  initialRequests: StaffLeaveRequest[];
  initialError: boolean;
  onApprove: (id: string) => Promise<ApproveResult>;
  onReject: (id: string, reason: string) => Promise<RejectResult>;
}
```

**Existing components to import (no recreation):**
- `StatCard` from `@/components/shared/stat-card` — 3 instances in stats row.
- `StatusBadge` from `@/components/shared/status-badge` — for pending/approved/rejected.
- `Badge` from `@/components/ui/badge` — for leave-type badge, actor-role badge.
- `Button` from `@/components/ui/button` — approve, reject, cancel, confirm-reject buttons.

**A11y requirements (AC-9):**
- Inline rejection textarea: `<label htmlFor="reject-reason-{id}">` linked via `htmlFor`.
- Textarea: `aria-invalid` when `rejectReason.trim().length > 0 && < 10`; `aria-describedby` pointing to hint text element.
- Approve/Reject buttons: `aria-label` including staff name (e.g. `${t('actions.approve')} — ${req.staff.name}`).
- Filter pills: `<button>` elements, keyboard navigable.
- Toast: `role="status"` + `aria-live="polite"`.
- Reason expand/collapse: `aria-expanded` + `aria-controls` on toggle button.
- All status colors accompanied by icon (not color alone) — checked against WCAG 1.4.1 (non-text contrast).

**Token usage (no raw color, ever):**
- Status pending badge: `bg-edu-warning/15 text-edu-warning`.
- Status approved badge: `bg-edu-success/15 text-edu-success`.
- Status rejected badge: `bg-edu-error/15 text-edu-error`.
- Accent bars: `bg-edu-warning`, `bg-edu-success`, `bg-edu-error`.
- Rejection editor background: verify `--edu-error` light token in `src/app/tokens.css` before use. If absent, flag to `fe-lead` for ADR.
- Avatar initials: `staff.role === 'teacher'` → `bg-primary/18 text-primary`; `staff` → `bg-muted text-muted-foreground`.

**Storybook stories (`staff-leave-screen.stories.tsx`):**

| Story | Setup | Interaction / verification |
|---|---|---|
| `Loading` | initialRequests=[], initialError=false, isLoading visual | Skeleton shapes: 3 stat skeletons + filter bar + 4 card rows |
| `AllRequests` | 8 SL_SEED fixtures, statusFilter=all | 8 cards; 3 pending show action buttons |
| `FilteredPending` | 8 fixtures, initial statusFilter=pending via play | 3 cards render; empty state hidden |
| `EmptyState` | initialRequests=[] | CalendarX icon + "Không có đơn xin nghỉ nào." |
| `ErrorState` | initialError=true | Error banner + "Thử lại" button |
| `ApproveFlow` | 8 fixtures; play: click approve on sl-001 | Status badge → approved; toast fires |
| `RejectFlow` | 8 fixtures; play: click reject sl-002 → type 12 chars → click confirm | Inline editor expands; card → rejected; rejection reason block appears; toast fires |

All action props use `fn()` from `@storybook/test`.

**Done when:** `bun storybook` clean build; `ApproveFlow` + `RejectFlow` interaction play functions pass; no console errors.

---

#### Phase 5 — Route + nav

Goal: RSC page, Server Actions, nav config entry. `bun build` clean.

**Files to create/modify:**

```
src/app/[locale]/t/[tenant]/(app)/admin/staff-leave/
  page.tsx                                        (new RSC)
  actions.ts                                      (new — 'use server')

src/components/layout/app-shell/sidebar/
  nav-config.ts                                   (modify — add staffLeave entry + CalendarClock import)
```

**`page.tsx`** — mirrors `admin/staffing/page.tsx` exactly:
```ts
// RSC — no 'use client'
// const uc = await makeGetStaffLeaveRequestsUseCase()
// const result = await uc.execute()
// <StaffLeaveScreen
//   initialRequests={result.ok ? result.value : []}
//   initialError={!result.ok}
//   onApprove={approveStaffLeaveAction}
//   onReject={rejectStaffLeaveAction}
// />
```

**`actions.ts`** — `'use server'`:
```ts
// approveStaffLeaveAction(id: string) → makeApproveStaffLeaveUseCase → uc.execute(id)
//   → { ok: true } | { ok: false, errorKey: failure.type }
// rejectStaffLeaveAction(id: string, reason: string) → makeRejectStaffLeaveUseCase → uc.execute(id, reason)
//   → { ok: true } | { ok: false, errorKey: failure.type }
```

**`nav-config.ts`:**
- Add `CalendarClock` to lucide-react import.
- Append to `admin` array (after `staffing` entry): `{ href: '/admin/staff-leave', labelKey: 'staffLeave', icon: CalendarClock }`.
- `NavLabelKey` type auto-picks up the key from Phase 3 i18n addition — no type cast needed.

**Done when:** `bun build` exits 0; `/admin/staff-leave` renders 8 seed cards; admin sidebar shows "Nghỉ phép nhân viên".

---

### 3. Component + state sketch

State is fully designed by `fe-state-engineer` (§1–§11 above). Component contracts are fully specified by `fe-component-architect` above. This sketch is for `fe-nextjs-engineer` orientation only.

```
page.tsx (RSC)
  └── StaffLeaveScreen (client, staff-leave-screen.tsx)
        state: requests, statusFilter, dateFrom, dateTo,
               rejectingId, rejectReason, isLoading, actionErrorKey, toast
        useMemo: stats, filtered
        │
        ├── StatCard ×3       (components/shared/stat-card — REUSE)
        ├── StaffLeaveFilterBar (staff-leave-filter-bar.tsx)
        ├── LeaveRequestCard[] (leave-request-card.tsx)
        │     ├── StaffLeaveAvatarInitials  (feature-local — promote on 2nd use)
        │     ├── Badge ×2    (ui primitive — actor-role + leave-type)
        │     ├── StatusBadge (shared — pending/approved/rejected)
        │     └── inline reject: label + textarea + Button ×2
        └── LeaveEmptyState   (leave-empty-state.tsx)
```

State classification (see §2 for full table):
- Server-seeded: `requests` — mutated locally on `{ ok: true }` action response only.
- Local filter: `statusFilter`, `dateFrom`, `dateTo` — no URL persistence.
- Ephemeral: `rejectingId`, `rejectReason` — single active rejection at a time.
- Action gate: `isLoading` — disables all action buttons across all cards.
- Transient: `toast` — `useRef` timer + `useEffect` cleanup (Race 5 guard).

### 4. Risks, dependencies, open questions

**AC-4 / AC-5 / AC-9 vs design conflict — fe-lead must resolve:**
- AC-4: "confirm dialog" for approve. Design: direct button. Plan: direct button (no dialog).
- AC-5 + AC-9: "dialog" + "trap focus" for reject. Design: inline textarea expansion. Plan: inline. No focus trap — `autoFocus` on textarea, Escape key closes (keyboard accessibility maintained without dialog semantics).
- If dialog is mandated: needs shadcn Dialog component + ADR for this pattern addition.

**[OPEN QUESTION] Rejection editor background token:** `T.errorLight` in design (raw hex). Verify `src/app/tokens.css` has a light error variant (e.g. `bg-edu-error/8` or `--edu-error-light`). If token absent → flag to `fe-lead` for ADR before use (CLAUDE.md hard rule).

**[OPEN QUESTION] Per-person avatar color:** seed data has `staff.color` (raw hex). Entity drops it. If product wants per-person color variation → needs `avatarTone: StaffAvatarTone` entity field + design token mapping. Not planned for this US; flag to `fe-lead` if required.

**[OPEN QUESTION] `CalendarClock` vs `CalendarX`:** page header icon is `calendarX` (design); nav entry icon is `CalendarClock` (prompt spec). Verify both icons exist in installed lucide-react before Phase 4/5 (`import { CalendarClock, CalendarX } from 'lucide-react'` — build fails if absent).

**RBAC:** Satisfied by route placement under `/admin/*`. No additional guard in `page.tsx`.

**Noti side effect:** `[ASSUMPTION]` in story.md — out of scope. Document for follow-up when core ships.

**Date normalisation:** Mapper MUST convert `DD/MM/YYYY` → ISO `YYYY-MM-DD`. Test explicitly in Phase 2 mock repo test: date filter comparison must work correctly after normalisation.

### 5. Implementation order

```
Phase 1: domain tests RED → domain impl GREEN (bun vitest run clean)
Phase 2: mock repo tests RED → infra impl GREEN (tsc clean)
Phase 3: i18n + DI → tsc validates all key paths
Phase 4: Storybook stories written first → component impl → stories + interactions GREEN
Phase 5: route + nav → bun build clean
Post-impl: /impeccable audit + critique → fe-qa-playwright Storybook interaction proof
```
