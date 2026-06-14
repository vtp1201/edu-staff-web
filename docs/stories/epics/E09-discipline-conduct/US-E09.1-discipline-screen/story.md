# US-E09.1 Discipline Screen (Teacher / Principal)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E12.10 (class management — class list required for filtering), US-E12.4 (student roster — student list)
- Blocks: none
- Feature module(s) cham: `src/features/discipline/` (new feature)
- Shared contract/file: `bootstrap/endpoint/discipline.endpoint.ts` (new); `StatusBadge` from `components/shared/`

## Product Contract

Giao vien (GVCN / GVBM) xem va quan ly ky luat hoc sinh trong lop phu trach
qua 3 tab: Vi pham, Hanh kiem, Nghi phep.

**Tab Vi pham (Violations):**
- Bang ghi vi pham (hoc sinh, lop, loai vi pham, muc do, ngay, nguoi xu ly, trang thai).
- Nut "Ghi nhan vi pham moi" -> bottom-sheet form: chon hoc sinh, loai vi pham (9 loai), muc do (Nhe/Vua/Nang), gio hoc, mo ta tu do, toggle "Thong bao phu huynh".
- Sau khi ghi nhan: goi noti service de gui thong bao phu huynh (neu da bat).
- Severity color: Nhe = warning, Vua = error, Nang = destructive (#B91C1C).

**Tab Hanh kiem (Conduct):**
- Bang tinh diem hanh kiem tu dong: bat dau 100 diem, tru theo vi pham (-1/-3/-5).
- Hien thi xep loai: Tot >= 90, Kha >= 70, TB >= 50, Yeu < 50.
- GVCN co the override thu cong (override flag + ghi chu).
- Loc theo hoc ky (HK1 / HK2).

**Tab Nghi phep (Leave Management):**
- Bang yeu cau nghi phep tu hoc sinh / phu huynh: trang thai pending / approved / rejected.
- Giao vien approve hoac reject (yeu cau nhap ly do khi reject).
- Loai nghi: benh/kham, ca nhan/gia dinh, su kien, khac.

RBAC: Teacher chi thay hoc sinh lop minh phu trach. Principal thay tat ca lop.
Mock-first: BE core service chua ship.

## Relevant Product Docs

- `docs/product/screens.md` — Teacher section "Discipline" row
- `design_src/edu/discipline.jsx` — DisciplineScreen (3 tabs), ViolationForm, ConductTab, LeaveManagementTab (1506)
- Epic overview: `docs/stories/epics/E09-discipline-conduct/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (loading): Khi vao trang, skeleton loader hien thi trong khi load danh sach vi pham / hanh kiem / nghi phep.
- AC-2 (tab Violations — success): Danh sach vi pham hien thi dung hoc sinh, lop, loai, muc do (badge mau dung: Nhe=warning, Vua=error, Nang=destructive), ngay, trang thai.
- AC-3 (ghi nhan vi pham): Click "Ghi nhan vi pham moi" -> form bottom-sheet; submit thanh cong -> vi pham xuat hien trong danh sach; neu bat "Thong bao phu huynh" -> goi noti API.
- AC-4 (tab Conduct): Diem hanh kiem tu tinh chinh xac (100 - tong diem tru vi pham); xep loai hien thi badge mau dung; GVCN co the override voi ghi chu.
- AC-5 (tab Leave — approve): Click "Duyet" -> trang thai chuyen thanh "Da duyet" (green badge); bang cap nhat.
- AC-6 (tab Leave — reject): Click "Tu choi" -> modal nhap ly do (bat buoc); trang thai "Tu choi" (red badge) kem ly do.
- AC-7 (empty state): Khi chua co vi pham / yeu cau nghi -> empty state co icon va text huong dan.
- AC-8 (error state): Neu API loi -> error banner co nut thu lai; khong crash trang.
- AC-9 (RBAC): Teacher chi thay hoc sinh lop minh; principal thay het; student route khong co quyen truy cap man hinh nay.
- AC-10 (a11y): All interactive elements keyboard-accessible; severity badge khong chi truyen qua mau (kem icon/label); WCAG AA contrast.
- AC-11 (i18n): Tat ca strings qua namespace `discipline`.

## Design Notes

- Route: `/teacher/discipline` (teacher), `/principal/discipline` (principal)
- Design file: `design_src/edu/discipline.jsx` — DisciplineScreen component + ViolationForm bottom-sheet
- Commands: `recordViolation`, `approveLeave`, `rejectLeave`, `overrideConductGrade`
- Queries: `getViolations`, `getConductSummary`, `getLeaveRequests`
- API (mock-first — core service BE planned):
  - `GET  /core/api/v1/discipline/violations?classId=&semester=`
  - `POST /core/api/v1/discipline/violations`
  - `GET  /core/api/v1/discipline/conduct?classId=&semester=`
  - `PUT  /core/api/v1/discipline/conduct/:studentId/override`
  - `GET  /core/api/v1/discipline/leave-requests?classId=`
  - `PUT  /core/api/v1/discipline/leave-requests/:id/approve`
  - `PUT  /core/api/v1/discipline/leave-requests/:id/reject`
- Domain rules:
  - Severity points: low = -1, medium = -3, high = -5 from baseline 100
  - Conduct bands: Excellent >= 90, Good >= 70, Average >= 50, Poor < 50
  - Notification to parent: POST /noti/api/v1/notifications (mock-first)
- UI surfaces: 3-tab layout; ViolationForm bottom-sheet; ConductOverrideDialog; RejectLeaveDialog

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | calculateConductPoints use-case (baseline-violations deduction, override); recordViolation (valid/severity-map/missing-student); approveLeave / rejectLeave (missing-reason) |
| Integration | DisciplineRepository mock (CRUD violations, conduct override, leave approve/reject) |
| E2E | Storybook: Loading / ViolationsTab_Populated / ConductTab_WithOverride / LeaveTab_ApproveReject / EmptyState / ErrorState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E09.1 (planned)
- `docs/product/screens.md`: Discipline row Teacher section -> design-ready
- New feature folder: `src/features/discipline/`
- New endpoint file: `bootstrap/endpoint/discipline.endpoint.ts`
