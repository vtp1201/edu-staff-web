# US-E09.3 Staff Leave Management (Admin / Principal)

## Status

planned

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
