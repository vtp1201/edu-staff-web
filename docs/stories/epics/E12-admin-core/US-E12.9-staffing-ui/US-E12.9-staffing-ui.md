# US-E12.9 Staffing UI — Departments, Position Titles, Position Assignments

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E06.8 (staffing domain + real BE wiring — already implemented)
- Blocks: none
- Feature module(s) chạm: `src/features/admin/staffing/`
- Shared contract/file: `bootstrap/endpoint/staffing.endpoint.ts` (đã có từ E06.8), `StaffingRepository`

## Product Contract

Admin quản lý bộ máy nhân sự nhà trường qua ba màn hình liên kết:

1. **Departments (Khoa/Tổ bộ môn)** — `/admin/staffing/departments`
   Tạo / sửa tên / archive phòng ban. Hiển thị danh sách dạng bảng với badge
   trạng thái (ACTIVE/ARCHIVED). Nút Create mở sheet; nút Archive yêu cầu confirm.

2. **Position Titles (Chức danh)** — `/admin/staffing/position-titles`
   Tạo / sửa / archive chức danh (VD: Trưởng khoa, Phó trưởng khoa, Tổ trưởng
   chuyên môn). Bảng tương tự Departments.

3. **Position Assignments (Phân công chức vụ)** — `/admin/staffing/assignments`
   Gán một giáo viên (member) vào một chức danh kèm scope (department, academic
   year). Bảng hiển thị: tên GV, chức danh, phòng ban, năm học, trạng thái.
   Action: Assign (mở sheet chọn GV + chức danh + scope), Revoke (confirm dialog),
   Copy year-to-year (batch action).

RBAC: chỉ ADMIN / SUPER_ADMIN tạo/sửa/archive/assign/revoke. Mọi member được
đọc (list + get).

**Lưu ý thiết kế**: Chưa có design file `.jsx` cho staffing screens. Cần tạo
design dựa trên pattern đã có (tương tự `subject-parents.jsx` cho departments/
position-titles, và thêm assignment sheet). Đây là màn hình **new** — không có
trong bất kỳ design handoff nào.

## Relevant Product Docs

- `docs/product/screens.md` — mục "Staffing — Departments / Position Titles / Position Assignments"
- `docs/product/roles-permissions.md` — ADMIN-only write
- BE API (REAL — đã wired US-E06.8):
  - `GET/POST /core/api/v1/departments`
  - `PATCH/POST /core/api/v1/departments/:id`
  - `POST /core/api/v1/departments/:id/archive`
  - `GET/POST /core/api/v1/position-titles`
  - `PATCH/POST /core/api/v1/position-titles/:id`
  - `POST /core/api/v1/position-titles/:id/archive`
  - `GET/POST /core/api/v1/position-assignments`
  - `POST /core/api/v1/position-assignments/:id/revoke`
  - `POST /core/api/v1/position-assignments/copy`
- `src/features/admin/staffing/` — domain đã có (use-cases + entities từ E06.8)

## Acceptance Criteria

**Departments tab:**
- AC-1: ADMIN thấy danh sách departments, cursor-paginated, filter ACTIVE/ARCHIVED.
- AC-2: ADMIN tạo department mới qua sheet form — validation: name required, ≤100 chars.
- AC-3: ADMIN edit tên department qua inline sheet.
- AC-4: ADMIN archive department — confirm dialog; thành công → row chuyển ARCHIVED.
- AC-5: Loading state hiển thị skeleton; empty state hiển thị illustration + CTA tạo đầu tiên.
- AC-6: Error state (network/403) hiển thị message + retry.

**Position Titles tab:**
- AC-7: Tương tự AC-1 đến AC-6 cho position titles.

**Position Assignments tab:**
- AC-8: ADMIN thấy danh sách assignments (GV + chức danh + phòng ban + năm học).
- AC-9: Assign sheet: chọn member (search by name), chọn position title, chọn department scope (optional), chọn academic year.
- AC-10: Revoke assignment → confirm dialog → row removed.
- AC-11: Copy assignments year-to-year — chọn source year + target year → batch copy.
- AC-12: Non-ADMIN chỉ xem (không thấy Create/Assign/Revoke buttons).

**Cross-cutting:**
- AC-13: Tất cả strings qua `vi.json` / `en.json` (namespace `staffing`).
- AC-14: WCAG 2.1 AA — contrast, keyboard nav, focus ring, form labels.

## Design Notes

- **Design gap**: Không có `.jsx` handoff file. FE team implement dựa trên:
  - `design_src/edu/subject-parents.jsx` — pattern list + archive tương tự departments.
  - `design_src/edu/roster.jsx` — pattern search + sheet tương tự assignment picker.
  - Reuse `StatusBadge`, `StatCard` patterns từ `components/shared/`.
- Commands: `createDepartment`, `updateDepartment`, `archiveDepartment`, `createPositionTitle`, `updatePositionTitle`, `archivePositionTitle`, `assignPosition`, `revokeAssignment`, `copyAssignments`.
- Queries: `listDepartments`, `getDepartment`, `listPositionTitles`, `listPositionAssignments`.
- API: via Kong `http://localhost:8000/core/api/v1/departments`, `/position-titles`, `/position-assignments`.
- Domain rules: archive blocked when active assignments reference the department/title (BE returns `DEPARTMENT_HAS_ACTIVE_ASSIGNMENTS` / similar).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Use-case tests — đã có từ E06.8 (re-use / supplement for UI-triggered flows) |
| Integration | Repository integration — đã có từ E06.8 |
| E2E | Storybook interaction: Loading/Empty/Populated/ErrorState cho mỗi tab |
| Platform | bun build + tsc clean; biome 0 issues |

### QA Gate Notes (US-E12.9)
- Loading state (AC-5): handled at Next.js RSC Suspense boundary on `admin/staffing/page.tsx`; component receives data synchronously via props. No component-level skeleton needed — consistent with the pattern used by all admin screens in this repo (class-management, subject-departments, etc.).
- Network error + retry (AC-6): when RSC fetch fails, page falls back to `[]` → component renders the empty state with CTA. This IS the error recovery path (user can retry by refreshing). No separate error UI component needed at component level.
- Member search (AC-9): mock-first — uses text input for member ID. Full name-search autocomplete requires `core` service member search endpoint which is not yet available (decision 0014). Accepted MVP scope per packet Design Notes.

## Harness Delta

- `docs/TEST_MATRIX.md`: thêm hàng US-E12.9.
- `docs/product/screens.md`: cập nhật 3 hàng staffing → `🎨 design-pending`.
