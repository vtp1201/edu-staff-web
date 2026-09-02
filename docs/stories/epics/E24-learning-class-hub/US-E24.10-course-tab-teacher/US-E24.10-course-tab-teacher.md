# US-E24.10 Tab Khoá học online (teacher) — timeline kéo-thả, sửa ngày, thêm mục; GVCN readonly

## Status

planned

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

(điền sau)
