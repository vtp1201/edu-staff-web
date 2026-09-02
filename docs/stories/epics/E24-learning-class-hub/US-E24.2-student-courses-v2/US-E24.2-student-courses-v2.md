# US-E24.2 Khoá học của tôi v2 — card "sắp đến hạn" + "N mục đang mở"

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E24.1 (contract + `features/lms` mới), US-E24.0b (mockup v3)
- Blocks: US-E24.4 (tab xuyên môn dùng chung trang), US-E24.3 (điều hướng card → timeline)
- Feature module(s) chạm: `src/features/lms/presentation/student-courses/**`,
  `src/features/lms/domain/use-cases/` (thêm `summarize-course.ts` pure)
- Shared contract/file: `messages/{vi,en}.json` namespace `courses`; `nav-config.ts` KHÔNG đổi ở US này

## Product Contract

Design: `design_src/edu/course-items.jsx` → `StudentCoursesV2`, `ciCourseSummary`;
design-spec `student-course-timeline` (phần cards). Mỗi card môn hiển thị: tên môn, GV, ô
"Sắp đến hạn" (mục có `dueAt` gần nhất còn mở; nền warning khi ≤48h), dòng "N mục đang mở",
CTA "Vào khoá học". **Bỏ** % tiến độ và điểm TB (BE chưa có — US-254 draft).

Data: `listCourses(classId)` (đã có) rồi `listItems(courseId)` cho từng course (N+1 chấp nhận
tạm — ask #4 xin `courses/me` có summary; khi có thì chỉ đổi repo). Summary tính ở domain
(`summarizeCourse(items, now)`: `openCount` = items `state === 'OPEN'`; `nextDue` = item OPEN có
`dueAt` nhỏ nhất ≥ now). `now` inject (test deterministic). Chỉ dùng item student nhìn thấy
(BE đã lọc UPCOMING_HIDDEN trừ EXAM — không lọc lại ở client, chỉ tính `state`).

Class của student: `resolve-my-class.ts` (đã có từ E24.1).

## Relevant Product Docs

- `docs/product/design-spec.jsonc#student-course-timeline`, `docs/product/screens.md` hàng student Courses
- `docs/reports/2026-09-02-fe-to-be-asks-adr0143.md` #4
- `.claude/rules/design-system.md` (StatCard/Badge patterns), `component-organization.md`

## Acceptance Criteria

- Given student có 6 course, When mở `/student/courses`, Then thấy grid card (≥300px, auto-fill),
  mỗi card có màu môn, tên, GV, ô sắp đến hạn hoặc "Không có mục nào sắp đến hạn.", "N mục đang mở".
- Given mục due ≤48h, Then ô sắp đến hạn dùng tone warning (`bg-edu-warning-light`,
  `text-edu-warning-text`) + icon clock; >48h dùng muted. Không truyền nghĩa chỉ bằng màu (có nhãn).
- Given course không có item, Then card vẫn render với "0 mục đang mở".
- Given `listItems` 1 course lỗi, Then card đó hiện summary "—" + tooltip lỗi, các card khác bình thường
  (degrade từng card, không error toàn trang).
- Loading: skeleton grid; empty: "Chưa có khoá học" (reuse `courses-empty.tsx`); error toàn trang khi
  `listCourses` fail (reuse pattern hiện tại).
- Card là `<a>`/Link tới `/student/courses/[courseId]`; focus ring visible; toàn card 44px+ target.
- Unit: `summarizeCourse` (openCount, nextDue chọn đúng, bỏ CLOSED, dueAt null, now inject).
- Storybook: default / due-soon / empty-course / partial-error / loading / empty / error.
- i18n vi+en: `courses.card.dueNext`, `courses.card.nothingDue`, `courses.card.openCount`,
  `courses.card.open`; xoá key % tiến độ/điểm TB không còn dùng.
- Design-review gate pass; a11y audit pass. `tsc`, `vitest`, `build` xanh.

## Design Notes

- Commands: none. Queries: `listCourses`, `listItems` ×N (server, trong page RSC hoặc 1 use-case
  `ListCoursesWithSummaryUseCase` gọi song song `Promise.allSettled`).
- UI surfaces: `student-courses-screen.tsx` (rewrite card), `course-card.tsx`.
- Domain rules: xem Product Contract. Không dùng `Date.now()` trong component — nhận `now` từ VM.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `summarize-course.test.ts`, use-case allSettled test |
| Integration | page.test.ts render RSC với mock DI (pattern E24.1) |
| E2E | Storybook interaction stories |
| Platform | tsc/vitest/build |
| Release | design-review gate + a11y |

## Harness Delta

None.

## Evidence

(điền sau)
