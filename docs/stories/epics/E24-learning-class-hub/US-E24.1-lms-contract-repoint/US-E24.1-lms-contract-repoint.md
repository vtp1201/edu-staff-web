# US-E24.1 Re-point LMS contract lên `services/lms` thật (course_items, ADR 0143) — supersede ADR 0073

## Status

in-progress

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

Implemented 2026-09-02 on `feat/us-e24.1-lms-contract-repoint`. Not merged —
pending `fe-tech-lead-reviewer` + a11y review (this section is the reviewer's
starting point).

### Gate (all four commands actually run)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean (0 errors) |
| `bun vitest run` | **519 files / 4189 tests passed** |
| `bun lint` | exit 0 — only the 1 pre-existing warning + 1 info in `messaging/message-context-menu.tsx` (untouched) |
| `bun vitest --config vitest.storybook.mts run` | **162 files / 1269 interaction tests passed** |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | green, full route manifest emitted |
| `NEXT_PUBLIC_USE_MOCK=false bun run build` | green (`✓ Compiled successfully in 11.4s`) |

`.env.local` leaves `NEXT_PUBLIC_USE_MOCK` UNSET (the committed comment warns
against pinning it) — both build modes were driven by an explicit env prefix,
not by editing that file.

### Final `LMS_EP` (asserted literally in `lms.endpoint.test.ts`)

All paths share `BASE = "/lms/api/v1/lms"` — the **double `lms` segment** is
correct: Kong route `/lms/api/v1` with `strip_path: true` → upstream
`http://lms:3004/api/v1`, and the service mounts its own routes under
`/api/v1/lms/...` (verified against `edu-api/gateway/kong/kong.yml`
§`lms-protected` and `services/lms/docs/openapi.yaml`).

```
courses            /lms/api/v1/lms/courses                                  (const)
course(id)         /lms/api/v1/lms/courses/{id}
publishCourse(id)  /lms/api/v1/lms/courses/{id}/publish
lessons(cid)       /lms/api/v1/lms/courses/{cid}/lessons
lesson(cid,lid)    /lms/api/v1/lms/courses/{cid}/lessons/{lid}
items(cid)         /lms/api/v1/lms/courses/{cid}/items
itemDocuments(cid) /lms/api/v1/lms/courses/{cid}/items/documents
itemsOrder(cid)    /lms/api/v1/lms/courses/{cid}/items/order
item(cid,iid)      /lms/api/v1/lms/courses/{cid}/items/{iid}
assignments        /lms/api/v1/lms/assignments                              (const)
assignment(aid)    /lms/api/v1/lms/assignments/{aid}
submissions(aid)   /lms/api/v1/lms/assignments/{aid}/submissions
mySubmission(aid)  /lms/api/v1/lms/assignments/{aid}/submissions/me
submission(aid,s)  /lms/api/v1/lms/assignments/{aid}/submissions/{s}
```

`courses`/`assignments` are plain CONSTANTS, not `(classId) => …` as the packet
sketched: the filters (`classId`, `subjectId`, `courseId`) travel as axios
`params` so the repository owns encoding and no caller can build
`?classId=undefined`. The test asserts no `LMS_EP` value contains `?`.
Deleted keys asserted absent: `completeLesson`, `note`, `questions`,
`courseLessons`, `submitAssignment` (plus no path matching `/lms/api/v1/courses`,
`/students/`, `/note`, `/questions`, `/complete`). `QUESTION_BANK_EP` (core
service, unrelated) is unchanged except one stale comment that referenced the
now-deleted `LMS_EP.questions`.

### Kong smoke test — NOT possible, and why

`docker ps`: `edu-kong`, `edu-iam` and `edu-core` are all **`Exited` (3 weeks
ago)**; only `edu-lms`, `edu-social`, scylla, redis and rabbitmq are up.
`curl http://localhost:8000/` → exit 7 (connection refused). No gateway, and no
IAM to mint a student token, so the AC's
`GET /lms/api/v1/lms/courses?classId=<demo>` could not be exercised.

What WAS verified instead (recorded honestly, not dressed up as the AC):

```
$ docker run --rm --network container:edu-lms curlimages/curl -s -o /dev/null -w '%{http_code}' \
    http://localhost:3004/health
200

$ docker run --rm --network container:edu-lms curlimages/curl -s -i \
    'http://localhost:3004/api/v1/lms/courses?classId=00000000-0000-0000-0000-000000000000'
HTTP/1.1 401 Unauthorized
{"success":false,"data":null,
 "error":{"code":"UNAUTHORIZED_ACCESS","message":"Unauthorized","retryable":false},
 "meta":{"requestId":"9e04b873-…","timestamp":"2026-09-02T11:47:34Z"}}
```

The service is up and answers with a **well-formed envelope** carrying the
documented error shape. It does NOT prove the route exists: a deliberately
bogus path (`/api/v1/courses`) returns the same 401, i.e. the auth middleware
runs before routing. Route existence therefore rests on
`services/lms/docs/openapi.yaml` (`grep -n "^  /"` lists all 15 paths, matched
1:1 by the endpoint test) and the gateway composition on `kong.yml`.
**Follow-up for whoever next has the full stack up: run the real curl.**

### What changed beyond the packet's letter (and why)

1. **`bootstrap/lib/resolve-my-class.ts` (new, not in the packet).** Both list
   endpoints REQUIRE `classId` and `lms` has no self-scope discovery route
   (`GET /courses/me` is DRAFT-only, BE US-254). The student's class comes from
   core's `GET /members/{memberId}/enrollment` (BE US-148, self-readable by a
   STUDENT), using the `memberId` claim per ADR 0074. Cross-service composition
   sits in `bootstrap`, not in `LmsRepository` (decision 0017). Fail-soft to
   `null` → a distinct `no-class` UI state; it never falls back to another class.
   **Consequence worth reviewing:** the two `lms` screens now depend on `core`
   being reachable.
2. **`CourseItem.exam` is NESTED** (the packet allowed either). BE sends the
   four exam fields flat and null off an EXAM row; nesting makes "these belong
   to an exam tile" a type fact instead of four null checks per call site. The
   block is non-null only when `itemType === "EXAM"` AND `examId !== null`.
3. **One `LmsFailure` union** — `assignment.failure.ts` is deleted and folded
   in. One service, one `error.code` namespace, one mapping table. Eleven
   members, every one produced by a tested mapping; all eleven have vi+en keys
   under BOTH `courses.errors.*` and `assignments.errors.*` (the screens use
   dynamic `t("errors." + key)`).
4. **UI removed, not stubbed** (packet §5 "ưu tiên: xoá"). Deleted:
   `chapter-list`, `notes-panel`, `qna-panel`, `mark-complete-button`,
   `video-player`, `pdf-preview`, `progress-card`, `lesson-tabs`, `lesson-body`,
   `course-tabs`, `assignment-tabs`, `graded-sheet`(+story), `score-tone`,
   `overdue-confirm-dialog`, `submit-sheet.stories`. The `[courseId]` screen is
   now a course timeline + a lazily-fetched plain-text lesson reader
   (`timeline-list.tsx` replaces `chapter-list.tsx`); the folder keeps the name
   `lesson-player/` to avoid churn ahead of the E24.3/E24.5 redesign.
5. **`CourseTone` moved to presentation** (`presentation/tone.ts`) with a
   deterministic `toneForId(id)`. The wire carries no color, so tone is
   decoration derived from an id — never mapped from data, and nothing may be
   inferred from it. The old domain `CourseTone` (fed by a mock-invented hex)
   is gone.
6. **The late-submit confirm dialog is gone** — a real behaviour change. BE
   US-228 made `dueAt` ENFORCING (`409 LMS_ITEM_CLOSED`), so there is nothing
   for a student to confirm; the refusal is surfaced instead.
7. **`derive-overdue.ts` was KEPT** (packet listed it as a delete candidate) —
   rewritten to `isOverdue(dueAt: string | null, now)`. It is contract-
   sanctioned: BE states plainly that the client renders lateness from `dueAt`.
   It is NOT used to derive `state`, which only BE computes.
8. **Teacher commands land at the REPOSITORY layer only.** `createLesson`,
   `createAssignment`, `addDocumentItem`, `patchItem`, `reorderItems` exist and
   are tested (incl. the AC's `{ itemIds }` body assertion) but have no
   use-case, no DI factory and no UI — that is E24.10. No dead use-cases were
   created to pad the layer.
9. **No draft endpoint is consumed.** ADR 0076 documents the convention; the
   progress/completion family (BE US-254, `openapi.draft.yaml`
   `draft-2026-09-02`) stays absent from the UI in this story.

### AC status

| AC | Status |
| --- | --- |
| Every `LMS_EP` path `/lms/api/v1/lms/*`, 1:1 with openapi.yaml, old shapes gone | ✅ `lms.endpoint.test.ts` (6) |
| Mapper: 4 item types, null-safe `exam`, null window, `state` passthrough | ✅ `lms.mapper.test.ts` (17) |
| Repo: `listItems` BE order; 2nd submit → `already-submitted`; course authz → `not-found` not `[]`; `reorderItems` body `{ itemIds }` | ✅ `lms.repository.test.ts` (25) |
| DI: `USE_MOCK=false` → real, `=true` → mock (inverse of US-E18.60) | ✅ `lms.di.test.ts` (6) |
| Kong smoke with a student token | ⚠️ **not run** — stack down (kong/iam/core exited). Substitute evidence above |
| `0073` marked superseded | ✅ `docs/decisions/0073-*.md` Status block |
| `/student/courses` + `/student/assignments` still render, no crash | ✅ both builds green; screens re-derived and story-covered in mock + error + empty + no-class states |
| tsc / vitest / build green, lint clean | ✅ table above |
| `screens.md` force-mock notes removed | ✅ both rows rewritten |

### Known gaps for the reviewer

- Storybook interaction stories DID run (the runner's previously-recorded
  repo-wide `ERR_REQUIRE_ESM` breakage no longer reproduces): 162 files / 1269
  tests green. It caught one real defect — `card.daysLeft.noDeadline` and
  `card.noDueDate` shared the string "Không có hạn nộp", so the badge query was
  ambiguous; the badge is now "Không có hạn" and the date line keeps "Không có
  hạn nộp" (both locales).
- No subject NAME is shown anywhere (course card, assignment card): the wire
  carries `subjectId` (uuid) and no endpoint a STUDENT may call resolves it.
  Printing a uuid would be worse; E24.2 should decide the source.
- `listLessons` is implemented and tested but currently has no caller — the
  timeline already carries lesson tiles. Kept because it is the only route that
  enumerates lessons for the E24.10 authoring UI.
