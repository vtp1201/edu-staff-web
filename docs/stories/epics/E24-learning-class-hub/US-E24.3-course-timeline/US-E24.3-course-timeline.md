# US-E24.3 Chi tiết khoá học = 1 timeline dọc theo tuần (student mode)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E24.1, US-E24.0b
- Blocks: US-E24.5 (player mở từ dòng timeline), US-E24.10 (teacher mode tái dùng component)
- Feature module(s) chạm: `src/features/lms/presentation/lesson-player/**` (đổi tên →
  `course-timeline/`), `src/features/lms/domain/use-cases/group-items-by-week.ts`
- Shared contract/file: `components/shared/status-badge` (dùng lại), `messages` namespace `courses`

## Product Contract

Design: `design_src/edu/course-items.jsx` → `CourseTimelinePage`, `CiRow`, `CiStatusPill`,
`CiTypeChip`; design-spec `student-course-timeline`. Route `/student/courses/[courseId]`.

- Header course: icon môn, tên, GV, "N mục đang mở", legend 3 trạng thái (Sắp mở / Đang mở /
  Đã đóng — chỉ xem) bằng màu + chữ.
- MỘT timeline dọc: rail + dot màu theo state; nhóm theo tuần; mỗi dòng = chip loại (Bài giảng
  `play`/primary, Bài tập `clipboard`/warning-text, Kiểm tra `fileText`/error-text, Tài liệu
  `link`/teal), tiêu đề, "Loại · khung thời gian" (`ciWindow`: `start → due` | `Mở từ` | `Hạn` |
  `Luôn mở`), pill trạng thái.
- **D7**: student chỉ thấy item BE trả về; `UPCOMING_HIDDEN` chỉ xuất hiện ở EXAM → hiện 🔒 +
  "Sắp mở", dòng mờ 0.72, không click. Không tự tính state từ clock.
- Click dòng (OPEN/CLOSED) → `/student/courses/[courseId]/items/[itemId]` (E24.5). Cho tới khi
  E24.5 merge, click mở expand inline như design (CiItemDetail) — phần expand là **tạm**, E24.5 gỡ.
- Empty: "Giáo viên chưa thêm nội dung cho khoá học này."
- Week grouping (domain pure `groupItemsByWeek(items, locale)`): key = ISO week của `startAt`;
  `startAt=null` → nhóm đầu "Luôn mở"; nhãn "Tuần dd/MM – dd/MM" (ask #5: khi BE có số tuần →
  "Tuần 30 · dd/MM – dd/MM"). Sort tuần tăng dần, item trong tuần theo `position`.
- Component nhận prop `mode: 'student' | 'teacher' | 'readonly'` từ đầu (E24.10 dùng) nhưng US này
  chỉ implement `student`; `teacher/readonly` throw/notImplemented có test.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#student-course-timeline`; `docs/product/screens.md`
- `.claude/rules/design-system.md` §Status/badge; `accessibility.md`

## Acceptance Criteria

- Render đúng nhóm tuần + thứ tự; item `startAt` null nằm nhóm "Luôn mở" (unit test grouping với
  fixture 3 tuần + null + closed).
- Pill trạng thái: `OPEN` success-text, `UPCOMING_HIDDEN` info, `CLOSED` muted — mỗi pill có chữ.
- Dòng CLOSED: tiêu đề `text-muted-foreground`, vẫn click được (xem để ôn tập).
- EXAM UPCOMING: có icon lock + `aria-disabled`, không điều hướng, tooltip "Nội dung sẽ mở lúc …".
- Header đếm đúng "N mục đang mở" (state OPEN).
- Course không tồn tại/403 → `notFound()` (giữ hành vi E24.1); timeline lỗi nhưng course OK →
  banner lỗi + retry, header vẫn hiện (giữ contract degrade E24.1).
- Keyboard: dòng là `<a>` hoặc button; tab order theo thứ tự đọc; focus ring.
- Storybook: 3-weeks / with-upcoming-exam / all-closed / empty / error / loading; mobile 375 không
  vỡ (rail 34px + card co).
- i18n vi+en: `courses.timeline.*` (legend, alwaysOpen, weekLabel, opensAt, closedReadOnly, empty).
- Gate xanh; design-review + a11y pass.

## Design Notes

- Queries: `getCourse`, `listItems` (đã có), gộp trong page RSC.
- Domain: `group-items-by-week.ts`, `format-item-window.ts` (pure, locale-aware qua Intl).
- UI: `course-timeline/{course-timeline.tsx, timeline-row.tsx, item-type-chip.tsx,
  item-state-pill.tsx, course-header.tsx}` — `item-type-chip`/`item-state-pill` sẽ được E24.4/E24.5
  dùng → đặt trong `features/lms/presentation/shared/` ngay (1 nơi, decision 0026).
- Tokens: rail `bg-border`, dot OPEN `bg-edu-success-text`, UPCOMING `bg-edu-info`, CLOSED `bg-border`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | grouping, window formatting, state→tone mapping |
| Integration | page.test.ts (RSC) |
| E2E | Storybook interaction (click row → href; upcoming exam not navigable) |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Harness Delta

None.

## Evidence

(điền sau)
