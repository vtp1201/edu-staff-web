# DR-004 — Lesson Bank (Kho bài giảng)

Status: pending
US: US-E13.3 (cần tạo story packet)
Route: `/teacher/lesson-bank`
Roles: `teacher` (upload + quản lý bài của mình), `principal` (xem toàn trường)
Design file to create: `design_src/edu/lesson-bank.jsx`

---

## Mục tiêu màn hình

Giáo viên upload và quản lý file bài giảng, slide, video cho từng môn học / bài
dạy của mình. Có thể tái sử dụng bài giảng ở nhiều lớp. Có thể share với đồng
nghiệp cùng bộ môn.

---

## Layout chính

**Filter bar** (top): chọn môn học (dropdown) + chọn khối lớp + search + sort
(mới nhất / tên A-Z / dung lượng).

**Grid view** (default) hoặc **List view** (toggle):

Grid card (tương tự course card trong student.jsx):
```
┌─────────────────────────┐
│ [file type icon / thumb] │  ← 160px height
│  [môn màu badge]         │
├─────────────────────────┤
│ Tên bài giảng           │  14px fw-700
│ Toán · Lớp 10           │  12px muted
│ Tải lên: 02/06/2026     │  11px muted
│ [Xem] [Sửa] [Xóa]      │
└─────────────────────────┘
```

File types supported + icon mapping:
- PDF → red icon
- PPTX/PPT → orange icon
- DOCX → blue icon
- MP4/video → purple icon
- Link (YouTube/Drive) → green icon

**Upload panel** (floating button bottom-right hoặc "Thêm bài giảng" top button):
- Drag & drop area.
- Fields: Tên bài giảng, môn học, khối lớp, tag (tuỳ chọn), visibility (chỉ
  mình tôi / cùng bộ môn / toàn trường).
- File upload progress bar.

**Detail sheet** (slide-in từ phải, 480px — tương tự subjects-dialogs.jsx):
- Preview (nếu PDF: page 1 thumbnail; video: thumbnail).
- Metadata: tên, môn, khối, ngày upload, dung lượng, visibility.
- "Tải xuống" + "Copy link" + "Chia sẻ" buttons.

---

## States

**Empty** (chưa có bài giảng): icon BookOpen lớn + "Chưa có bài giảng nào. Hãy
upload bài giảng đầu tiên."
**Upload progress**: progress bar inside card placeholder during upload.
**Error upload**: card hiện error state (red border + retry button).

---

## Tham chiếu màn hình tương tự

- `design_src/edu/student.jsx` — course list cards (grid, progress, color badges).
- `design_src/edu/subjects-dialogs.jsx` — slide-in sheet pattern.
- `design_src/edu/ui.jsx` — Badge, Card component styles.

---

## Output cần từ designer

File: `design_src/edu/lesson-bank.jsx`
Component: `LessonBankScreen`
