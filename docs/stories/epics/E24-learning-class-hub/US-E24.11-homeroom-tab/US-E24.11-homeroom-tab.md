# US-E24.11 Tab Chủ nhiệm (GVCN) — điểm danh hôm nay, vi phạm chờ, duyệt đơn nghỉ

## Status

planned

## Lane

high-risk

> Lý do: mutation approve/reject đơn nghỉ (không hoàn tác) — role-gated GVCN own homeroom; gỡ
> force-mock leave khỏi `discipline.di.ts`.

## Dependencies

- Depends on: US-E24.8 (shell)
- Blocks: none
- Feature module(s) chạm: `features/teacher/presentation/class-hub/homeroom-tab/**` (mới),
  `features/attendance` (reuse `GetClassAttendance`), `features/discipline` (reuse
  `GetViolations`, `GetLeaveRequests`, `ApproveLeave`, `RejectLeave`; **un-force-mock nhánh leave**),
  `bootstrap/di/discipline.di.ts`
- Shared contract/file: `discipline.di.ts` (nhánh violations vẫn force-mock? — xem Product Contract),
  `messages` `teacher.classHub.homeroom`

## Product Contract

Design v3: `class-hub.jsx` → `ChHomeroomTab`. Chỉ hiện khi `roles` chứa `homeroom`.

Grid `auto-fit minmax(300px,1fr)` 3 card:
1. **Điểm danh hôm nay**: badge "Đã điểm danh" / "Chưa điểm danh"; 3 ô Có mặt / Có phép / Vắng
   (số + nhãn, màu success/warning-text/error-text); nút "Mở sổ điểm danh" →
   `/teacher/attendance?classId=&date=today`. Nguồn `GET classes/{id}/attendance?date=` (real, đã có
   use-case). Chưa có bản ghi → badge warning "Chưa điểm danh", 3 ô "—".
2. **Vi phạm chờ xử lý**: `GET conduct/student-violations?classId=&state=SUBMITTED` (ask #8 param;
   nếu không lọc được server-side → lọc client theo `classId`+`state`), badge count error; list
   (tên HS, mô tả, ngày); "Mở Vi phạm & Hạnh kiểm" → `/teacher/discipline?classId=`. Vi phạm hiện
   **force-mock** (E18.14) — US này wire **read** thật cho list này qua repo real đã có (`USE_MOCK`
   gate) nếu contract đọc đã ổn (BE §2.3: teacher/BGH thấy đủ state); ghi rõ trong Evidence phần nào
   còn mock.
3. **Đơn xin nghỉ chờ duyệt**: `GET conduct/student-leave-requests` (homeroom inbox — server lọc
   theo GVCN), badge count warning; mỗi đơn: tên HS, "Nghỉ dd/MM → dd/MM — lý do", (đính kèm khi BE
   ship US-249 — ẩn nếu không có field); nút **Duyệt** (`POST /{id}/approve`) / **Từ chối** (dialog
   lý do bắt buộc → `POST /{id}/reject {rejectionReason}`); sau action → item biến khỏi list + toast;
   lỗi 403 (không phải GVCN lớp) → toast + refetch. Un-force-mock: `makeGetLeaveRequestsUseCase`,
   `makeApproveLeaveUseCase`, `makeRejectLeaveUseCase` về `USE_MOCK` gate với real repo hiện có
   (endpoint `DISCIPLINE_EP.leaveRequests` + approve/reject đã khai báo).
- Empty từng card: "Không có vi phạm chờ xử lý." / "Không có đơn nào chờ duyệt."; lỗi từng card
  độc lập (retry).

## Relevant Product Docs

- `docs/product/design-spec.jsonc#teacher-class-hub` (tab homeroom)
- `docs/reports/2026-09-02-be-to-fe-contract-update.md` §2.3 (conduct visibility), §4 US-249/US-251
- `docs/stories/epics/E18-be-wiring/US-E18.14-discipline-conduct-wiring/*` (lý do force-mock cũ)
- `docs/decisions/0063-*`, `0074-*`

## Acceptance Criteria

- Tab chỉ tồn tại với GVCN (E24.8 resolver); GVBM gõ `?tab=homeroom` → fallback.
- Card 1: có attendance → 3 số đúng + "Đã điểm danh"; không có → "Chưa điểm danh" + "—".
- Card 2: chỉ vi phạm `state=SUBMITTED` của `classId`; count badge = length; >0 → tone error.
- Card 3: Duyệt → POST approve → item mất; Từ chối không lý do → disabled; có lý do → POST reject với
  `rejectionReason`; 403 → toast lỗi + list refetch (action tests + repo forge-role test: authCtx
  role không phải homeroom của classId → failure, không gọi http — decision 0063).
- `discipline.di.ts`: test `USE_MOCK=false` → real repo cho 3 leave use-cases (đảo test E18.14 phần
  leave); các use-case khác trong file giữ hành vi hiện tại (test không đổi).
- Storybook: full / attendance-not-taken / empty-all / reject-dialog / error-card.
- i18n `teacher.classHub.homeroom.*` vi+en.
- Gate xanh; design-review + a11y (số + nhãn, nút ≥44px, dialog focus trap).

## Design Notes

- Queries (RSC, `Promise.allSettled`): `getClassAttendance(classId, today)`, `listViolations(filter)`,
  `listLeaveRequests()` lọc `classId`.
- Commands (Server Actions): `approveLeaveAction(id)`, `rejectLeaveAction(id, reason)` →
  `revalidatePath`.
- UI: `homeroom-tab/{homeroom-tab.tsx, attendance-today-card.tsx, open-violations-card.tsx,
  pending-leave-card.tsx, reject-leave-dialog.tsx}`; StatCard-like tiles reuse `StatCard` shared nếu
  khớp, không fork.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | filters, count, today resolver (now inject) |
| Integration | actions approve/reject; DI gate test; forge-role repo test |
| E2E | Storybook reject flow |
| Platform | tsc/vitest/build; curl approve qua Kong khi stack lên |
| Release | design-review + a11y + security |

## Harness Delta

ADR nhỏ nếu cần: "un-force-mock discipline leave branch (supersede phần leave của E18.14)" —
reviewer quyết; mặc định ghi vào packet Evidence + `screens.md`.

## Evidence

### Un-force-mock scope (supersedes the LEAVE branch of US-E18.14 only)

`bootstrap/di/discipline.di.ts` now has TWO repository factories:

- `makeRepo()` — unchanged, returns `MockDisciplineRepository` **unconditionally**
  for 14 factories (violations, conduct grades, student self-service, parent
  multi-child). US-E18.14's two categorical blockers still hold for all of them.
- `makeLeaveRepo()` — an ordinary `USE_MOCK ? Mock : Real` gate (decision `0014`)
  used by **exactly three**: `makeGetLeaveRequestsUseCase`,
  `makeApproveLeaveUseCase`, `makeRejectLeaveUseCase`. The GVCN homeroom inbox is
  the one conduct surface neither blocker reaches — core returns the student ids
  itself (IAM's batch directory resolves the names, so no roster-UUID lookup) and
  the caller is a TEACHER standing in a known `classId` (so no self-scope
  discovery). Proven both ways by `src/bootstrap/di/discipline.di.test.ts`.

`DisciplineRepository` implements those three for real; every other method is
still the documented blocked stub that throws without touching `http.*`.

### Card-by-card data source

| Card | Source | Status |
| --- | --- | --- |
| 1 · Điểm danh hôm nay | `GET /core/api/v1/classes/{id}/attendance?date=` | **real** |
| 2 · Vi phạm chờ xử lý | `GetViolationsUseCase` | **still mock** (US-E18.14) |
| 3 · Đơn xin nghỉ chờ duyệt | `GET/POST /core/api/v1/conduct/student-leave-requests` | **real** (this US) |

Card 2 could NOT be un-force-mocked here and this is not a `USE_MOCK` flip:
`ViolationEntity.status` (`recorded|notified|parent_confirmed`, US-E09.1) has
zero relation to the real `StudentViolationResponse.state`
(`DRAFT|SUBMITTED|APPROVED|REJECTED`), and the real DTO carries no display fields
at all (no `studentName`/`description` author). Redesigning that status axis
cascades into `violations-tab.tsx`, `conduct-badge.tsx`, `discipline-tones.ts`
and the parent `ViolationsList` — out of scope for a homeroom-tab story. The card
filters the mock's `status === "recorded"` as the "chưa xử lý" proxy; when the
real read lands, only `toViolationsVm` in `homeroom-vm.ts` changes.

### Contract deltas (mechanical, no behaviour change for existing callers)

- `approveLeave`/`rejectLeave` now take a `DecideLeaveInput`
  (`id` + `studentMemberId` + `classId` + optional `authCtx`).
  `studentMemberId` is a REQUIRED query param on both by-id routes — it completes
  core's `(tenantId, studentMemberId)` partition key. Rippled through
  `IDisciplineRepository`, both repositories, both use-cases,
  `DisciplineScreenVM`, `leave-tab.tsx`, and the `teacher/discipline` +
  `principal/discipline` actions.
- `AttendanceRoster` gained `taken: boolean` (additive): the mapper seeds every
  unmarked student as `present`, so before this a never-rolled day was
  indistinguishable from "everyone present".

### decision `0063` (repository-boundary authorization)

`LeaveDecisionAuthContext { role, homeroomClassIds }` is assembled ONLY in
`makeLeaveDecisionAuthContext()` — role from the token claim, scope from the
teacher's own class list filtered to `roles.includes("homeroom")`. Every failure
path yields an EMPTY scope (deny by default); mock mode pins the role to
`teacher` because `decodeRoleClaim` answers a synthetic `admin` there.
`makeDecideLeaveUseCases()` returns `{ approve, reject, authCtx }` together, so a
Server Action cannot construct the mutation without the context.
The guard (`assertCanDecideLeave`) runs as the FIRST statement of
`approveLeave`/`rejectLeave` in BOTH repositories; forge-role tests call the
repository directly and assert `http.post` was never called.

### decision `0026` (component placement) — deviation from COMPONENT-ARCHITECTURE §6

The architecture doc asked to promote `reject-leave-dialog.tsx` into a new
`components/shared/reject-leave-dialog/`. That would have created a THIRD
parallel reason-dialog: `components/shared/reason-confirm-dialog/` already exists
as the canonical home for exactly this pattern (US-E18.44 — its own doc names
"reject a leave request" as a target, and grade-approval/grade-entry already
migrated onto it). Done instead: the feature-local dialog was **deleted** and
both call sites (`leave-tab.tsx`, the new `pending-leave-card.tsx`) point at
`ReasonConfirmDialog`. Copy (`discipline.leave.rejectDialog.*`) and the ≥10-char
rule are unchanged; the shared component adds a counter-free `role="alert"` error
and focus return. One component, one canonical home — no new folder.

### Other deviations

- `HomeroomTab` + the two read-only cards are Client Components, not async RSC.
  The AC mandates Storybook interaction stories for `attendance-not-taken`,
  `empty-all` and `error-card`, and the Storybook runner cannot render an async
  server component. They are data-free presentational leaves; all server work
  stays in `homeroom-vm.ts` + `page.tsx`, and `actions` arrives as Server Action
  refs (same shape as `TimetableTabBody`).
- Grid is `grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]`. The
  design-spec's bare `auto-fit minmax(300px,1fr)` overflows a 320px viewport,
  which `accessibility.md` forbids.
- i18n namespace is `teacherClasses.hub.homeroom.*` (the shipped E24.8/E24.9
  convention), NOT `teacher.classHub.homeroom.*` as PLAN §5 wrote.
- `homeroom` left `PlaceholderTab`; the now-dead
  `teacherClasses.hub.placeholder.body.homeroom` key was removed from vi + en.

### Follow-ups for the backlog

1. Redesign `ViolationEntity`'s status axis against the real BE workflow —
   prerequisite for un-force-mocking `getViolations` anywhere.
2. `/teacher/discipline` (and `/principal/discipline`) call
   `getLeaveRequests({})`. The real endpoint requires EXACTLY ONE of
   `classId` / `studentMemberId`, so in real mode that call is now refused before
   any HTTP with the documented `not-found` (it never guesses a class). Those
   dashboards need to iterate the teacher's homeroom class ids. Pre-existing gap
   this US surfaces, not one it creates.

### Proof

| Gate | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (0 errors; the 1 pre-existing warning + 1 info are in `features/messaging`) |
| `bun vitest run` | 568 files / 4678 tests passed |
| `bun vitest run --config vitest.storybook.mts` | 165 files / 1330 tests passed (8 new homeroom-tab stories) |
| `bun run build` | passed |
