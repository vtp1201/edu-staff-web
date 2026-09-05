# US-E24.10 Tab Khoá học online (teacher) — timeline kéo-thả, sửa ngày, thêm mục; GVCN readonly

## Status

implemented

## Lane

high-risk

> Lý do: mutation lms (`reorderItems` toàn bộ thứ tự, `patchItem` window, tạo lesson/assignment/
> document) — sai body `order` = 404 và không ghi; role gate teacher-of-subject.

## Dependencies

- Depends on: US-E24.8 (shell), US-E24.1 (repo teacher methods có sẵn), US-E24.3 (component
  `course-timeline` với prop `mode`)
- Blocks: none
- Feature module(s) chạm: `features/lms/presentation/course-timeline/**` (implement `mode
  teacher|readonly`), `features/lms/presentation/teacher-course-tab/**` (mới), route actions
  `teacher/classes/[classId]/actions.ts` (thêm), `lms.di.ts` (export create/patch/reorder use-cases)
- Shared contract/file: `course-timeline` dùng chung với student (E24.3) — **1 component, prop
  `mode`**, không fork (decision 0026)

## Product Contract

Design v3: `class-hub.jsx` → `ChCourseTab`; `course-items.jsx` → `CourseTimelinePage` mode
`teacher`/`readonly`, `CiRow` (grip, "Sửa ngày"), add-menu, edit-dates row; `TeacherCoursesScreen`
(chỉ tham khảo — không có route riêng; sidebar teacher KHÔNG có "Khoá học").

- Chọn course: GVBM → course môn mình của lớp (`listCourses(classId, subjectId)`; course mặc định
  auto-provision, `isDefault`); GVCN → dropdown môn của lớp (`GET classes/{id}/subjects`) → course
  môn đó ở **readonly** (ask #7: nếu BE 404 → hiện "Không có quyền xem khoá học môn này"); môn của
  mình → editable. Chip "Chỉ đọc — khoá học của GV bộ môn khác" khi readonly.
- Header: "Chế độ giáo viên — kéo thả để sắp xếp, sửa ngày ngay trên dòng" / "Chỉ đọc — khoá học do
  GV bộ môn quản lý"; "N mục đang mở"; legend 3 trạng thái. Teacher thấy đủ `UPCOMING_HIDDEN`.
- Course DRAFT → banner "Khoá học chưa xuất bản — học sinh chưa thấy" + nút "Xuất bản" (`publish`).
- **Kéo-thả** (HTML5 native `draggable`, không thêm lib) trong toàn timeline (position là toàn
  course, không theo tuần): drop → `reorderItems(courseId, itemIds)` với **toàn bộ** id theo thứ tự
  mới; optimistic UI, rollback + toast khi lỗi (404 `LMS_ITEM_NOT_FOUND` = tập id lệch → refetch).
  Keyboard alternative: nút "Lên/Xuống" trên dòng khi focus (a11y).
- **Sửa ngày** inline: `datetime-local` Mở lúc / Hạn chót, "Để trống = không giới hạn" → `patchItem`;
  EXAM → nút disabled + tooltip "Khung giờ kiểm tra do bài kiểm tra quản lý"
  (`LMS_EXAM_WINDOW_NOT_EDITABLE`). 422 `LMS_ITEM_INVALID_WINDOW` → lỗi field.
- **Thêm mục** (nút pill mỗi nhóm tuần → menu 4 loại): Bài giảng → dialog title(+content) →
  `createLesson`; Bài tập → dialog title/description/startAt/dueAt → `createAssignment{courseId}`;
  Tài liệu → dialog title/url(https)/window → `addDocumentItem` (422 `LMS_ITEM_URL_INVALID`);
  **Kiểm tra** → không tạo ở đây: menu item dẫn sang `/teacher/exam-bank` với note "Bài kiểm tra tạo
  ở Kho đề, tự xuất hiện trên timeline khi xuất bản" (ask #6). Mục mới có `startAt` = tuần đang chọn
  (gợi ý) hoặc null.
- Xoá: chỉ DOCUMENT (`DELETE item`), confirm; LESSON/ASSIGNMENT không có nút xoá (BE 409).
- 500 mục: `LMS_ITEM_LIMIT_EXCEEDED` → toast.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#teacher-class-hub` (tab course), `#student-course-timeline`
- edu-api `services/lms/docs/openapi.yaml`, `ERROR_CODES.md`; ADR core 0143
- `docs/reports/2026-09-02-fe-to-be-asks-adr0143.md` #6 #7
- `.claude/rules/accessibility.md` (keyboard alternative cho drag)

## Acceptance Criteria

- GVBM mở tab → course môn mình, mode teacher; GVCN chọn môn khác → readonly (không grip, không
  chevron, không Sửa ngày/Thêm mục); môn mình → teacher (test resolver role×subject).
- Reorder gửi đúng mảng đầy đủ theo thứ tự mới (integration test); lỗi → rollback thứ tự cũ + toast.
- Sửa ngày: lưu → dòng cập nhật window + state mới từ response; EXAM disabled.
- Thêm Tài liệu url `http://` → lỗi field trước khi gọi BE; `https://` → gọi `addDocumentItem`.
- Thêm Kiểm tra → điều hướng exam-bank, không gọi lms.
- Keyboard: dòng focusable; "Lên/Xuống" đổi thứ tự và gọi reorder; menu Thêm mục là `menu`/`menuitem`.
- DRAFT course → banner + Xuất bản → PUBLISHED (action test).
- Storybook: teacher-3-weeks / readonly / draft-course / exam-row-locked / add-menu / error-reorder.
- i18n `courses.teacher.*` vi+en.
- Gate xanh; design-review + a11y; security: actions kiểm tra role teacher + classId thuộc lớp mình
  trước khi gọi use-case (authCtx, decision 0063).

## Design Notes

- Use-cases mới export DI: `makeReorderItemsUseCase`, `makePatchItemUseCase`,
  `makeAddDocumentItemUseCase`, `makeCreateLessonUseCase`, `makeCreateAssignmentUseCase`,
  `makePublishCourseUseCase`, `makeDeleteItemUseCase` (repo có method từ E24.1; thêm nếu thiếu
  `publishCourse`, `deleteItem`).
- Client: TanStack Query cho items của course (key `['lms','course',courseId,'items']`) với optimistic
  reorder (onMutate/onError rollback) — đây là nơi TanStack hợp lý (mutation nhiều, cần rollback).
- UI: `course-timeline` thêm `mode` branches; `teacher-course-tab/{subject-picker.tsx, add-item-menu.tsx,
  edit-window-row.tsx, create-item-dialog.tsx}`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mode resolver, reorder array builder, window validation |
| Integration | actions + repo mock http (order body, 404/409/422 mapping) |
| E2E | Storybook drag (pointer) + keyboard reorder |
| Platform | tsc/vitest/build |
| Release | design-review + a11y + security |

## Harness Delta

None.

## Evidence

Commits: 4e66d3c0 (plan/architecture/state) + d9c364bd (domain+infra mutations)
+ b1f86021 (server actions, subject-gated) + b8e7afd1 (teacher/readonly
course-timeline + class-hub wiring — last TabPlaceholder removed, all 4
class-hub tabs now real) + ee99675c (storybook) + b741f27e (fix: review+a11y)
+ ec1ad1d7 (memory).

Tech-lead review: **APPROVED** (fe-tech-lead-reviewer, high-risk lane). Regression
on shared `course-timeline` verified clean — student mode path provably
untouched (early `mode === "student"` return, every new prop optional with a
today-preserving default, only assertion removed was the now-obsolete
"throws for unimplemented teacher/readonly mode" case). Security: `assertOwnCourseSubject`
runs first in all 7 mutations, scope source (`TeacherClass.subjects` from
token-scoped `teachingSubjectIds`) verified genuinely trustworthy, not
cosmetic; forge-role test drives all 7 actions with 2 forge scenarios + a
forged cross-class courseId, asserting zero use-case calls. BE contract
ground-truthed against edu-api lms openapi.yaml + ERROR_CODES.md — reorder
body is complete ordering, patch window three-state, 2 new failure codes
(`LMS_COURSE_INVALID_STATUS_TRANSITION`→already-published,
`LMS_ASSIGNMENT_COURSE_NOT_PUBLISHED`→course-not-published) both real. State:
exactly 1 optimistic mutation (reorder, onMutate/onError rollback), 6 others
onSuccess-only; keyboard "Lên/Xuống" reuses the identical mutation as
drag-drop. 1 SHOULD FIX (ARCHIVED class-subjects not filtered from GVCN
picker) + 1 CONSIDER (dead eslint-disable comment, Biome-only repo) — both
closed in b741f27e.

A11y audit: 1 Major (WCAG 2.4.3/4.1.3 — native `disabled` on keyboard reorder
buttons dropped focus to `<body>` when a row hit the list boundary, no live-
region confirmation) + 2 Minor (empty-state body copy shared across 3 distinct
reasons; advisory-only `--edu-info` dot below 3:1, pill text already carries
the info so 1.4.1 is satisfied) — 0 Blocking/Critical. Screen praised as one
of the most pre-emptively-hardened in the repo (AA-safe token maps, 44px
touch targets via Button primitive baseline, real Radix DropdownMenu for
add-item, labeled datetime-local fields, DestructiveConfirmDialog reused not
forked). A11Y-001 closed: `aria-disabled` + no-op-guard replaces native
`disabled` (button stays focusable, never drops out of tab order) + new
sr-only `role="status"` live region announces new position + Storybook test
asserts `document.activeElement` is not `document.body` after hitting a list
boundary. A11Y-002 closed: 3 distinct empty-state body i18n keys replace the
shared `readonlyPill` text. A11Y-003 deferred (design-system token gap, not
this story's scope).

Design review: pass
- design-system: conform — tokens-only throughout (verified via raw-color
  grep on all changed .tsx, zero hits outside an explanatory code comment);
  StatusBadge/TONE_TEXT_ACCESSIBLE reuse for all state pills; matches
  design-spec.jsonc teacher-class-hub course tab + student-course-timeline
  shared contract (mode prop, not a fork).
- a11y: WCAG AA OK post-fix — keyboard reorder retains focus at list
  boundaries with sr-only position announcement, add-item menu is real
  Radix role="menu"/menuitem, datetime-local fields properly labeled with
  aria-invalid/aria-describedby, EXAM lock is visible text (not title
  tooltip), 44px touch targets via Button primitive baseline even on
  visually-compact icon buttons, single h1 (CourseHeader) → h2 (WeekSection)
  hierarchy preserved.
- impeccable audit: code-level pass — no anti-pattern tells; 2-column-free
  timeline layout and inline edit-window disclosure are design-spec-prescribed,
  not ad-hoc.
- states: teacher-3-weeks/readonly/draft-course/exam-row-locked/add-menu/
  error-reorder + keyboard-reorder-boundary all covered in Storybook
  (23/23 interaction tests on the 2 changed story files, full suite
  166 files/1342+ tests); mobile 375 does not overflow (flex-wrap control
  cluster verified).

Test proof: unit (mode resolver role×subject, reorder array builder edge
cases, window validation three-state) + integration (7 mutation actions ×
forge-role sweep + BE error-code mapping ground-truthed, class-subjects
cursor-pagination + ARCHIVED filter) + Storybook interaction (teacher/readonly/
draft/exam-locked/add-menu/error-reorder/keyboard-boundary-focus-retention) —
575 files/4798 tests + 166 files/1342+ storybook tests, all green.
`bunx tsc --noEmit`, `bun lint` (2 pre-existing unrelated warnings in
messaging, confirmed via `git diff main` = empty on that file), `bun run build`
all green. Pre-push gate green on all pushed commits.

Descoped/deferred:
- A11Y-003 (`--edu-info` dot contrast) — design-system token gap, not
  actionable by a single story; pill text already satisfies 1.4.1.
- Subject-ownership gate is defense-in-depth, not BE parity — `lms` enforces
  course-level teaching assignment but has no GVCN-vs-GVBM distinction yet
  (epic ask #7 still open). Documented plainly so a future reader doesn't
  mistake it for BE parity.
- `GET /classes/{id}/subjects` now has a 3rd FE consumer (after E24.7's
  subject catalogue read and one other) — a 4th consumer should extract a
  shared read instead of a 4th copy.
- No new design token, no ADR required — `LmsFailure`'s 2 new members
  (`already-published`, `course-not-published`) are a type addition, not an
  architecture change.
