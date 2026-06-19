# DR-001 — Assessment Scheme Config (Grade Scale & Grade-Scoped Subject Selector)

Status: [x] delivered (2026-06-20)
US: US-E12.6
Route: `/admin/assessment`
Role: `admin`
Design file to create: `design_src/edu/assessment.jsx`

---

## Mục tiêu màn hình

Admin cấu hình **thang điểm** (grade scale) của trường và **khung đánh giá**
(assessment scheme) cho từng môn học theo khối lớp. Đây là bước 4/5 trong luồng
onboarding trường học (sau khi đã thiết lập danh mục môn học).

Màn hình nằm dưới namespace `/admin/assessment`, truy cập từ sidebar admin hoặc
từ nút "Mở" trong School Setup step 4 (`design_src/edu/school-setup.jsx`).

---

## Layout chính

**2-column layout (tương tự subjects.jsx: 40% | 60%)**:

- **Cột trái (40%)**: Cấu hình Grade Scale — danh sách các mức xếp loại điểm
  của trường.
- **Cột phải (60%)**: Assessment Scheme — chọn môn học theo khối lớp, edit cột
  điểm thành phần và trọng số.

Header: page title "Thang điểm & Khung đánh giá" + subtitle "Grade Scale &
Assessment Scheme". Icon: `percent` (lucide), primary color.

---

## Phần 1 — Grade Scale (cột trái)

**Mục đích**: định nghĩa các ngưỡng điểm → xếp loại. Áp dụng toàn trường.

**Preset buttons** (3 nút dạng pill, tương tự school-setup presets):
- "Thang 10" (mặc định VN)
- "Thang 4.0" (GPA)
- "Xếp loại chữ" (A/B/C/D/F)

**Danh sách mức điểm** (sortable list, mỗi dòng):
```
[color swatch 12×12] [label: "Xuất sắc"] [from: 9.5] [to: 10] [badge màu]  [edit] [delete]
[color swatch 12×12] [label: "Giỏi"]     [from: 8.0] [to: 9.4]
[color swatch 12×12] [label: "Khá"]      [from: 6.5] [to: 7.9]
[color swatch 12×12] [label: "Trung bình"][from: 5.0] [to: 6.4]
[color swatch 12×12] [label: "Yếu"]      [from: 0]   [to: 4.9] [error color]
```

**Add mức điểm**: inline row ở cuối list với inputs (label, from, to, color picker).

**Validation warnings** (inline, không block save):
- "Các ngưỡng chưa phủ kín từ 0 đến 10" — hiển thị warning callout.
- "Các ngưỡng bị overlap" — hiển thị error callout.

**Color**: mỗi mức có color (success/primary/warning/error hoặc custom hex).
Badge xếp loại màu tương ứng hiển thị preview.

**Save button**: "Lưu thang điểm" — success toast khi lưu.

---

## Phần 2 — Assessment Scheme (cột phải)

**Mục đích**: định nghĩa cột điểm thành phần (components) và trọng số cho từng
môn học tại từng khối lớp.

**Grade-scoped Subject Selector** (header của cột phải):
- Dropdown 1: chọn khối lớp (từ danh sách grade levels đã cấu hình, VD 10, 11, 12).
- Dropdown 2: chọn môn học trong khối đó (từ subject catalogue, VD "Toán lớp 10").
- Khi chọn xong → hiển thị Assessment Scheme editor cho môn + khối đó.

**Assessment Scheme Editor** (hiển thị sau khi chọn môn):

Heading: "Khung đánh giá — [Tên môn] lớp [N]" + badge khối lớp.

Sub-info (read-only, từ Subject master):
- "Số tiết / năm: 105" (từ `periodCount`)
- "Số bài KT yêu cầu / kỳ: 4" (từ `requiredAssessmentCount`) — hiển thị như
  constraint để đối chiếu khi nhập scheme.

**Danh sách cột điểm** (table-like list):
```
| Cột điểm         | Số lần | Trọng số | Xóa |
|------------------|--------|----------|-----|
| Điểm thường xuyên|   2    |   20%    | [x] |
| Điểm giữa kỳ    |   1    |   30%    | [x] |
| Điểm cuối kỳ    |   1    |   50%    | [x] |
| TỔNG             |   4    |  100%    |     |
```

- Số lần: input number (integer ≥ 1).
- Trọng số: input number + "%" suffix.
- Validation: tổng trọng số phải = 100% (progress bar hoặc số tổng theo thời
  gian thực, màu error nếu ≠ 100%).
- "Thêm cột điểm" button: thêm dòng mới vào cuối list.

**Preset schemes** (pill buttons, tương tự subject-selector):
- "Theo Thông tư 22/2021" (phổ thông: TXL1 20% + GK 30% + CK 50%)
- "THCS Thông tư 26" (TXL1+TXL2 30% + GK 30% + CK 40%)
- "Custom"

**Save button**: "Lưu khung đánh giá". Success toast.

---

## States / Empty / Error

**Empty state** (chưa có scheme cho môn + khối đã chọn):
- Icon clipboard, text "Chưa có khung đánh giá cho môn học này."
- CTA "Tạo khung đánh giá" → hiển thị preset selector + editor rỗng.

**Not-configured state** (chưa setup subjects):
- Warning banner: "Cần thiết lập danh mục môn học trước" + link "Đến Danh mục
  môn học" → `/admin/subjects`.

**Unsaved changes indicator**: header cột phải hiển thị dot indicator + text
"Chưa lưu" khi có thay đổi chưa save.

---

## Role

Chỉ `admin`. Không hiển thị với `principal`, `teacher`, `student`, `parent`.

---

## Dữ liệu mock

Grade scale seed (thang 10):
```js
[
  { label: 'Xuất sắc', from: 9.5, to: 10,  color: '#13DEB9' },
  { label: 'Giỏi',     from: 8.0, to: 9.4,  color: '#5D87FF' },
  { label: 'Khá',      from: 6.5, to: 7.9,  color: '#FFAE1F' },
  { label: 'Trung bình',from:5.0, to: 6.4,  color: '#8898A9' },
  { label: 'Yếu',      from: 0,   to: 4.9,  color: '#FA896B' },
]
```

Assessment scheme seed (Toán lớp 10 — Thông tư 22):
```js
[
  { label: 'Điểm thường xuyên', count: 2, weight: 20 },
  { label: 'Điểm giữa kỳ',     count: 1, weight: 30 },
  { label: 'Điểm cuối kỳ',     count: 1, weight: 50 },
]
```

---

## Tham chiếu màn hình tương tự trong design_src

- `design_src/edu/school-setup.jsx` — layout SectionCard, preset buttons,
  collapsible guide style, step 4 indicator.
- `design_src/edu/subjects.jsx` — 2-column layout (35%/65%), pill subject list,
  dạng master-detail.
- `design_src/edu/subjects-dialogs.jsx` — locked fields style (lock icon + tooltip).
- `design_src/edu/subject-detail.jsx` — `requiredAssessmentCount` field display.
- `design_src/edu/tokens.js` — màu sắc chuẩn.

---

## Output cần từ designer

File: `design_src/edu/assessment.jsx`
Component name: `AssessmentSchemeScreen`
Export: `Object.assign(window, { AssessmentSchemeScreen })`
Routing in `app.jsx`: `{role === 'admin' && section === 'assessment' && <AssessmentSchemeScreen ... />}`
Header title: `t('Thang điểm & Khung ĐG', 'Assessment Scheme')` (đã có trong
`getHeaderTitle` của `app.jsx` cho section `assessment` nếu designer update app.jsx).
