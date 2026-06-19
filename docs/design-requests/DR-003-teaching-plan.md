# DR-003 — Teaching Plan / PPCT (Kế hoạch giảng dạy / Phân phối chương trình)

Status: [x] delivered (2026-06-20 — reconcile, not net-new)
US: US-E11.4 (implemented — DR header had stale US-E13.2; actual Harness story is US-E11.4)

## Reconcile verdict

Screen ALREADY IMPLEMENTED (src/features/teaching-plan/ + design_src/edu/teaching-plan.jsx exists).
Deliverable added: docs/product/design-spec.jsonc entry "teachingPlan" — full normative spec for
both role variants (teacher-edit + principal-review), all states (loading/empty/error/draft/
submitted/approved/rejected-with-comments), layout tokens, component list, BE data shape, a11y notes.
i18n: ZERO new keys added — all 52 existing teachingPlan.* keys reused (no drift).
Route: `/teacher/teaching-plan` (edit) · `/principal/teaching-plan` (review)
Roles: `teacher` (soạn + submit), `principal`/`admin` (xem + duyệt)
Design file to create: `design_src/edu/teaching-plan.jsx`

---

## Mục tiêu màn hình

Giáo viên soạn Kế hoạch giảng dạy (PPCT — Phân phối chương trình theo tuần)
cho từng môn học mình phụ trách trong học kỳ. Mỗi tuần liệt kê bài học, tiết
dạy, mục tiêu, ghi chú. Hiệu trưởng xem và phê duyệt kế hoạch trước khi GV
bắt đầu dạy.

---

## Layout chính — Teacher (edit mode)

**Header selectors**: chọn lớp + chọn môn + chọn học kỳ.

**Plan table** (weekly view — tương tự timetable nhưng dọc theo tuần):
```
| Tuần | Tiết | Bài học / Chủ đề       | Mục tiêu      | Ghi chú | Trạng thái |
|------|------|------------------------|---------------|---------|------------|
|  1   |  1-2 | Chương 1: Giới thiệu   | HS hiểu...    |         | Draft      |
|  1   |  3-4 | Bài 1: Khái niệm...    | HS phân tích..|         | Draft      |
|  2   |  1-2 | Bài 2: Ứng dụng...     |               |         | Empty      |
```

- Click vào dòng → inline edit (lesson title, objectives, notes).
- Số tuần = số tuần trong học kỳ (từ Academic Calendar US-E12.2).
- Số tiết / tuần = lấy từ `periodCount` của subject (US-E12.3/US-E12.6).
- "Điền từ kế hoạch năm trước" button: copy từ PPCT học kỳ trước (nếu có).

**Sidebar phải** (panel, 280px):
- Progress: "Đã điền: 18/45 tiết" (progress bar).
- Quick jump: danh sách tuần clickable → scroll table.

**Actions**:
- "Lưu nháp" (outline) — save draft.
- "Nộp kế hoạch" (primary) — submit cho principal review.
- Status chip: Draft / Submitted / Approved / Rejected (with rejection reason).

---

## Layout — Principal (review mode)

Xem PPCT của từng GV: danh sách GV + môn ở cột trái, plan table (read-only) ở
phải. "Phê duyệt" (success) / "Yêu cầu chỉnh sửa" (outline + reason textarea).

---

## States

**Not started**: empty state với icon calendar + "Bắt đầu soạn PPCT cho học kỳ này."
**Approved**: banner success "Kế hoạch đã được phê duyệt ngày DD/MM/YYYY".
**Rejected**: banner warning + rejection reason + "Chỉnh sửa lại".

---

## Tham chiếu màn hình tương tự

- `design_src/edu/timetable.jsx` — weekly grid style, class/subject selectors.
- `design_src/edu/classops.jsx` — ClassLogScreen table style (dạng list dọc với
  filter + status chips).
- `design_src/edu/tokens.js` — màu sắc.

---

## Output cần từ designer

File: `design_src/edu/teaching-plan.jsx`
Component: `TeachingPlanScreen` (teacher) + `TeachingPlanReviewScreen` (principal).
