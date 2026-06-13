# US-E12.10 Class Management UI — Create, Rename, Archive Classes; Assign Homeroom Teacher

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E12.1 (school setup — grade level configured), US-E12.2 (academic calendar — year exists), US-E12.4 (student roster uses class entity)
- Blocks: US-E13.1 (teacher class view requires classes to exist)
- Feature module(s) chạm: `src/features/admin/class-management/` (new feature)
- Shared contract/file: `bootstrap/endpoint/class.endpoint.ts` (new), IAM member list for homeroom picker

## Product Contract

Admin quản lý danh sách lớp học của năm học: tạo lớp mới, đổi tên, archive, và
gán giáo viên chủ nhiệm (GVCN). Màn hình `/admin/classes`.

**Luồng chính:**

1. **Class list** — bảng danh sách lớp, filter theo năm học (academicYearLabel)
   và gradeLevel. Mỗi row: tên lớp, khối, GVCN (tên hoặc "Chưa phân công"), trạng
   thái (ACTIVE/ARCHIVED), số học sinh.

2. **Create class** — sheet form: tên lớp (unique per year+grade), khối lớp
   (1–13, trong grade level range của trường), năm học.

3. **Rename class** — PATCH tên và/hoặc gradeLevel qua inline sheet.

4. **Archive class** — confirm dialog; nếu có học sinh enrolled thì cảnh báo
   "Lớp này đang có N học sinh đã ghi danh."

5. **Assign homeroom teacher (GVCN)** — trong row / detail panel: picker chọn
   giáo viên (search theo tên, lọc theo member role=TEACHER); replace nếu đã có.

RBAC: ADMIN / SUPER_ADMIN toàn quyền; TEACHER chỉ xem assigned classes của mình
(scope đó thuộc US-E13.1).

## Relevant Product Docs

- `docs/product/screens.md` — thêm "Class Management" vào Principal/Admin section
- `design_src/edu/roster.jsx` — pattern bảng + breadcrumb class selector (adapt)
- `design_src/edu/teacher.jsx` — TeacherAssignmentSheet (pattern picker GV)
- BE API (REAL — core service, đã live):
  - `POST /core/api/v1/classes` — tạo lớp
  - `GET /core/api/v1/classes` — list (cursor-paged; ADMIN all, TEACHER assigned)
  - `GET /core/api/v1/classes/:classId` — get one
  - `PATCH /core/api/v1/classes/:classId` — rename (name + gradeLevel)
  - `POST /core/api/v1/classes/:classId/archive`
  - `PUT /core/api/v1/classes/:classId/homeroom-teacher`
  - `GET /core/api/v1/classes/:classId/homeroom-teacher`
  - IAM `GET /iam/api/v1/tenants/:tenantId/members?role=TEACHER` — search GV cho picker (mock-first nếu chưa có list endpoint)

## Acceptance Criteria

- AC-1: Admin thấy danh sách lớp, filter by year / gradeLevel, cursor-paginated.
- AC-2: Admin tạo lớp — validation: tên required, gradeLevel trong [minGrade, maxGrade] của trường; 409 DUPLICATE → inline error "Lớp đã tồn tại trong năm học này".
- AC-3: Admin đổi tên lớp qua sheet — constraint tương tự AC-2.
- AC-4: Admin archive lớp — nếu class có học sinh enrolled (roster count > 0) → warning "Lớp đang có N học sinh, vẫn archive?"; confirm → archive.
- AC-5: Admin gán/thay GVCN — picker search teacher by name; hiển thị tên GVCN hiện tại nếu có.
- AC-6: Khi gradeLevel nằm ngoài range đã cấu hình → 422 `CLASS_GRADE_LEVEL_OUTSIDE_TENANT_RANGE` → toast error hướng dẫn vào School Setup.
- AC-7: Loading, empty (chưa có lớp nào), error states đầy đủ.
- AC-8: WCAG 2.1 AA — contrast, keyboard, ARIA.
- AC-9: Tất cả strings qua i18n namespace `classManagement`.

## Design Notes

- Adapt pattern từ `roster.jsx` cho bảng lớp học.
- Homeroom picker: reuse pattern từ `TeacherAssignmentSheet` (`teacher.jsx`).
- IAM member list endpoint cho picker chưa rõ contract → mock-first (decision 0014); flag khi IAM expose list members endpoint.
- Commands: `createClass`, `renameClass`, `archiveClass`, `assignHomeroomTeacher`.
- Queries: `listClasses`, `getClass`, `getHomeroomTeacher`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Use-cases: create (valid/grade-out-of-range/duplicate), rename, archive-with-warning, assignHomeroom |
| Integration | Repository: class CRUD, homeroom PUT, error-code mapping |
| E2E | Storybook: Loading/Empty/Populated/WithHomeroomAssigned/ArchiveWithWarning |
| Platform | bun build + tsc clean |

## Harness Delta

- `docs/TEST_MATRIX.md`: thêm hàng US-E12.10.
- `docs/product/screens.md`: thêm "Class Management" → `/admin/classes`, `🎨 design-pending`.
