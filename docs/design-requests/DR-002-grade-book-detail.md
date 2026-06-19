# DR-002 — Grade Book Detail (Nhập điểm cuối kỳ + Xuất báo cáo)

Status: [x] delivered
Delivered: 2026-06-20
US: US-E13.1
Route: `/teacher/grades` (nhập điểm — teacher) · `/principal/grades` (xem/duyệt)
       `/student/grades` · `/parent/grades` (xem) · `/admin/grades/approval` (phê duyệt)
Roles: `teacher` (nhập + xem), `admin`/`principal` (duyệt + xem tổng), `student`/`parent` (xem)
Design files: `design_src/edu/gradebook.jsx` · `design_src/edu/grade-entry.jsx` · `design_src/edu/grade-approval.jsx`

## Reconcile notes (2026-06-20)

ALREADY-IMPLEMENTED CHECK result: screen was **fully implemented** before this DR run.
- Feature: `src/features/grades/` (domain / infra / presentation for grade-book + grade-entry + grade-approval)
- Routes: `/teacher/grades`, `/teacher/grades/enter`, `/principal/grades`, `/admin/grade-book`, `/admin/grades/approval`, `/student/grades`, `/parent/grades`
- i18n namespaces `gradeApproval` (81 keys), `gradeEntry` (28 keys), `gradeBook` (38 keys) — ALL present; zero new keys added (guardrail worked).
- Shared component: `src/components/shared/grade-book-table/`

Genuine gap addressed: `docs/product/design-spec.jsonc` entry was a partial legacy stub (teacher-only, raw colors).
Reconcile action: replaced stub with full multi-screen spec covering `gradeBook`, `gradeEntry`, and `gradeApproval` — all routes, all role variants, all states, semantic tokens only.

---

## Mục tiêu màn hình

Giáo viên nhập điểm cho từng học sinh theo cột điểm đã cấu hình trong Assessment
Scheme (DR-001). Hiệu trưởng/admin xem tổng hợp và phê duyệt công bố điểm. Học
sinh và phụ huynh xem điểm của mình (phụ thuộc `gradePublishMode`).

---

## Layout chính — Teacher view

**Header row**: chọn lớp (dropdown) + chọn môn học + chọn học kỳ.
Sau khi chọn → load bảng điểm.

**Grade Entry Table** (dạng spreadsheet-light):
```
| STT | Họ tên HS       | TXL1 | TXL2 | Giữa kỳ | Cuối kỳ | TB | Xếp loại |
|-----|-----------------|------|------|---------|---------|-----|----------|
|  1  | Nguyễn Minh Anh | 8.5  | 9.0  |  8.0    |  8.5    |8.5 | Giỏi     |
|  2  | Trần Văn Bình   | 7.0  | [  ] |  [  ]   |  [  ]   | —  | —        |
```

- Cột điểm: từ Assessment Scheme của môn + khối. Số cột = tổng `count` các thành phần.
- Input: click vào cell → inline number input (0.0–10.0, bước 0.1, autosave on blur).
- TB (trung bình): tự tính theo trọng số (hiển thị real-time khi điền đủ).
- Xếp loại: apply Grade Scale (từ DR-001) tự động.
- Cell màu: ≥8 → success/green, <5 → error/red, khác → textPrimary (giống teacher.jsx GradeBook hiện tại).
- Row chưa đủ điểm → TB và Xếp loại hiển thị "—".

**Actions bar** (sticky header của table):
- "Lưu tất cả" button (primary) — batch save tất cả điểm đã nhập.
- "Xuất Excel" button (outline) — download `.xlsx` bảng điểm lớp.
- "Xuất PDF báo cáo" button (outline) — báo cáo điểm theo mẫu VN.
- Counter: "Đã nhập: 28/32 học sinh".

**Summary panel** (phía dưới bảng, collapsed by default):
- Phân phối xếp loại: mini bar chart (Xuất sắc N, Giỏi N, Khá N, TB N, Yếu N).
- Điểm TB lớp + highest/lowest.

---

## Layout — Student view (`/student/grades`)

Hiển thị bảng điểm cá nhân của học sinh đang đăng nhập:
```
| Môn học   | TXL1 | TXL2 | GK  | CK  | TB  | Xếp loại |
|-----------|------|------|-----|-----|-----|----------|
| Toán      | 8.5  | 9.0  | 8.0 | 8.5 | 8.5 | Giỏi     |
| Ngữ Văn   | 7.0  | 7.5  | 7.0 | 7.5 | 7.3 | Khá      |
```

- Nếu `gradePublishMode === 'ADMIN_APPROVAL'` và điểm chưa được duyệt: hiển thị
  banner "Điểm chưa được công bố" + ẩn giá trị.
- Summary card cuối trang: GPA học kỳ + xếp loại học lực + xếp loại hạnh kiểm.

---

## Layout — Parent view (`/parent/grades`)

Tương tự Student view nhưng có child selector (nếu có nhiều con trong trường).
Thêm: nút "Liên hệ giáo viên" (link sang messaging, nếu E10 đã implement).

---

## States / Empty / Error

**Empty** (lớp chưa có học sinh): "Lớp chưa có danh sách học sinh." + link
"Đến Danh sách lớp" → `/admin/roster`.

**Grades not published**: "Điểm học kỳ này chưa được công bố" với lock icon.

**Unsaved indicator**: header "● Có thay đổi chưa lưu" (warning color dot).

---

## Dữ liệu mock

Sử dụng `ROSTER_BY_CLASS` từ `subjects-data.jsx` / `roster.jsx` làm danh sách HS.
Grade columns từ Assessment Scheme (seed từ DR-001).
Seed điểm: 28/32 học sinh đã có điểm TXL1; 15/32 có đủ; rest là blank.

---

## Tham chiếu màn hình tương tự

- `design_src/edu/teacher.jsx` — `TeacherGradeBook` component (class pill tabs,
  grade table, color logic ≥8/< 5) — extend thêm inline edit + batch save.
- `design_src/edu/student.jsx` — student grades section.
- `design_src/edu/roster.jsx` — student list (tên, mã HS, dòng).
- `design_src/edu/tokens.js` — màu sắc.

---

## Output cần từ designer

File: `design_src/edu/gradebook.jsx`
Hiển thị cả teacher view (nhập điểm) và student/parent view (xem điểm).
Routing: section `'grades'` cho teacher + principal, student, parent.
