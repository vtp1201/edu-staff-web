# US-E24.4 Gộp "Bài tập" / "Bài kiểm tra" thành tab lọc xuyên môn trong Khoá học

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E24.2 (trang courses v2), US-E24.3 (`item-type-chip`, `item-state-pill` shared)
- Blocks: none
- Feature module(s) chạm: `src/features/lms/presentation/student-courses/**` (thêm view),
  `src/components/layout/app-shell/sidebar/nav-config.ts`, route `student/assignments/page.tsx`,
  `student/exams/page.tsx` (→ redirect), `student/exams/[examId]` GIỮ
- Shared contract/file: **`nav-config.ts`** và `messages/*` — serialize với nhánh teacher (E24.8 cũng
  sửa nav-config? KHÔNG — E24.8 không đổi nav; chỉ E24.4 đổi student nav). `features/exam` không đổi.

## Product Contract

Design: `course-items.jsx` → `CrossSubjectList`; `student.jsx` pill row "Môn học / Bài tập /
Bài kiểm tra". Quyết định user: **Q-C redirect**.

- `/student/courses?view=all|assignment|exam` (URL state, default `all`). Pill row trên cùng:
  Môn học · Bài tập · Bài kiểm tra.
- `assignment`/`exam`: banner info "Danh sách này lọc mọi … từ timeline của tất cả môn học — bài
  sắp hết hạn xếp trước."; sub-tab gạch chân có count: Đang mở · (Sắp mở — **chỉ ở exam**, D7) ·
  Đã đóng. Row = chip loại, tiêu đề, `Badge` màu môn, khung thời gian (+ "còn N giờ" đỏ khi OPEN
  ≤48h), "✓ Đã nộp" nếu có submission (assignment: `getMySubmission`… → chỉ gọi khi mở hàng?
  KHÔNG: dùng `Assignment`/`Submission` list per course — chấp nhận N course × 1 call
  `listAssignments(courseId)` + submission `me` theo nhu cầu; hoặc hiển thị "Đã nộp" chỉ khi dữ liệu
  có sẵn — ghi rõ trong VM là optional).
- Nút: exam OPEN chưa nộp → "Vào làm bài" → `examUrl` hoặc `/student/exams/[examId]`; còn lại →
  "Xem trong khoá học" → `/student/courses/[courseId]`.
- Empty theo nhóm: "Không có mục nào trong nhóm này."
- **Sidebar student**: xoá `/student/assignments`, `/student/exams`. `nav-config.test` cập nhật.
  `DEFAULT_ROUTE` không đổi.
- **Redirect**: `student/assignments/page.tsx` → `redirect('/…/student/courses?view=assignment')`
  (giữ locale + tenant qua helper hiện có); `student/exams/page.tsx` → `?view=exam`. Xoá
  `student-assignments/**` presentation + `exam-list` presentation **nếu** không còn nơi dùng
  (grep trước; `exam-briefing/taking/result` GIỮ). page.test.ts cũ đổi thành test redirect.
- Hardcoded `MOCK_STUDENT_ID = "current-student"` trong `exams/page.tsx` biến mất cùng redirect.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#student-course-timeline` (cross-subject block)
- `docs/product/screens.md` hàng Assignments/Exams (đổi thành redirect note)
- `.claude/rules/i18n.md`, `component-organization.md`

## Acceptance Criteria

- Sidebar student = Tổng quan, Khoá học, Điểm số, Hạnh kiểm, Lịch học, Nhắn tin, Hồ sơ (nav-config test).
- `GET /student/assignments` → 307/308 tới `/student/courses?view=assignment`; `/student/exams` →
  `?view=exam`; `/student/exams/[examId]` vẫn render (test không đổi).
- `view=assignment`: không có sub-tab "Sắp mở"; `view=exam`: có, và EXAM UPCOMING_HIDDEN nằm đó.
- Sort: OPEN theo `dueAt` tăng (null cuối); UPCOMING theo `startAt`; CLOSED theo `dueAt` giảm (unit test).
- Urgent (≤48h): border error-tint + text "còn N giờ" (N ≥1), có icon — không chỉ màu.
- Sub-tab là `role="tablist"`/`tab` với `aria-selected`; count trong badge có `aria-label`.
- URL đổi → nội dung đổi, back/forward hoạt động (URL là state, không `useState`).
- Storybook: all / assignment-open-urgent / exam-upcoming / closed / empty.
- i18n: `courses.views.*`, `courses.cross.*`; xoá keys `assignments.*`/exam list không còn dùng
  (kiểm `tsc` phát hiện key chết? — không; grep thủ công + ghi Evidence).
- Gate xanh; design-review + a11y pass.

## Design Notes

- Queries: reuse `listCourses` + `listItems`×N (đã tải cho card view — chia sẻ 1 fetch trong page,
  truyền xuống cả 2 view). Không TanStack Query cần thiết nếu RSC đủ; nếu client filter → chỉ state URL.
- UI: `student-courses/{view-switcher.tsx, cross-subject-list.tsx, cross-subject-row.tsx}`.
- Tokens: badge môn = `Badge` với color prop từ subject palette (đã có map môn→token ở
  `presentation/tone.ts`).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | sort/group, urgent calc (now inject), nav-config |
| Integration | redirect page tests; courses page với `view` param |
| E2E | Storybook tab switching |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Harness Delta

`docs/product/screens.md`: 2 hàng route cũ → "redirect (US-E24.4)".

## Evidence

(điền sau)
