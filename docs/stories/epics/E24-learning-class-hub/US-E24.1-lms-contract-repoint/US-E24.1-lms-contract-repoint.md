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

---

## Evidence — review fix round (2026-09-02, appended)

`fe-tech-lead-reviewer` (REVISION REQUIRED, 1 must-fix + 5 should-fix + 2
consider) and `fe-accessibility-auditor` (PASS, 5 findings) both returned. All
must/should items and all 5 a11y findings are fixed on this branch; both
"consider" items were handled (one applied, one deliberately deferred).

### Reviewer items

| Item | Fix |
| --- | --- |
| MUST — missing `import "server-only"` in `lms.mock.repository.ts` | restored as line 1 |
| SHOULD 1 — `isLmsFailure` accepted any `{ type: string }` | narrowed to membership in `LMS_FAILURE_TYPES`; new use-case test rejects a stray `{ type: "ECONNRESET" }` |
| SHOULD 2 — `bootstrap/lib/resolve-my-class.ts` imported an LMS fixture | helper now takes `mockClassId` (default `null`); `bootstrap/di/lms.di.ts` exports `resolveMyLmsClassId()` which supplies `MOCK_CLASS_ID`; all 3 call sites (2 pages + actions) go through the DI |
| SHOULD 3 — `not-found` vs `no-class` for the same condition | Server Action now returns `no-class`; `AssignmentsErrorKey = LmsFailure["type"] \| "no-class"` shared by the action result, screen VM and sheet props |
| SHOULD 4 — `memberId`-absent path untested | new test: a `sub`-only token resolves `null` AND fires no enrollment request. **It failed red for a real reason** — `decodeMemberId()` falls back to `sub` repo-wide, so `resolve-my-class` was violating decision 0074 in practice. Added `decodeMemberIdClaim()` (no fallback) in `bootstrap/lib/jwt.ts` and switched this helper to it; the legacy fallback stays for existing callers |
| SHOULD 5 — tautological assertion in `lms.endpoint.test.ts` | replaced by an offenders-list assertion that still names the drifted endpoint |
| CONSIDER — 422 submission-content codes unmapped | applied: new `invalid-content` failure member; `LMS_SUBMISSION_CONTENT_REQUIRED` / `_TOO_LONG` → `invalid-content`; i18n key in `courses.errors` + `assignments.errors` (vi+en); repo test covers both codes |
| CONSIDER — unreachable DRAFT branch on the course card | **skipped on purpose**: E24.10 (teacher view) needs it, and it is now load-bearing for a11y (the status is folded into the card's `aria-label`, A11Y-005) |

### A11y findings

| ID | Fix |
| --- | --- |
| A11Y-001 | new `app/[locale]/t/[tenant]/(app)/student/courses/loading.tsx` rendering `CoursesSkeleton` (no longer dead code) + sr-only `role="status"`; new key `courses.skeleton.loading`; source-lock test `loading.test.ts` (3) |
| A11Y-002 | sr-only `role="status"` before the interim skeletons in `submit-sheet.tsx` and `lesson-player.tsx`; keys `assignments.submit.detailLoading`, `courses.player.content.loading` |
| A11Y-003 | submit error `<p role="alert">` got `id={submit-error-<rowId>}`; a single `describedBy` string (length error + empty hint + submit error) wired to both the Textarea and the Submit button |
| A11Y-004 | visible hint `assignments.submit.emptyContentHint` while the work text is empty, referenced by the disabled Submit button |
| A11Y-005 | card `aria-label` is now `${title} — ${statusLabel} — ${cta}` |

New i18n keys (vi source + en mirror, 6 total): `courses.skeleton.loading`,
`courses.player.content.loading`, `courses.errors.invalid-content`,
`assignments.errors.invalid-content`, `assignments.submit.detailLoading`,
`assignments.submit.emptyContentHint`.

### Gate re-run (all six, actually executed 2026-09-02)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean (0 errors) |
| `bun vitest run` | **520 files / 4196 tests passed** (+1 file, +7 tests) |
| `bun vitest --config vitest.storybook.mts run` | **162 files / 1269 interaction tests passed** |
| `bun lint` | exit 0 — same single pre-existing warning + info in `messaging/message-context-menu.tsx` (untouched) |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | green, full route manifest |
| `NEXT_PUBLIC_USE_MOCK=false bun run build` | green |

## Evidence — fe-lead independent re-verification + design-review gate (2026-09-02)

Re-ran the gate myself on the fix-round commit (`d3f1b2d2`), not just trusting
the reports: `bunx tsc --noEmit` clean, `bun vitest run` **520 files / 4196
tests passed**. Confirms both the reviewer's and the fix round's claims.

Design review: pass
- design-system: conform — `impeccable detect.mjs` run against
  `src/features/lms/presentation/` and both student route trees
  (`app/[locale]/t/[tenant]/(app)/student/{courses,assignments}`) → **0
  findings**. `fe-tech-lead-reviewer` independently confirmed zero raw-color
  usage and correct `StatusBadge`/token reuse (no forked status styling).
- a11y: WCAG AA — `fe-accessibility-auditor` initial verdict PASS with 5 minor
  findings (A11Y-001..005), all fixed and not re-audited in isolation by a
  second a11y pass (the fixes are small, mechanical, and match the exact
  prescribed diffs — re-verified by fe-lead by reading the applied diffs
  directly against each finding's fix recipe, not re-running a full audit).
- impeccable audit: 0 findings (see above).
- states: loading (new `courses/loading.tsx` + existing assignments skeleton,
  now both announced via sr-only `role="status"`), empty (`no-class`, empty
  course grid, empty assignment list), error (course-not-found, forbidden,
  network, already-submitted, item-closed, invalid-content — all mapped to
  distinct i18n copy), success — all covered per Storybook stories
  (`bun vitest --config vitest.storybook.mts run` 162/162 files green).
  Responsive/320px not independently re-checked by fe-lead (relies on the
  shared `Sheet`/`Card`/`Textarea` primitives' existing responsive behavior,
  unchanged by this story) — flagged as a light gap, not blocking given no
  new layout primitive was introduced.

Gate verdict: **PASS** — proceeding to `fe-qa-playwright`.

Not pushed (fe-lead handles push/merge); `## Status` intentionally unchanged.

## Evidence — fe-qa-playwright independent AC verification (2026-09-02)

Re-derived AC coverage from the actual test/code artifacts (not the prior
reports' prose). Also ground-truthed `LMS_EP` against the SIBLING `edu-api`
checkout's `services/lms/docs/openapi.yaml` directly (`grep -n "^  /"` — all 15
paths), not just the endpoint test's own assertions.

### AC traceability (independently re-derived)

| AC | Proof | Verdict |
| --- | --- | --- |
| `LMS_EP` = `/lms/api/v1/lms/*`, 1:1 with `openapi.yaml` | `lms.endpoint.test.ts` (6 tests) + manual diff against `edu-api/services/lms/docs/openapi.yaml` (all 15 paths match) | PASS |
| Mapper: 4 item types, null-safe `exam`, null window, `state` passthrough | `lms.mapper.test.ts` (17 tests) — genuinely covers all 4 types incl. the "EXAM without examId → no exam block" and "flat fields never leak onto a non-EXAM item" defensive cases | PASS |
| Repo: `listItems` BE order; 2nd submit → `already-submitted`; course authz → `not-found`; `reorderItems` `{itemIds}` | `lms.repository.test.ts` (25 tests) — all four literally asserted, plus `invalid-content` (422), `network-error` fallback, malformed-uuid→`unknown` | PASS |
| DI: `USE_MOCK=false`→real, `=true`→mock | `lms.di.test.ts` (6 tests), all 7 factories exercised each direction | PASS |
| Kong smoke with student token | Not run — stack down (kong/iam/core exited), correctly disclosed as a substitute (lms-only curl showing well-formed envelope). Genuinely not blocking (infra unavailability, not a code defect) | ACCEPTED GAP |
| `0073` superseded | `docs/decisions/0073-*.md` Status block: "Superseded by 0075" | PASS |
| `/student/courses` + `/student/assignments` render, no crash (mock+real) | **GAP FOUND AND CLOSED** — see below | PASS (after fix) |
| tsc/vitest/build/lint green | Re-ran independently: `tsc --noEmit` clean, `bun vitest run` 523 files/4210 tests green (was 520/4196 — +3 files/+14 tests from this QA pass), `bun lint` clean (same 1 pre-existing warning), `bun vitest --config vitest.storybook.mts run` re-run on touched story files (16/16 green) | PASS |
| `screens.md` force-mock notes removed | Both student-LMS rows confirmed rewritten, no "force-mocked pending ask #51" left | PASS |
| ADR 0075/0076 registered | `harness-cli query decisions` shows both `accepted` | PASS |
| Harness Delta: `api-integration.md` draft-contract row + `lms` service-map note | Confirmed present (`openapi.draft.yaml` row + "lms live MỘT PHẦN" note with the double-`lms`-segment explanation) | PASS |

### Gap found: AC "renders without crash" was evidenced only by `bun build`, which does NOT execute these pages

All three RSC pages (`student/courses/page.tsx`, `student/courses/[courseId]/page.tsx`,
`student/assignments/page.tsx`) call `requireRole()`, which reads `next/headers`
cookies — this forces dynamic rendering, so `next build` never executes the
page body for either `USE_MOCK` value; it only proves the module *compiles*.
There was **zero test** actually invoking these page functions with a real
entity shape through the DI→mapper→VM chain. Closed by writing 3 new
`page.test.ts` files (guard/no-class/failure/success branches, plus the
course-timeline page's `notFound()` existence-oracle path and its
"course renders even when the timeline read fails independently" contract):

- `src/app/[locale]/t/[tenant]/(app)/student/courses/page.test.ts` (4 tests)
- `src/app/[locale]/t/[tenant]/(app)/student/assignments/page.test.ts` (5 tests)
- `src/app/[locale]/t/[tenant]/(app)/student/courses/[courseId]/page.test.ts` (5 tests)

All 14 pass. No production code was changed to make them pass — the wiring was
already correct, only unproven.

### New Storybook interaction coverage (defect-hunt driven)

1. **`Assignments_SubmitAlreadySubmitted`** (`student-assignments-screen.stories.tsx`) —
   the task explicitly called out "hitting `already-submitted` on a second
   submit attempt" as required coverage; the existing
   `Assignments_OpenSheet_AlreadySubmitted` story only covered the case where
   the DETAIL read already knows about the submission (read-only view, no
   form). The race where the form IS rendered (client's own `mySubmission`
   read was `null`) but a concurrent submit elsewhere beat this one to
   `POST .../submissions` (409 `LMS_SUBMISSION_ALREADY_SUBMITTED`) had zero
   coverage, despite its own distinct i18n copy ("Bài tập này đã được nộp.")
   separate from `closed`'s copy. Added and green.
2. **`Timeline_ExamNoDeepLink`** (`lesson-player.stories.tsx`) — BE documents
   `examUrl` as legally null "when the deployment has not configured one";
   every existing EXAM fixture in this feature (fixtures, mock repo, all
   stories) carried a link. The code path (`item.url || item.examUrl` falsy →
   plain `<div>`, no `<a href="#">`) was already correct
   (`timeline-list.tsx:190-196`) but unexercised by any test. Added and green
   — asserts no `<a>` inside the tile's `<li>`.

Both files re-run under `bun vitest --config vitest.storybook.mts run` (16/16
green, no regressions in the other 14 pre-existing stories in these two files).

### Defect hunt — no new production defects found

- EXAM item with no `examUrl`: handled correctly (informational tile, no
  broken link) — now covered by a story (above), not a defect.
- `dueAt: null` on an assignment: `isOverdue()` returns `false` for `null`
  (never derives lateness from a missing deadline); `assignmentBadge()` has
  its own `dueAt === null` branch → `noDeadline` copy, tested in
  `assignment-badge.test.ts`. No defect.
- Submit-sheet hides/disables the submit affordance once `getMySubmission`
  resolves an existing submission: `submitted !== null` renders a read-only
  block and the `<SheetFooter>` (Save draft / Submit buttons) is conditionally
  unmounted (`detail !== null && submitted === null`) — verified by code
  reading `submit-sheet.tsx:222` and the existing
  `Assignments_OpenSheet_AlreadySubmitted` story
  (`queryByLabelText("Nội dung bài làm")` → null). No defect.
- Repository-boundary and use-case failure-mapping fix-round claims
  (`isLmsFailure` narrowing rejecting a stray `{type:"ECONNRESET"}`,
  `resolve-my-class.ts`'s `memberId`-only claim read with no `sub` fallback)
  were independently re-read in their test files and hold up exactly as
  claimed — not re-derived from the reviewer's prose.

### Mobile/responsive (320/375px) — static check, no fixed-width risk found

`grep -rn "w-\[\|min-w-\[\|px-\["` across `src/features/lms/presentation/`
returns nothing — no hardcoded pixel widths in any touched component. Course
grid is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (mobile-first, 1 column at
320/375px). Course timeline is `grid-cols-1 md:grid-cols-[...]` (single column
below `md`). Submit sheet is `w-full sm:max-w-lg` (full-width below `sm`, no
overflow). This is a static-analysis check (grep + reading Tailwind classes),
not a rendered-browser resize test — matches the design-review gate's own
disclosure of this as "not independently re-checked... a light gap, not
blocking." No overflow/clip risk identified; not escalating beyond that.

### Gate (all commands re-run by fe-qa-playwright, not trusted from prior reports)

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean (0 errors) |
| `bun vitest run` | **523 files / 4210 tests passed** |
| `bun vitest --config vitest.storybook.mts run` (scoped to touched files) | **16/16 tests passed** across both edited story files |
| `bun lint` | clean (same 1 pre-existing warning, untouched file) |

### Verdict: **GO**

No BLOCKER/CRITICAL/MAJOR defects. One genuine coverage gap (RSC page "no
crash" claim resting on a build that never executes the page body) was found
and closed with 14 new unit tests; two genuine Storybook interaction gaps
(already-submitted submit race, EXAM-no-link) were found and closed with 2 new
stories. All fixes are test-only, in the repo's standard test locations, no
production code touched. Full gate re-run green
(tsc/vitest/storybook-vitest/lint). Ready for `fe-lead` to push/merge.
