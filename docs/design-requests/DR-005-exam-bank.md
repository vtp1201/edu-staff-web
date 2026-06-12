# DR-005 — Exam Bank (Kho đề thi + Tạo đề thi)

Status: pending
US: US-E13.4 (cần tạo story packet)
Route: `/teacher/exam-bank` (danh sách đề) · `/teacher/exam-bank/create` (tạo đề)
       `/admin/exam-bank` (xem tổng, admin)
Roles: `teacher` (tạo + quản lý đề của mình), `admin`/`principal` (xem tổng)
Design file to create: `design_src/edu/exam-bank.jsx`

---

## Mục tiêu màn hình

Giáo viên tạo và quản lý đề thi / đề kiểm tra. Mỗi đề gồm nhiều câu hỏi
(trắc nghiệm hoặc tự luận). Có thể tái sử dụng đề cho nhiều lớp, nhiều năm.
Tạo đề thi online (sẽ link với E11 Exam Taking).

---

## Layout 1 — Danh sách đề thi (Exam Bank list)

**Filter bar**: môn học + khối lớp + loại đề (giữa kỳ / cuối kỳ / kiểm tra
thường xuyên / khác) + search.

**List view** (card dạng dọc):
```
┌─────────────────────────────────────────────────────────────┐
│ [icon exam] Kiểm tra Giữa kỳ 1 — Toán lớp 10              │
│             Toán · Lớp 10 · Giữa kỳ · 45 phút · 30 câu   │
│             Tạo: 15/05/2026 · Đã dùng: 3 lần              │
│             [Xem/Chỉnh sửa] [Nhân bản] [Xóa] [Giao bài]  │
└─────────────────────────────────────────────────────────────┘
```

**Nút "Tạo đề mới"** (primary, top right) → navigate sang Exam Builder.

---

## Layout 2 — Exam Builder (tạo/sửa đề)

**2-column layout**: cột trái (30%) = question list; cột phải (70%) = question editor.

**Metadata header** (full width, trên cùng):
- Tên đề thi, môn học, khối lớp, loại đề, thời gian làm bài (phút), tổng điểm.

**Question list** (cột trái):
```
Q1  [MCQ]  Câu 1 — Tính...                    1.0đ [edit] [delete]
Q2  [MCQ]  Câu 2 — Cho x=...                  1.0đ
Q3  [Essay] Câu 3 — Giải phương trình...       3.0đ
[+ Thêm câu hỏi]
```

**Question Editor** (cột phải):
- Radio: Trắc nghiệm (MCQ) / Tự luận (Essay).
- MCQ: textarea câu hỏi + 4 options (A/B/C/D) với radio "đáp án đúng" + điểm.
- Essay: textarea câu hỏi + gợi ý đáp án (muted, không hiện khi thi) + điểm.
- "Thêm hình ảnh" button (cho câu hỏi có hình).

**Preview button**: "Xem trước đề" → modal hiển thị đề như học sinh thấy.

**Actions**: "Lưu nháp" + "Lưu & Phát hành" (published → có thể giao cho lớp).

---

## States

**Empty exam bank**: icon file + "Chưa có đề thi nào. Bắt đầu tạo đề đầu tiên."
**Draft badge**: chip "Nháp" (warning) trên card.
**Published badge**: chip "Đã phát hành" (success).

---

## Tham chiếu màn hình tương tự

- `design_src/edu/exam.jsx` — ExamScreen (student exam taking) — dùng làm preview
  reference (layout câu hỏi, MCQ options style).
- `design_src/edu/subjects.jsx` — master-detail split layout.
- `design_src/edu/classops.jsx` — form style, card list.

---

## Output cần từ designer

File: `design_src/edu/exam-bank.jsx`
Components: `ExamBankScreen` + `ExamBuilderScreen`
