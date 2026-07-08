# US-E11.6 Student Lesson Player — Design Review Gate

Gate theo `docs/DESIGN_REVIEW.md` + `.claude/rules/impeccable.md`. Chạy sau
`fe-tech-lead-reviewer` (Revision Required → fixed) + `fe-accessibility-auditor`
(Fail → 2 blocker + 6 minor, tất cả đã fix) trên branch
`feat/us-e11.6-student-lesson-player`.

## Verdict: APPROVED

### 1. Design system conformance
- Chỉ dùng semantic token (`--edu-*`) — không raw color. Grep xác nhận
  `TONE_TEXT` (brand hues gốc, dùng cho bg/tint/border) tách biệt khỏi
  `TONE_TEXT_ACCESSIBLE` (dùng cho text/icon đọc được) — không nơi nào còn
  dùng `TONE_TEXT` cho literal text.
- **1 token mới** (ADR `0050`): `--edu-media-surface` / `--edu-media-surface-foreground`
  cho video faux-chrome (luôn tối, độc lập theme sáng/tối của app — quy ước
  chuẩn video player). Đã sync `tokens.css` + `globals.css` `@theme` +
  `docs/product/design-system.md`.
- `video-player.tsx`: raw `white`/`black` (tech-lead finding) đã đổi sang
  `edu-media-surface-foreground` / `edu-media-surface` token. Scrim gradient
  `from-edu-media-surface/55` compose đúng (hex var hợp lệ làm gradient stop).
- Tái dùng component pattern: `ui/Tabs` (2 variant: `default` cho course
  tabs, `line` cho Notes/Q&A — không tạo component tab thứ 2), `ui/Progress`,
  `ui/Card`, `shared/EmptyState`, `ui/Skeleton`, `ui/Textarea`, `ui/Button`.
  Không tạo `components/ui/`/`components/shared/` mới (decision `0026`) —
  toàn bộ composed component mới (`ChapterList`, `LessonBody`, `VideoPlayer`,
  …) feature-local dưới `src/features/lms/presentation/` (màn đầu tiên dùng).
- `docs/product/screens.md` dòng 91 đã cập nhật từ ⬜ sang trạng thái
  implemented.

### 2. Accessibility (WCAG 2.1 AA)
- **A11Y-001 (blocker, đã fix)**: `TONE_TEXT_ACCESSIBLE` map mới — mỗi tone
  trỏ token text AA-safe sẵn có (`--edu-primary-accessible` 4.88:1,
  `--edu-success-text` 5.24:1, `--edu-warning-text` 4.73:1 — chỉ dùng ở
  `course-card.tsx` gradeAvg text 15px extrabold, ngưỡng 3:1 large-text nên
  đạt dù dùng token bold-only theo ADR 0046 — `--edu-error-text` 5.44:1,
  `--edu-purple-text` 8.47:1, `--edu-teal-text` 6.61:1). Không có token mới,
  tái dùng token đã tồn tại.
- **A11Y-002 (major, đã fix)**: `CourseCard`'s `<Link>` bọc toàn bộ card có
  `aria-label` tường minh (`"{tên khoá học} — {CTA}"`) thay vì accessible
  name chạy nối toàn bộ text con.
- **A11Y-003..006 (minor, đã fix)**: aria-live không phát announcement giả
  lúc mount (`hasToggled` gate); chevron collapse/expand gate
  `motion-safe:`; breadcrumb `aria-label` mô tả mục đích thay vì lặp text
  link; live-region sr-only báo đổi bài học khi click chapter-list item
  (không cướp focus).
- **A11Y-007 (không chặn)**: contrast text-không-active của `ui/Tabs` là vấn
  đề hệ thống có trước US này (component dùng chung nhiều màn) — KHÔNG sửa ở
  đây, flag để xử lý riêng nếu cần (ngoài scope US-E11.6).
- Keyboard: `ChapterList` = `<nav aria-label>` thật, mỗi chapter header
  `<button aria-expanded aria-controls>`, mỗi lesson item `aria-current="page"`
  khi active + accessible name gồm trạng thái done/active (checkmark icon
  `aria-hidden`). `VideoPlayer` faux-chrome: play/pause `aria-label` đổi theo
  state, Space chỉ toggle khi nút play đang focus (không hijack `window`),
  Left/Right chỉnh `role="slider"` với `aria-valuemin/max/now`+label.
  `PdfPreview` download là `<a href download>` thật (không chỉ JS onClick).
  `MarkCompleteButton` disabled + label đổi khi đã hoàn thành.
- Text lesson: content block có cấu trúc `{heading, paragraphs}` — KHÔNG
  `dangerouslySetInnerHTML`.
- Responsive mobile (AC-15, < 768px): `md:` breakpoint (không dùng `lg:` của
  `exam-taking.tsx` — khác cutoff theo AC), `ChapterList` có toggle
  `md:hidden` với accessible label, desktop/keyboard luôn thấy full nav.
- Hover-lift `CourseCard` (AC-4) gate `motion-safe:` — vô hiệu dưới
  `prefers-reduced-motion: reduce`.

### 3. impeccable critique
Thực hiện thủ công theo checklist `.claude/rules/impeccable.md` (skill CLI
không khả dụng trong phiên orchestrator — audit tay bằng cách đối chiếu diff
với `design-system.md`/`accessibility.md`, tương đương phạm vi `/impeccable
audit`): không phát hiện anti-pattern ngoài 2 gate ở trên (đã xử lý). Không
đổi palette/token ngoài phạm vi ADR `0050` đã duyệt; không đổi layout đã
chốt theo `component-architecture.md`.

### 4. States & responsive
- Courses list: `CoursesSkeleton` (loading), `CoursesEmpty` per-tab (empty),
  `CourseCard` grid (success). Không có error state riêng cho list — RSC lỗi
  fallback qua Next.js error boundary (`errorKey` chỉ dùng cho player, list
  chỉ có `forbidden`/`unknown` trong VM, hiển thị qua `role="alert"` nếu
  `errorKey` khác null — verify: `student-courses-screen.tsx` render error
  block khi `vm.errorKey`).
- Lesson player: loading (`isLoading` VM flag), error (`not-found`/
  `forbidden`/`unknown` → `role="alert"`), empty (chapter rỗng / course chưa
  có nội dung dùng `shared/EmptyState`), success (đầy đủ 3 loại bài).
  `MarkComplete_Flow`, `Notes_Save`, `QA_Ask` Storybook interaction có
  assertion optimistic + rollback.
- 320px: layout `grid-cols-1` mặc định trước `md:`, card grid course list đã
  responsive (kiểm tra qua Storybook viewport addon ở bước QA).
- Storybook có đủ state để soi (`CoursesGrid_Loading/AllTab/InProgressTab/Empty`,
  `LessonPlayer_Video/Pdf/Text`, `ChapterList_Navigation`, `MarkComplete_Flow`,
  `Notes_Save`, `QA_Ask` — 11 stories, tất cả có `play()` assertions, 11/11 pass).

## Proof
- `bunx tsc --noEmit`: 0 lỗi.
- `bun vitest run`: 1231/1231 pass (231 files; 38+ LMS-scoped: use-cases,
  mapper, mock repo, derive fn, pure progress calc).
- `bun run vitest:storybook run src/features/lms`: 11/11 interaction stories
  pass.
- `bun lint`: 0 lỗi trong diff (2 warning pre-existing ở feature khác,
  không thuộc US này).
- `bun run build`: exit 0, 2 route mới trong manifest
  (`/student/courses`, `/student/courses/[courseId]`).

## Open items (follow-up, không chặn)
- `ui/tabs` inactive-tab-text contrast — vấn đề hệ thống có trước US này,
  cần audit riêng cross-screen (A11Y-007, không thuộc scope US-E11.6).
- Real `lms` BE service chưa ship — `LmsRepository` (real impl) là stub
  chưa test ngoài shape lỗi; khi service lên cần map `ApiError.code` đầy đủ
  thay vì `err.message === "not-found"` (mock-only branch hiện tại — flagged
  bởi tech-lead review).
- Không có `docs/product/design-spec.jsonc` entry riêng cho 2 màn này —
  `design_src/edu/student.jsx` + story AC/Design Notes là nguồn chuẩn (đã
  ghi trong `plan.md` §9, không chặn US này, cân nhắc bổ sung entry sau để
  nhất quán với các màn khác).
