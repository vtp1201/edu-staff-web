# US-E24.1 Re-point LMS contract lên `services/lms` thật (course_items, ADR 0143) — supersede ADR 0073

## Status

planned

## Lane

high-risk

> Lý do high-risk: đổi public contract tiêu thụ (endpoint + DTO) của cả `features/lms`,
> gỡ force-mock (ADR 0073) → real mode đổi hành vi 2 màn student; thêm 2 ADR.

## Dependencies

- Depends on: none (BE đã ship: edu-api `af648068`, `services/lms/docs/openapi.yaml`)
- Blocks: US-E24.2, E24.3, E24.4, E24.5, E24.10
- Feature module(s) chạm: `src/features/lms/**` (domain entities/repo interface/use-cases,
  infrastructure dtos/mappers/repositories), `src/bootstrap/endpoint/lms.endpoint.ts`,
  `src/bootstrap/di/lms.di.ts`
- Shared contract/file: `LMS_EP` (chỉ `features/lms` dùng — `QUESTION_BANK_EP` cùng file
  KHÔNG đổi), `.claude/rules/api-integration.md` (bảng Source of truth)

## Product Contract

Ground truth 2026-09-02 (`docs/reports/2026-09-02-be-to-fe-contract-update.md` §3 + ask #51):
`services/lms` đã live qua Kong. Mọi path có thêm segment `lms`: qua gateway là
**`/lms/api/v1/lms/...`** (Kong route `/lms/api/v1`, strip, upstream `http://lms:3004/api/v1`).
Mirror hiện tại `LMS_EP` sai path và sai shape; `lms.di.ts` force-mock vô điều kiện (ADR 0073).

Sau story này:

1. `LMS_EP` khớp `openapi.yaml`:
   - `courses(classId?)` → `GET /lms/api/v1/lms/courses?classId=`; `course(id)`; `publish(id)`
   - `lessons(courseId)`, `lesson(courseId, lessonId)`
   - `items(courseId)`, `itemDocuments(courseId)`, `itemsOrder(courseId)`, `item(courseId, itemId)`
   - `assignments(courseId?)`, `assignment(id)`, `submissions(id)`, `mySubmission(id)`,
     `submission(id, studentUserId)`
   - **Xoá**: `completeLesson`, `note`, `questions`, `students/{id}/assignments` (BE: không có /
     không planned / draft US-254).
2. Domain mới theo contract: `Course{id,classId,subjectId,title,description,status,isDefault,
   publishedAt}`, `CourseItem{id,itemType,refId,title,description,url,position,startAt,dueAt,
   state, exam?:{examId,scheduledDate,durationMinutes,examUrl}}`, `Assignment{…,courseId,
   startAt,dueAt,state}`, `Submission{assignmentId,studentUserId,content,status,submittedAt}`.
   `state` là **của BE** (`UPCOMING_HIDDEN|OPEN|CLOSED`) — không tính client.
3. Failure union map theo `error.code`: `LMS_COURSE_NOT_FOUND`(404), `LMS_ITEM_NOT_FOUND`,
   `LMS_ITEM_NOT_OPEN`(404), `LMS_ITEM_CLOSED`(409), `LMS_ITEM_NOT_DOCUMENT`(409),
   `LMS_EXAM_WINDOW_NOT_EDITABLE`(409), `LMS_ITEM_URL_INVALID`/`LMS_ITEM_INVALID_WINDOW`(422),
   `LMS_ITEM_LIMIT_EXCEEDED`(409), `LMS_SUBMISSION_ALREADY_SUBMITTED`(409).
4. `lms.di.ts` về pattern `USE_MOCK ? MockLmsRepository : LmsRepository(http)`; mock repo
   implement cùng interface mới với fixture theo `CI_ITEMS` của design (4 loại, state đủ 3).
5. Use-case cũ không còn contract (`MarkLessonComplete`, `GetNote/SaveNote`,
   `ListQuestions/AskQuestion`) → **xoá** cùng UI gọi chúng trong `lesson-player` (notes/Q&A
   panel, mark-complete) hoặc stub tối thiểu để build xanh — E24.3/E24.5 sẽ thay màn này.
   Ưu tiên: xoá, không giữ dead code.
6. ADR **0075** "adopt course_items; supersede 0073" (mẫu 0053..0061) + ADR **0076**
   "mock-first theo `services/<svc>/docs/openapi.draft.yaml` (mirror edu-api ADR 0147)";
   thêm hàng `openapi.draft.yaml — draft, chưa deploy` vào bảng Source of truth
   `.claude/rules/api-integration.md`; sửa ghi chú `/lms` trong §Service map (không còn
   "chưa tồn tại").

## Relevant Product Docs

- `docs/reports/2026-09-02-be-to-fe-contract-update.md` §3, §4
- `docs/reports/2026-09-02-fe-to-be-asks-adr0143.md`
- edu-api: `services/lms/docs/openapi.yaml`, `INTEGRATION.md`, `ERROR_CODES.md`,
  `docs/decisions/0143-course-container-course-items-and-exam-metadata-projection.md`
- `docs/decisions/0073-force-mock-lms-student-consumption.md`, `0074-member-id-claim-over-sub.md`
- `.claude/rules/api-integration.md`

## Acceptance Criteria

- Mọi hàm trong `LMS_EP` trả path bắt đầu `/lms/api/v1/lms/` và khớp 1:1 với `openapi.yaml`
  (unit test snapshot đường dẫn; không còn `/lms/api/v1/courses`, `/students/`, `/note`,
  `/questions`, `/complete`).
- Mapper DTO→Entity có unit test cho: item 4 loại; `exam` block null-safe; `startAt/dueAt`
  null; `state` giữ nguyên từ DTO.
- Repository (integration test với mock http): `listItems` → mảng theo thứ tự BE; `submit`
  lần 2 → failure `already-submitted` từ code 409; course authz → failure `course-not-found`
  từ 404 (không phải mảng rỗng); `reorderItems` gửi đúng body `{ itemIds }`.
- Unit test DI: `USE_MOCK=false` → `LmsRepository`; `USE_MOCK=true` → `MockLmsRepository`
  (đảo ngược test của US-E18.60).
- Smoke thật qua Kong (`NEXT_PUBLIC_USE_MOCK=false`, token student demo): `GET
  /lms/api/v1/lms/courses?classId=<lớp demo>` 200 với envelope; ghi curl vào Evidence
  (nếu chưa có course PUBLISHED cho lớp demo → ghi rõ, không block).
- Không còn tham chiếu ADR 0073 là hiện hành: file 0073 thêm dòng `Superseded by 0075`.
- Trang `/student/courses` và `/student/assignments` **vẫn render** (mock hoặc real) — không
  crash; nội dung UI mới là việc của E24.2–E24.5.
- `bunx tsc --noEmit`, `bun vitest run`, `bun build` xanh; `bun lint` sạch.
- `docs/product/screens.md` 2 hàng student LMS: bỏ ghi chú "force-mocked pending ask #51".

## Design Notes

- Commands: `submitAssignment(assignmentId, content)`, `reorderItems(courseId, itemIds[])`,
  `patchItem(courseId, itemId, {startAt?, dueAt?, title?, url?})`, `addDocumentItem(...)`,
  `createLesson`, `createAssignment` (teacher — repo có, UI ở E24.10).
- Queries: `listCourses(classId)`, `getCourse`, `listItems(courseId)`, `getLesson`,
  `listAssignments(courseId)`, `getMySubmission(assignmentId)`.
- API: xem Product Contract §1. Header `Accept-Language`, `Authorization` qua
  `createServerHttpClient()` như mọi repo.
- Domain rules: student không nhận item `UPCOMING_HIDDEN` (trừ EXAM) — entity vẫn có state
  đó vì teacher mode dùng chung interface.
- UI surfaces: không thêm; chỉ gỡ panel notes/Q&A/mark-complete khỏi `lesson-player`.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E24.1 --unit 1 --integration 1 --e2e 0 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | endpoint snapshot, mapper, failure mapping, DI selection |
| Integration | repository ↔ mocked http (envelope + error codes) |
| E2E | n/a (UI story sau) |
| Platform | tsc + vitest + build + curl smoke qua Kong |
| Release | ADR 0075/0076 accepted; 0073 superseded |

## Harness Delta

- ADR 0075, 0076 (`harness-cli decision add`).
- `.claude/rules/api-integration.md`: thêm draft contract vào Source of truth; cập nhật service map `lms`.

## Evidence

(điền sau)
