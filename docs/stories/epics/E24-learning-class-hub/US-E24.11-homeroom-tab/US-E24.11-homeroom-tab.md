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

(điền sau)
