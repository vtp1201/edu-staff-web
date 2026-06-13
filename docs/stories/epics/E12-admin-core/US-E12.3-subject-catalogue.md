# US-E12.3 Subject Catalogue — SubjectParent Departments & Grade-Scoped Subjects

## Status

implemented

## Lane

normal

## Product Contract

Admin quản lý danh mục môn học hai cấp:

1. **SubjectParent (Bộ môn / Tổ chuyên môn)**: tạo / sửa / archive nhóm môn
   (VD: "Khoa học Tự nhiên", "Khoa học Xã hội"). Màn hình `/admin/subject-departments`.

2. **Subject Catalogue** (grade-scoped): trong mỗi SubjectParent, tạo / sửa /
   archive môn học theo khối lớp (VD: "Toán lớp 10", "Toán lớp 11"). Layout
   master-detail 35%/65%: panel trái = danh sách SubjectParent, panel phải = danh
   sách Subject của parent được chọn. Màn hình `/admin/subjects`.

3. **Subject Detail**: trang riêng edit đầy đủ một Subject master — locked fields
   (periodCount, requiredAssessmentCount, outcomeTargets, masterSyllabus,
   exerciseBankRef, examBankRef) + danh sách ClassSubject offerings.
   Màn hình `/admin/subjects/[id]`.

BE stories: US-048 (ADR 0036 — Subject master + ClassSubject).

## Relevant Product Docs

- `design_src/edu/subject-parents.jsx` — SubjectParent screen
- `design_src/edu/subjects.jsx` — Subject catalogue (master screen)
- `design_src/edu/subjects-dialogs.jsx` — Create/Edit dialogs + Detail Sheet
- `design_src/edu/subjects-data.jsx` — seed data & helpers
- `design_src/edu/subject-detail.jsx` — Subject detail page (US-048, ADR 0036)
- BE API (mock-first):
  - `GET    /api/v1/core/subject-parents`
  - `POST   /api/v1/core/subject-parents`
  - `PATCH  /api/v1/core/subject-parents/:id`
  - `DELETE /api/v1/core/subject-parents/:id`
  - `GET    /api/v1/core/subjects?parentId=&gradeLevel=`
  - `POST   /api/v1/core/subjects`
  - `GET    /api/v1/core/subjects/:id`
  - `PATCH  /api/v1/core/subjects/:id`
  - `POST   /api/v1/core/subjects/:id/archive`

## Acceptance Criteria

- `/admin/subject-departments`: list SubjectParent + create/edit/archive flow.
- `/admin/subjects`: master-detail grid (35%/65%), SubjectParent pill list trái +
  Subject list phải. "Thêm Bộ môn" + "Thêm môn học" buttons.
  - Archive bị block nếu `inUse: true` (tooltip giải thích).
  - Inline archive confirm dialog.
- `/admin/subjects/[id]`: edit locked fields (periodCount, requiredAssessmentCount,
  outcomeTargets, masterSyllabus, exerciseBankRef, examBankRef) + section
  ClassSubject offerings (read-only list).
- Code validation: `/^[A-Z0-9]{1,16}$/`.
- Mock-first (DI).
- Design review pass.

## Design Notes

- Design files: `subjects.jsx`, `subject-detail.jsx`, `subjects-dialogs.jsx`,
  `subjects-data.jsx`, `subject-parents.jsx`.
- "Locked fields" concept (từ ADR 0036): các field này set ở cấp master và
  flow-down read-only xuống ClassSubject offerings — hiển thị lock icon + tooltip
  "Chuẩn khung quốc gia – thay đổi tại đây áp dụng cho tất cả lớp".
- Grade selector: dải từ `config.gradeLevelRange.minGrade` đến `maxGrade`
  (lấy từ school-setup US-E12.1).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | code format validation; archive-blocked logic |
| Integration | create parent → create subject → fetch catalogue |
| E2E | — |
| Platform | `bun build` xanh |
| Release | design-review gate pass |

## Role Guard

Routes `/admin/subject-departments`, `/admin/subjects`, `/admin/subjects/[id]` —
chỉ role `admin` (decision `0022`).

## Harness Delta

—
