# Epic E18 — BE Wiring Wave (swap mock → real edu-api)

## Goal

Chuyển toàn bộ feature đang mock-first sang consume API thật của `edu-api`
(BE đã implemented US-001→100, 4 service: `iam`, `core`, `notification`,
`social`). UI **không đổi hành vi** — AC chuẩn của mọi US trong epic:
zero regression trên test suite hiện có.

Nguồn: audit contract-drift 2026-07-11 (đối chiếu từng
`src/bootstrap/endpoint/*.ts` với `edu-api/services/*/docs/openapi.yaml`).

## Phát hiện nền tảng (đọc trước khi làm bất kỳ US nào)

1. **Real repo đã có sẵn ~100%.** 30/32 DI factory đã theo pattern
   `USE_MOCK ? Mock : Real(http)`. Effort thật = remap path/DTO + map error
   code + bổ sung workflow state UI còn thiếu — KHÔNG phải viết repository mới.
2. **Gateway (Kong, `edu-api/gateway/kong/kong.yml`) chỉ route `/iam` và
   `/core/api/v1`.** Các prefix web đang dùng `/social`, `/noti`, `/lms`,
   `/attendance` **không có ingress** → 404 tại `:8000`.
   - `lms` + `attendance` thực chất nằm TRONG `core` (`/core/api/v1/lms/*`,
     `/core/api/v1/classes/{id}/attendance`) → web tự sửa prefix được.
   - `social` + `notification` là service riêng → **cần BE thêm Kong route**
     (việc của edu-api — request đã ghi ở §Cross-repo).
3. **Envelope/unwrap/ApiError đã khớp chuẩn BE** (decision `0008`,
   `bootstrap/lib/http.ts` + `api-envelope.ts`) — không cần đổi transport layer.
4. **BE có workflow state mà mock web thiếu** — các US liên quan phải THÊM
   state UI, không chỉ swap transport: `homeroom-entries/{id}/revise`;
   grades per-column `submit` + term `lock`; conduct `submit→approve/reject`
   (tách student/staff); academic-records `seal → unseal-request → approve`.

## Playbook chung cho mỗi US wiring

1. Đọc `edu-api/services/<svc>/docs/{openapi.yaml, INTEGRATION.md, ERROR_CODES.md}`
   — openapi là contract thắng, endpoint web hiện tại chỉ là guess mock-first.
2. Sửa `bootstrap/endpoint/<feature>.endpoint.ts` khớp path thật; đối chiếu DTO
   (camelCase) với schema; sửa mapper nếu shape khác.
3. Map error codes cụm đó → failure union (branch theo `error.code`, không theo
   message; retry chỉ khi `retryable === true`).
4. Giữ mock repo làm fallback `USE_MOCK=true` — mock phải được cập nhật để mô
   phỏng ĐÚNG contract mới (path shape mới, state mới) để test không nói dối.
5. Proof: unit (mapper/failure), integration (repo contract, kể cả mock), full
   suite zero-regression, `bun run build`. Smoke thật qua gateway `:8000` khi
   môi trường BE bật (ghi vào Evidence nếu chạy được).
6. **Wire proactive refresh (decision `0018`) vào chính DI factory của cụm này**:
   `await ensureFreshSession()` (từ `bootstrap/di/auth.di.ts`) TRƯỚC
   `createServerHttpClient()` trong nhánh `!USE_MOCK`. Xác nhận từ US-E18.0
   (2026-07-11): pattern này đã được document từ decision `0018` nhưng **chưa
   từng được gọi ở bất kỳ DI factory feature nào** ngoài chính `auth.di.ts` —
   coi đây là bug tồn đọng cross-epic, mỗi US wiring phải tự đóng cho cụm của
   mình khi flip sang real (không phải việc riêng của US-E18.0).

## Xác nhận từ US-E18.0 (proof-of-pattern, chạy `make stack-up` thật 2026-07-11)

Chạy đủ vòng thật qua Kong (`:8000`) với cụm `school-config` (MATCH 100% với
`core/docs/openapi.yaml`, không cần sửa path/DTO):

- **(a) Envelope unwrap** — xác nhận đúng cho cả success (`GET /iam/api/v1/users/me`
  → 200, data unwrap trực tiếp không còn wrapper) và lỗi (401/400 → `ApiError`
  với `code`/`status` đúng) qua chính `bootstrap/lib/http.ts` (không phải chỉ
  curl thô — đã chạy bằng script import trực tiếp `createHttpClient` thật).
- **(b) Refresh** — `POST /iam/api/v1/auth/refresh` rotate access+refresh token
  thành công qua gateway. **Nhưng phát hiện 2 vấn đề:**
  1. Proactive refresh (`ensureFreshSession`) chưa từng được wire vào DI factory
     nào ngoài `auth.di.ts` — đã fix cho `admin-school-setup.di.ts` (US-E18.0),
     playbook step 6 ở trên áp dụng cho các US còn lại.
  2. **[Cross-repo finding]** Refresh-token reuse-detection (`user_token_reused`,
     `services/iam/docs/ERROR_CODES.md`) **không kích hoạt** trên
     `POST /api/v1/auth/refresh` — replay một refresh token đã rotate-away vẫn
     trả `200` + mint token pair mới (xác nhận lặp lại 2 lần, cùng `sessionId`).
     Đây là gap phía BE (F3 không được enforce ở endpoint này), KHÔNG phải bug
     web — web dùng token rotate đúng theo hợp đồng. Cần báo edu-api team.
- **(c) Error map** — `errorCodeOf()` trả đúng `UNAUTHORIZED` (401, không token)
  và `SCHOOL_INVALID_TENANT_ID` (400, token không có tenant claim hợp lệ — case
  xảy ra vì user test không thuộc tenant nào). Code sau trước đó rơi vào
  `"unknown"` trong `SchoolConfigRepository` → đã map sang `"forbidden"` (fix
  nhỏ, US-E18.0).
- **Blocker cho happy-path 200 thật** (login → tenant → `GET school-config` trả
  data thật): tạo tenant đòi hỏi user có platform role `SUPER_ADMIN`
  (`POST /iam/api/v1/tenants`), nhưng **stack dev local (`make stack-up`) không
  seed sẵn SUPER_ADMIN nào** — không có migration/script bootstrap. Không thể
  tự cấp quyền này qua DB trực tiếp (chặn bởi permission boundary, đúng đắn:
  đây không phải việc của web team). Cần edu-api cung cấp seed/CLI SUPER_ADMIN
  cho local dev (cross-repo ask #4 dưới) — Wave 1+ nên tự mang theo cách tạo
  fixture tenant riêng nếu cần test 200 thật (vd nhờ BE thêm dev-seed script).

## Bug class xuyên suốt: vị trí `raw: true` (từ US-E18.2, sweep 2026-07-11)

`isRawCall` đọc `config.raw` ở **top-level** axios config. Đặt `raw: true` nested
trong `params` khiến interceptor unwrap envelope trước `parseEnvelope` → mọi
list call real-mode âm thầm rơi vào `network-error`; unit test mock `http.get`
KHÔNG bắt được. Sweep xác nhận bug còn latent ở 8 repo: `principal-teachers`
(2 site), `class-log`, `subject-catalogue` (2), `class-management`,
`admin-roster` (1 trong 2), `teacher-class`, `teacher-dashboard` →
**US-E18.19** (tiny) hoặc fix trong US wiring của từng cụm — kèm regression
guard chạy `unwrapResponse` thật (pattern `staffing.repository.test.ts`
§"real interceptor pipeline").

## Scope — US breakdown theo wave

### Wave 0 — tiền đề

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.0 | Gateway smoke + wiring playbook verify | — | tiny | Chạy đủ 1 vòng thật qua `:8000` với 1 cụm MATCH (school-config): login → GET qua core, xác nhận envelope/refresh/error map chạy đúng ngoài mock. Là proof-of-pattern cho cả epic. |

### Wave 1 — MATCH, flip gần như thẳng (chạy song song được, mỗi US 1 module)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.1 | Calendar wiring (academic-years/terms) | MATCH | normal | Error: `CALENDAR_*`. **Done** — the "MATCH 100%" label held at the path level only; DTO-shape audit during implementation found real drift (flat vs nested year/term responses, `status` enum vs `isActive` boolean, no `hasGrades` on the wire, `CALENDAR_FORBIDDEN` mismapped, `createYear` can't atomically set active). See `US-E18.1-calendar-wiring/story.md` for the full remap + a reusable "BE-wiring remap" pattern for the rest of Wave 1. |
| US-E18.2 | Staffing wiring (departments/titles/assignments) | MATCH | normal | Error: `DEPARTMENT_*`, `POSITION_*`. **Done** — as with US-E18.1 the "MATCH" label held at the path level only; the DTO-shape audit found real drift (id renames `departmentId`/`positionTitleId`/`positionAssignmentId`; department `conceptLabel`→`conceptLabelSuggested`+`conceptLabelCustom`; wrong 4-value `Permission` enum→real 6-value; `assignedAt`→`createdAt`; wire `ARCHIVED`→domain `REVOKED`; no `activeAssignmentCount`/`memberName`/`positionTitleName`/`scopeEntityType` on the wire). `activeAssignmentCount` derived via real paginated count fan-out; `positionTitleName` joined; `memberName` falls back to `memberId` (cross-repo gap — IAM has no name source). See `US-E18.2-staffing-wiring/story.md`. |
| US-E18.3 | Subject catalogue wiring | MATCH− | normal | `restore` là WEB-ONLY (BE chỉ có `archive`) → giữ mock/ẩn nút + flag BE |
| US-E18.4 | Class management wiring | MATCH− | normal | `/core/api/v1/teachers` KHÔNG tồn tại → nguồn teacher list đổi sang IAM members (decision trong packet) |
| US-E18.5 | Admin roster wiring | MATCH− | normal | **Done** — the epic table's assumed fix ("derive từ IAM members − enrolled") is not achievable (IAM has no listing/lookup, ask #7); worse, `EnrollmentResponse` itself carries zero display fields (no name/dob/gender/status), so BOTH `getClassRoster` (roster listing, not just the search pool) and `getSearchPool` stay mock-first permanently. Only `getClasses` (class picker, homeroom-name fan-out) + enroll/unenroll/transfer wired real. See `US-E18.5-admin-roster-wiring/story.md` + cross-repo ask #9. |
| US-E18.6 | IAM member + tenant wiring | MATCH | normal | **Done** — paths matched 100% at path level (no drift, unique among Wave 1). Real finding: `mapIamFailure` switched on 7 guessed UPPER_SNAKE codes that NEVER match the real wire (ground-truthed against edu-api Go source, not just `ERROR_CODES.md` prose — real `error.code` is always the lowercase i18n key, e.g. `member_already_exists`) — every real IAM error silently fell to `unknown`. Fixed full taxonomy + 4 previously-unmapped failures (`tenant-inactive`, `invalid-transition`, `invitation-expired`, `invitation-email-mismatch`); renamed 2 misleading types (`email-exists`→`member-exists`, `invitation-not-found`→`invitation-invalid`); trimmed speculative DTO fields (`tenantName`/`email`/`name`) not on the real schema; `ensureFreshSession()` wired into both `iam-member.di.ts`+`tenant.di.ts` (first time in either). Zero UI/ViewModel change (`IamMemberFailure` has no presentation consumer yet). See `US-E18.6-iam-member-tenant-wiring/story.md`. |

### Wave 2 — drift nhỏ (path fix) + workflow bổ sung

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.7 | Assessment scheme + grade scale wiring | path | normal | **Done** — path label held (drop `/config/`, add trailing `/terms/{termId}`) but, as with every other Wave-1/2 cluster, the DTO-shape audit found deeper drift: separate Request/Response wire schemas, `coefficient`↔`weight` unit scaling (÷10/×10, lossless), grade-scale bands derived from real `letterGrades` for `LETTER_ABCD` else fall back to local presets (BE has no numeric-scale banding concept), `count` non-persistent (no wire representation), 9-code error matrix (ground-truthed from Go source, confirms decision 0008 UPPER_SNAKE holds for `core`). Domain model + `grades` feature's reuse of it kept fully unchanged (compile-only literal additions). Added a minimal `["HK1","HK2"]` term selector (BE requires `termId`, screen never modeled it) reusing the existing `Select` pattern. `listSubjectsForGrade` stays mock (no `gradeLevel` filter on real `GET /subjects` — belongs to US-E18.3). See `US-E18.7-assessment-scheme-wiring/story.md` + ADR `0053`. |
| US-E18.8 | Staff-leave wiring | path | normal | **Done** — the "add `/conduct/` segment" label held at the path level only. Real finding: `GET` requires a **mandatory** `staffMemberId` query param (no tenant-wide oversight list exists at all — the admin screen lists every staff member's requests at once) AND `StaffLeaveRequestResponse` has zero display fields (no `staffName`/`department`/`leaveType` — the leave-*type* concept itself doesn't exist on the wire). `approve`/`reject` are therefore also unreachable (their only id source is the blocked list). Whole feature stays mock-first **permanently** — first fully-blocked DI factory in the epic (`staff-leave.di.ts` now force-mocks regardless of `USE_MOCK`, vs. the hybrid/partial pattern used by US-E18.4/US-E18.5). Ground-truthed error taxonomy (7 codes, confirmed UPPER_SNAKE from Go source `pkg/kit/response/error.go`'s `codeFromKey`) kept correct + unit-tested for the day this unblocks; 2 new failure types (`forbidden`, `same-actor`). See `US-E18.8-staff-leave-wiring/story.md` + cross-repo ask #13. |
| US-E18.9 | Teaching-plan wiring | path | normal | **Done** — the "nest `/lms/`, decide `/cells`" label held at the path level only. Real finding: composite-key mismatch (web keys by `(subjectId, classId, term)`; real key is `(classSubjectId, academicYear, planId)` — no term dimension, one BE plan spans a full academic year), no period axis on the wire (`WeeklyEntryResponse` is week-only), and — the `/cells` answer — **zero HTTP surface to edit an existing plan's entries at all**: `create` sets `weeklyEntries` once, no update route exists, and the domain aggregate's `UpdateEntries()` method is dead code (unit-tested BE-side, never wired to a route). Whole feature stays mock-first permanently — second fully-blocked DI factory in the epic after US-E18.8's `staff-leave.di.ts`. Ground-truthed 6-code error taxonomy replaces the old guessed one (matched zero real codes). See `US-E18.9-teaching-plan-wiring/story.md` + cross-repo ask #14. |
| US-E18.10 | Class-log wiring + trạng thái `revise` | path + state | normal | Web thiếu `revise` + GET/PUT entry detail — thêm state UI theo máy trạng thái BE |
| US-E13.2 *(packet có sẵn, epic E13)* | Attendance wiring | **cao** | normal | **Done** — ground-truthed against `internal/attendance` Go source. Confirms + extends the note: no period AND no subject axis at all (daily class-wide GVCN roll call); 4-state status (`PRESENT/ABSENT/LATE/EXCUSED_ABSENT`, web only had 3) adds `late`→`--edu-info` (no new token); class list + name-resolution reuse the already-real `TeacherClassRepository` (`isHomeroom` filter + `getClassStudents()` join, same graceful raw-id-fallback precedent as the teacher's own roster) — nothing permanently blocked, unlike most high-drift US's in this epic; history has no bulk endpoint (cross-repo ask #28) → bounded (≤31d) client fan-out + day-summary aggregate. UI changes (drop period selector, 4th toggle, day-summary history) go through design-review + a11y. See `US-E13.2-attendance-be-wiring/US-E13.2-attendance-be-wiring.md` + ADR `0058`. |

### Wave 3 — drift lớn, redesign contract phía web

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.11 | Timetable wiring (builder + consumer views) | cao | normal | **Done** — admin builder GET/PUT(read-modify-write, real BE has no per-slot PUT, only full-replace)/DELETE-slot wired real against `/classes/{id}/timetable(/slots)`; reactive `TIMETABLE_TEACHER_CONFLICT` 409 surfaced as new `teacher-conflict` failure through the existing save-error toast (no new UI); whole-school proactive `getConflicts` stays mock-first permanently (no bulk endpoint — ask #16). Consumer `getByTeacher` wired real via `GET /classes` (TEACHER-role auto-filtered) fan-out + per-class GET + merge on `teacherMemberId === currentUserId` (reuses `teacher-class.repository.ts`'s precedent). **Implementation-time correction**: consumer `getByClass` also stays mock (not real, contra the epic table's assumption) — its only caller, `GetChildTimetableUseCase` (parent flow), is itself permanently blocked, so a real fetch would just 404 against the mock roster's fixture classIds. `getMyTimetable` (student) + `getChildren`/child view (parent) permanently mock — ground-truthed 403 on `GET /classes` for non-ADMIN/non-TEACHER (`list_classes.go`) + no classId on `linked-students` (ask #15, confirming #6/#7/#9/#13's pattern a 5th time). Full 11-code `TIMETABLE_*` error taxonomy; day-enum bridge (`MON..FRI`, no Saturday on the wire); term resolved via the already-real `calendar` feature (US-E18.1) composed in a new shared `resolve-current-term.ts`. `room` has no wire field (ask #17, non-persistent like US-E18.7's `count`). `ensureFreshSession()` wired into both `timetable.di.ts`+`timetable-view.di.ts`. Zero UI/ViewModel change (existing `TimetableScreen` already threaded `TimetableFailure["type"]` generically). |
| US-E18.12 | Grades contract remap | **rất cao** | high-risk | **Done** — ground-truthed against `core`'s `GradeEntry`/`GradeReport` tags + Go source. Confirms `classSubjectId`/batch ≠ real `(classId,subjectId,termId)` + per-cell status (not per-row). Teacher entry/submit + multi-role read (incl. student self + parent-linked via `/members/{id}/grades`) wired real; term `lock` (irreversible, admin/manager) wired real. `IGradeApprovalRepository` (admin cross-class batch dashboard) + parent child-switcher stay **permanently mock** — no wire batchId/rollup/display-name source, and no reject transition exists for `GradeEntry` at all (tech-lead review caught + fixed a live real-branch that contradicted this force-mock claim in the first implementation pass). Per-cell workflow status required new UI (`GradeEntryStatusBadge`, per-cell partial-submit-failure indicator, term-lock confirm dialog) — passed design-review + a11y (1 blocking + 4 non-blocking findings, all fixed) + QA gate. ADR `0054`. See `US-E18.12-grades-wiring/story.md`. |
| US-E18.13 | Academic-records seal remap | cao | high-risk | **Done** — ground-truthed against `core`'s `AcademicRecords` tag + Go source (`assessment/*` use-cases). Confirms `sealBatch` matches the web's existing class+term model almost exactly and wires real (bare POST, no body) via a hybrid facade; the hard client pre-check (`getSealStatus`) is replaced by a reactive gate (real 422 `unlocked-grades-exist`/`too-many-reseals`) since seal is idempotent on the real contract (drops old blocking `already-sealed`). **Implementation-time correction to the epic table's assumption**: the two-admin unseal workflow's `initiate`/`confirm` POSTs exist, but there is NO GET listing endpoint for pending unseal requests at all — a second admin in a different session can never discover a real `requestId` to approve, so the whole unseal workflow (not just `seal-status`/`sealed-students`/`audit-trail`) stays permanently mock (cross-repo ask #21, 4th fully-blocked operation set in the epic). Separately, the read-only viewer (`getRecord`/`listYears`) also stays mock — no wire year-grouping, no fixed tx1/tx2/giuaKy/cuoiKy columns (real snapshot is a dynamic column array matching US-E18.7's model), no student-identity fields. `AllLockedGate` UI updated for the reactive-not-blocking gate (design-review + a11y pass, 1 should-fix fixed). **Addendum (2026-07-26, US-E18.21):** ADR `0055`'s internal follow-up is CLOSED — the viewer factory `makeRepository()` was in fact still `USE_MOCK ? mock : real` (never force-mocked, so this row's "stays mock" held only while the app-wide flag stayed `true`); it now returns `MockAcademicRecordsRepository` unconditionally and `AcademicRecordsRepository` is a permanent blocked stub. Cross-repo ask #21 stays OPEN. See `US-E18.21-academic-records-wiring/story.md`. |
| US-E18.14 | Discipline → conduct remap | cao | high-risk | **Done** — ground-truthed against `core`'s `conduct` domain (`student-violations`/`student-conduct-grades`/`student-leave-requests` routes + Go source). Confirms the epic table's premise partially: real BE genuinely has full submit/approve/reject on violations and conduct-grades (replacing web's single-action `overrideConductGrade`), and a genuine staff/student split (`staff-violations`, `staff-conduct-notes`) plus `student-absences` (`/{date}/flag`). But **none of it is wireable today**: every real endpoint keys on a real student `studentMemberId` UUID the web roster can't resolve (extends ask #9), and — a NEW finding — even STUDENT self-service list/submit calls require a `classId` the student has no way to discover (`list_student_violations.go`/`list_student_conduct_grades.go` require `classId` even on the own-record branch; `CreateStudentLeaveRequestRequest.ClassID` is a mandatory body field), extending ask #15 beyond PARENT to STUDENT self-view too. Repository/DTO/error-taxonomy/DI-only remap: real `DisciplineRepository` implements the ground-truthed 19-code error matrix (shared `ApprovalTransition` domain service — `VIOLATION_SAME_ACTOR`/`VIOLATION_INVALID_TRANSITION`/`VIOLATION_REJECTION_REASON_REQUIRED` are reused verbatim across violations/conduct-grades/leave, confirmed by reading the use-cases side-by-side) but every method is a permanent blocked stub; `discipline.di.ts` force-mocks regardless of `USE_MOCK` — the third fully-blocked DI factory in the epic after US-E18.8/US-E18.9. `staff-violations`/`staff-conduct-notes`/`student-absences` have no web screen at all (not a BE gap — a product/design gap, flagged for `uiux`/`ba`). Zero UI/entity/use-case/mock-repo change. See `US-E18.14-discipline-conduct-wiring/story.md` + cross-repo ask #22. |
| US-E18.15 | LMS exam family wiring | naming | normal | `exam-bank`→`/lms/exam-papers` (+`/status`); `exams`→`/lms/class-exams` (+`activate/complete/submissions`) — lifecycle giàu hơn mock |
| US-E18.16 | LMS lesson + question bank wiring | **naming assumption false → resolved by later US's** | normal | **Reopened + resolved 2026-07-26.** Original 2026-07-17 descope premise ("no web feature exists") no longer holds: `DR-021`→US-E11.8 (lesson-plan authoring) + US-E11.9 (question-bank) delivered exactly the net-new screens the descope said were needed, and BOTH wired real from the start against `core`'s `lessonplan`/`exercisebank` sub-domains (BE US-136 moved courseware off `lms`→`core`) — confirmed by direct code read (`lesson-plan.repository.ts`, `question-bank.repository.ts`, both DI factories with `ensureFreshSession()`), nothing left to wire, no action needed. New sub-scope added at reopen (US-E18.15 didn't cover it): the `exam` feature (student exam-taking, `exam.endpoint.ts`) vs `core`'s `ClassExam`/`ExamSubmission` — genuine non-lossless gap on 3 axes (MCQ-only real contract vs web's mixed MCQ+essay model, ADR `0048`; no `classId` anywhere in the web model vs `classId` being mandatory on every real endpoint; admin-driven SCHEDULED/ACTIVE/COMPLETED/RETRACTED workflow vs web's client `deadline`/`expired` model) — stays mock-first, same precedent class as US-E18.9/US-E18.11. See `US-E18.16-lesson-question-bank-wiring/story.md` + finding #38. |

### Wave 4 — blocked bởi Kong route (chờ cross-repo)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.17 | Messaging remodel (rooms/DMs) | **rất cao** | high-risk | **Done** — the "Blocked: Kong chưa route `/social`" label only blocked LIVE verification, not contract-first wiring (ADR `0060`, decision to proceed anyway). Real-wired: `getConversations`/`getMessages`/`sendMessage`/`deleteMessage`/1:1 `createConversation` (`school-dms`) against ground-truthed `/social/api/v1/rooms...`; two NEW additive capabilities `markConversationRead` (`POST .../read`) + `sendTypingIndicator` (`POST .../typing`, throttled outbound only — inbound still needs SSE, US-E18.18) wired real with zero new UI surface. Self-delete window corrected 1h→5min to match the real `DELETE_WINDOW_EXPIRED` rule (incl. the disabled-hint copy the a11y audit caught still saying "1 hour"). Permanently mock via a new `HybridMessagingRepository` facade (real methods some, mock others, same hybrid pattern as US-E18.4/US-E18.5/US-E18.11): the entire ad hoc group lifecycle (`createGroup`/`getGroup`/`updateGroup`/`addGroupMembers`/`removeGroupMember`/`leaveGroup`/`deleteGroup` — no self-service group-room contract exists, only system-provisioned `class_chat`/`parent_group`), `pinMessage`/`unpinMessage` (no message-pin endpoint at all), and `getContacts` (the only people-directory endpoint is role-gated ADMIN/TEACHER-only — **superseded 2026-08-07: US-E18.52 un-mocks `getContacts` after IAM ADR 0129 opened a narrowed tier**). Live-gateway proof still deferred (ask #1). See `US-E18.17-messaging-rooms-remap/story.md` + ADR `0060` + cross-repo/product ask #32. |
| US-E18.18 | Notification wiring (SSE + unread-counts + presence) | cao | normal | **Done** — the "Blocked: Kong chưa route notification" label only blocked LIVE verification, not contract-first wiring (ADR `0061`, same precedent as US-E18.17/ADR `0060`); `kong.yml`'s "notification is a worker (no HTTP)" comment is stale — `INTEGRATION.md` confirms a real `cmd/server` HTTP+SSE surface exists. **Second, independent deferral reason found**: `edu-api` ADR `0047` (kong auth trust model, dated AFTER this repo's original SSE-proxy design) retired per-service Bearer-JWT verification — `notification` now trusts ONLY Kong-injected `X-Edu-Claims` headers, so the web's direct-bypass SSE proxy (`NOTI_SERVICE_URL`, ADR 0009/0030) will 401 even once Kong routes `notification`, until the proxy itself is re-architected to go through Kong. Fixed `NOTI_EP.stream` path (`/events/stream`→`/api/v1/stream`). **Implementation-time correction**: `unread-counts` is per-ROOM (messaging), not a generic notification concept — wired into `MessagingRepository.getConversations()`'s real branch (closes ADR 0060 ask #32(a)'s "no unread field on the wire" gap) rather than the generic `notification` feature; `notification.getUnreadCount()` repurposed to SUM real per-room counts (narrower real meaning than mock's synthetic multi-category count, documented). `listNotifications`/`markRead`/`markAllRead` force-mocked permanently via new `HybridNotificationRepository` — zero real backing exists for any of them. Remapped the web's own speculative `RealtimeEvent` SSE contract (`bootstrap/realtime/event.ts`, ADR 0009's "web defines first") to the REAL flat wire vocabulary (`message.new`/`message.edited`/`message.deleted`/`unread.updated`/`typing` — no `payload` wrapper, no `eventId`, `typing` has no `tenantId`/embedded `type`); legacy mock-only frame types (`notification.new`/`attendance.updated`/`presence.changed`) kept, clearly flagged as having zero real BE equivalent. Wired inbound `typing` to `ChatWindow`'s dormant indicator (closes US-E18.17's explicitly deferred item) and inbound `message.new`/`unread.updated`/etc to conversation-list/chat-window cache invalidation. Fixed presence's real contract (`userIds` param not `memberIds`, `{items:[...]}` envelope not bare array, real 2-state `{online,lastSeen}`→domain's existing 3-state `PresenceState` via an injected-clock 5-minute "recent" threshold — no confirmed product/design-spec value for this threshold, flagged as an open question). See `US-E18.18-notification-sse-wiring/story.md` + ADR `0061` + cross-repo/product asks #33-#35. |

| US-E18.25 | Notification-center wiring (BE US-146) | trung bình | normal | **Done** — ground-truthed `notification`'s US-146 additions on `origin/main` 2026-08-01: `GET /notifications` (cursor-paginated inbox, `type` filter only), `GET /notifications/unread-count` (SINGULAR — deliberately distinct from the already-wired PLURAL per-room `unread-counts`, US-E18.18), `PATCH /notifications/{id}/read`, `PATCH /notifications/read-batch` (capped 500/call, `hasMore` repeat). **Closes ask #34**: the generic notification-bell concept US-E18.18 said didn't exist now does. Retires `HybridNotificationRepository` entirely (all 4 `INotificationRepository` methods now real) — `notification.di.ts` back to the plain `USE_MOCK ? Mock : Real` gate (decision `0014`), same precedent as US-E18.23's `class-management` cleanup. `getUnreadCount()` switches from US-E18.18's per-room-SUM stand-in to the real generic endpoint (bell badge's originally-intended meaning restored; `MessagingRepository`'s own plural `unread-counts` call, `bootstrap/realtime/*` SSE contract/invalidation — all untouched, confirmed by empty diff). `markAllRead()` implements the repeat-until-`hasMore`-false loop against the 500-row cap with a bounded, loudly-logged `MAX_BATCHES` guard. `listNotifications({filter:"unread"})` — BE has no server-side unread filter at all — does a bounded client-side drain (page at 100, filter `read===false` client-side, follow the real cursor/hasMore, `MAX_PAGES` cap); **implementation-time correction caught by review**: an early cut of this drain silently capped `collected` to the caller's page-size `limit` even though the cursor had already advanced past the whole 100-row page, permanently stranding any unread rows beyond `limit` on that page (data loss, not the documented "may re-surface" imprecision) — fixed same-branch to return every unread row found on the page uncapped (bounded overshoot = one page, no duplicates since the cursor stays page-aligned). `NotificationEntity` reshaped from the mock's pre-rendered `title`/`body` strings to BE's real `titleKey`/`titleParams`/`bodyKey`/`bodyParams` i18n-key+params contract (ADR 0074 no-free-text-at-rest — the producing consumer runs with no request locale); translated at presentation via a known-keys allow-list + `unknown` fallback (never throws/renders a raw key), ICU params whitelisted to `{severity,occurredAt}` only so no raw UUID (`classId`/`studentMemberId`/`recordId`) can structurally reach rendered copy. Both real and mock repositories/mappers emit this same entity shape. New `notifications.titles.*`/`notifications.bodies.*` i18n keys (vi source + en mirror, 4 known BE producer key-pairs + `unknown` fallback). Zero new component/layout — design-review gate N/A (content-source swap only, confirmed via empty JSX-structure diff), lighter-touch a11y pass run per US-E18.18 precedent. All gates green (tech-lead initial Revision Required → same-branch fix → Approved; a11y PASS; QA Go). ADR `0066` registered. Cross-repo ask #34 RESOLVED, new ask #42 filed. See `US-E18.25-notification-center-wiring/story.md` + ADR `0066`. |

## KHÔNG thuộc wave này (BE chưa có endpoint — cần BE story hoặc quyết định giữ mock)

- **Announcements** — cả cụm không có trên BE (không service nào có `announcements`).
- **Audit log** — core có error `AUDIT_ENTRY_*` nhưng không expose endpoint.
- LMS `courses` / lesson-completion / notes (already mock by design, no
  BE-wiring action needed — US-E18.16).
- LMS `lesson-plans` / question-bank `exercisebank` — **RESOLVED** (finding
  #38): US-E11.8/US-E11.9 delivered the net-new screens and wired them real
  from the start. No longer out of scope.
- LMS `exam` feature (student exam-taking) vs `core`'s `ClassExam`/
  `ExamSubmission` — genuine non-lossless gap (MCQ-only real contract vs
  web's mixed MCQ+essay model + ADR `0048`; no `classId` in the web model at
  all vs `classId` mandatory on every real endpoint; admin-driven workflow
  status vs client `deadline`/`expired` model) — stays mock-first (US-E18.16,
  finding #38).
- Timetable `/me`-family + conflicts-summary (US-E18.11 giải bằng client-side resolve + error-driven conflict).
- Roster `students/unassigned`, class `/teachers` list, subject `restore`.
- Notification list + mark-read.
- Feed post pinning (BE US-101 `in_progress`) — thuộc nhóm B (UI mới), không thuộc epic này.

27. **(US-E18.16, 2026-07-17) [product/design-scope gap, not a BE gap]**
    `"lessons"→"/lms/lesson-plans"` (this epic table's original naming
    assumption for US-E18.16) is a false match: the web's only "lesson"
    feature (`lesson-bank` — teacher file/resource sharing: pdf/pptx/mp4/link,
    `private`/`dept`/`school` visibility, `docs/product/screens.md` "🎨
    design-ready") and BE's `lesson-plans` (`internal/lms/lessonplan` —
    structured DRAFT→PUBLISHED teaching-plan document:
    `objectives`/`contentOutline`/`activities`/`assessmentMethod`/`gradeLevel`/
    `tags`, browse-published-by-subject) are unrelated domain models with
    zero lossless field overlap beyond `subjectId`/`title`. Separately, no
    web feature (mock or otherwise) exists for BE's `exercisebank` question-
    bank service (`GET /lms/questions/search` + CRUD/publish for reusable
    ESSAY/SHORT_ANSWER/FILL_IN questions) at all — the only "questions"-named
    code in the repo (`LMS_EP.questions`, `ListQuestionsUseCase`/
    `AskQuestionUseCase`) is an unrelated per-lesson Q&A comment thread inside
    the student `lesson-player` (no `subjectId`/`gradeLevel`/`difficulty`/
    `status`). BE ships both real contracts cleanly (11-code `LESSON_PLAN_*` +
    ~12-code `QUESTION_*` error taxonomies, ground-truthed from
    `ERROR_CODES.md`/Go source) — this is NOT a BE gap. It IS a product/
    design-scope gap: a "teacher lesson-plan authoring" screen and a "teacher
    question bank" screen would be genuinely net-new UI, requiring
    `/uiux` (wireframe + design-spec) → `/ba` (requirements + AC) → `/fe`
    (implementation) — not a mock→real transport swap this epic can execute.
    US-E18.16 is descoped with zero code changes; the BE contract summary is
    documented in the story packet for a future `/uiux`/`/ba` pass to start
    from. `courses`/lesson-completion/notes (the one genuinely-actionable
    part of the original epic-table note) already stay mock by design — no
    action needed, confirmed unchanged.

## Cross-repo requests (gửi edu-api)

1. **Kong routes cho `social` + `notification`** trong `gateway/kong/kong.yml`
   — blocker của Wave 4.
2. Xác nhận **iam error-code taxonomy** (ERROR_CODES.md gần rỗng) — cần cho US-E18.6.
3. Danh sách "BE chưa có endpoint" ở trên — để BE quyết có build hay không.
4. **(US-E18.0, 2026-07-11)** `POST /api/v1/auth/refresh` không enforce
   refresh-token reuse-detection (`user_token_reused` documented nhưng không
   kích hoạt — replay token đã rotate-away vẫn trả `200` + token pair mới).
   Đây là gap an ninh phía BE (F3), cần fix trước khi dựa vào nó làm safety-net
   cho hybrid token strategy (decision `0018`).
5. **(US-E18.0, 2026-07-11)** Local dev stack (`make stack-up`) không seed sẵn
   user `SUPER_ADMIN` nào → không tạo được tenant đầu tiên để test full
   happy-path qua Kong. Cần một seed/migration/CLI dev-only bootstrap 1
   SUPER_ADMIN cho `docker/docker-compose.yml`.
6. **(US-E18.2, 2026-07-11)** IAM `MemberResponse` (`GET /iam/api/v1/tenants/{tenantId}/members`)
   không có field tên hiển thị (chỉ `tenantId`/`userId`/`roles`/`status`), và
   không có endpoint bulk/by-id user-lookup ngoài `/users/me` (self). Staffing
   Assignments screen (và mọi màn hiển thị "giáo viên được phân công" theo tên)
   không resolve được tên người từ một `memberId` bất kỳ → hiện fallback render
   raw `memberId`. Ask: thêm `fullName` vào `MemberResponse` (hoặc một batch
   `GET /iam/api/v1/users?ids=`) để service tiêu thụ join tên mà không cần
   endpoint internal-only.
   **✅ RESOLVED (IAM US-144, confirmed US-E18.23, 2026-08-01).** IAM shipped
   `GET /iam/api/v1/members?ids=a,b,c` (max 50 ids/call, scoped to the caller's
   active tenant claim) returning `MemberBatchItem`
   (`memberId`/`displayName`/`email`/`roles`) — exactly the batch lookup asked
   for. `LEFT` members ARE resolved so historical rows keep their names;
   unknown/malformed/other-tenant ids are silently omitted (not an existence
   oracle). Consumed via the new `src/features/iam-directory/` module;
   `staffing`'s assignment `memberName` no longer renders a raw `memberId`
   except for the unresolvable subset.
7. **(US-E18.4, 2026-07-16) [MAJOR — corrects #6's premise] IAM có KHÔNG MỘT
   endpoint listing member nào trên public API.** Đọc trực tiếp
   `edu-api/services/iam/docs/openapi.yaml` (tag `Members`) xác nhận
   `/api/v1/tenants/{id}/members` chỉ có `POST` (add); `/members/{userId}` chỉ
   có `PATCH` (đổi roles) + `DELETE` (remove) — **không có `GET` list, không có
   `GET` single-member lookup** trên public API. Endpoint lookup duy nhất
   (`GET /internal/v1/tenants/{tenantId}/members/{userId}`) là internal
   service-to-service, không qua Kong, web không gọi được. Hệ quả: US-E18.4's
   epic-table note "teacher list đổi nguồn sang IAM members" **không khả thi**
   với contract hiện tại — không chỉ thiếu tên hiển thị (ask #6) mà còn thiếu
   hẳn khả năng liệt kê. `class-management`'s `listTeachers` giữ nguyên
   mock-first vĩnh viễn cho tới khi có ask này. Ask: thêm
   `GET /api/v1/tenants/{id}/members` (list, cursor-paginated, optional
   `?role=`) trước khi bất kỳ màn admin nào (homeroom picker, "assign
   teacher"...) có thể wiring thật cho việc chọn người.
   **✅ RESOLVED (IAM US-144, confirmed US-E18.23, 2026-08-01).** IAM shipped
   `GET /api/v1/tenants/{id}/members?role=&search=&cursor=&limit=` on the
   PUBLIC API (cursor-paginated, `MemberListItem` carries
   `memberId`/`userId`/`displayName`/`email`/`roles`/`status`, `memberId ===
   userId`; reader RBAC = SUPER_ADMIN or tenant ADMIN/MANAGER/TEACHER, others
   get lowercase `member_list_forbidden`; `LEFT` members excluded). Caveat for
   future consumers: `role`/`search` are applied AFTER a keyset read, so a page
   may return fewer than `limit` items — even zero — while `hasMore` is true;
   follow `nextCursor` until `hasMore` is false (owned by
   `iam-directory`'s `SearchMembersUseCase`, do not re-implement).
   `class-management.listTeachers` is now REAL (`role=TEACHER`) and its
   permanent mock-delegation wrapper in `class-management.di.ts` is deleted.
8. **(US-E18.4, 2026-07-16)** `ClassResponse` không có `studentCount` hay
   homeroom fields (`homeroomTeacherId`/`homeroomTeacherName`) — web phải
   fan-out `GET .../students` (đếm roster, phân trang tới hết) +
   `GET .../homeroom-teacher` cho MỖI lớp trên trang danh sách hiện tại (2×N
   round-trip/trang, không phải toàn tenant như US-E18.2/E18.3's fan-out).
   Ask: thêm 3 field này thẳng vào `ClassResponse` (cùng nhóm ask như
   `activeAssignmentCount`/`childCount` đã xin ở US-E18.2/US-E18.3).
9. **(US-E18.5, 2026-07-16) [MAJOR — roster display data doesn't exist
   anywhere on the public API]** `EnrollmentResponse`
   (`GET /classes/{classId}/students`, the class roster listing) carries only
   `enrollmentId`/`classId`/`studentMemberId`/`academicYearLabel`/`enrolledAt`
   — no student name, DOB, gender, or status. This is worse than ask #6/#7
   (missing display name): even IF IAM shipped the member-listing endpoint
   requested in ask #7, IAM's `UserProfileResponse` still has **no `gender`
   field at all** (confirmed by reading `edu-api/services/iam/docs/openapi.yaml`
   in full), and `fullName`/`dob` are only readable via `GET /users/me`
   (self) — there is no batch/by-id profile read for arbitrary other users.
   A single raw-UUID fallback is tolerable for one field (homeroom-teacher
   display name, ask #6); rendering raw UUIDs for every row of a roster table
   (name/DOB/gender for potentially 30+ students) is not a shippable
   approximation. Decision (US-E18.5): the roster-listing screen
   (`getClassRoster`) and the unassigned-student search pool (`getSearchPool`,
   already known to have no core endpoint at all — `/students/unassigned`
   doesn't exist) both stay mock-first permanently. Ask: either (a) add
   `studentName`/`dob`/`gender` directly onto `EnrollmentResponse` (denormalize
   at read time, core already owns the enrollment↔student edge), or (b) ship
   a batch profile-lookup endpoint on IAM (`GET /api/v1/users?ids=`) that
   ALSO adds a `gender` field to `UserProfileResponse` (net-new field, not
   just newly-exposed) — needed before any admin-facing roster/search screen
   can show real student data instead of raw ids.
   **⚠️ STILL OPEN (re-checked US-E18.23, 2026-08-01) — only the
   member-listing HALF of this ask is addressed.** IAM US-144 closed the
   "can't list/lookup members at all" premise this ask inherited from #6/#7,
   but the roster-specific gap is untouched: `EnrollmentResponse` STILL has no
   student display fields, and `MemberListItem`/`MemberBatchItem` carry only
   `displayName`/`email`/`roles` — **no `dob`, no `gender`** anywhere. So
   `getClassRoster`/`getSearchPool` remain mock-first and were deliberately NOT
   touched by US-E18.23. Option (a) (denormalize onto `EnrollmentResponse`) or
   the `dob`/`gender` half of option (b) is still required.
10. **(US-E18.7, 2026-07-16)** `GradeScaleResponse`/`SetGradeScaleRequest`
    have no banding concept for numeric scales (`HE_10`/`HE_4_GPA`) — only
    `LETTER_ABCD` carries `letterGrades`. Web's editor lets admins define
    named threshold bands with colors for ANY scale type (a legitimate,
    already-shipped UX — `docs/product/design-spec.jsonc`); under the real
    contract this customization is decorative-only for the two numeric types
    (falls back to a local preset, never persisted). Ask: add an optional
    `bands: [{ label, minThreshold }]` array to `GradeScaleResponse`/
    `SetGradeScaleRequest` for numeric scale types too (mirrors what
    `letterGrades` already does for `LETTER_ABCD`).
11. **(US-E18.7, 2026-07-16)** `AssessmentColumnRequest`/`AssessmentColumnResponse`
    have no "number of assessments folded into this column" concept (web
    calls it `count` — e.g. "2 bài kiểm tra thường xuyên" under one TX
    column) — only `name`/`columnType`/`coefficient`/`ordinal`. Confirmed by
    reading the full schema in `services/core/docs/openapi.yaml`
    (`AssessmentColumnRequest`/`Response`, `GradeEntryResponse`'s composite
    key `classId+subjectId+termId+studentMemberId+columnId` implies exactly
    one recorded value per column per student). Ask: either add an optional
    `requiredCount`/`assessmentCount` field to `AssessmentColumnResponse`
    (display-only, since `GradeEntryResponse` still stores one value per
    column), or confirm this is intentionally a client-only UI label with no
    BE meaning (in which case web should stop implying it persists).
12. **(US-E18.7, 2026-07-16)** `GET /api/v1/subjects` has no `gradeLevel`
    query filter (only `status` + cursor pagination), even though
    `SubjectResponse.gradeLevel` exists as a field. The assessment-scheme
    screen's grade-scoped subject picker (`ASSESSMENT_EP.subjectsByGrade`)
    stays mock-first because of this — wiring it needs either a `gradeLevel`
    query param added to the list endpoint, or an explicit decision that
    grade-scoped filtering happens client-side across a fully-paginated
    fetch (expensive at scale, same fan-out-to-completion pattern already
    used elsewhere in this epic). Coordinate with whoever picks up
    US-E18.3 (subject-catalogue wiring, not yet done) since that US owns
    the real `Subject` listing.
13. **(US-E18.8, 2026-07-16) [confirms #6/#7's premise a 4th time, for a
    different resource]** `StaffLeaveRequestResponse`
    (`GET /api/v1/conduct/staff-leave-requests`) has **zero display fields**
    — no `staffName`, no `department`, and no leave-*type* concept at all
    (only free-text `reason`) — and the `GET` itself requires a mandatory
    `staffMemberId` query param with **no tenant-wide oversight list**
    (records partition on `(tenantId, staffMemberId)`, same partitioning
    choice as `student-leave-requests`/`staff-violations`). The admin
    staff-leave screen shows every staff member's pending/approved/rejected
    requests in one view — the real API cannot serve that in one call, and
    even a single-member call would render raw UUIDs for every row (ask
    #6/#7's gap, again). Ask: (a) add a tenant-wide oversight list variant
    (e.g. `staffMemberId` optional for `ADMIN`/`MANAGER`, or a dedicated
    `/tenants/{id}/staff-leave-requests` rollup), and (b) either denormalize
    a display name onto `StaffLeaveRequestResponse` or ship the IAM
    batch/by-id profile lookup already requested in ask #6/#7 — needed before
    ANY admin oversight screen across `conduct` can show real data instead of
    raw ids. Until then `staff-leave`'s `StaffLeaveRepository` stays a
    permanent blocked stub (US-E18.8) — the epic's first DI factory forced to
    mock 100% of its operations, not just a subset.
    **🟡 PARTIALLY RESOLVED (US-E18.23, 2026-08-01) — part (a) done, part (b)
    done, a THIRD gap survives and still blocks wiring.** (a) core US-149 made
    `staffMemberId` OPTIONAL on `GET /api/v1/conduct/staff-leave-requests`;
    omitting it returns the tenant-wide oversight list sliced by `status`
    (ADMIN/MANAGER/SUPER_ADMIN, else the reused `403 VIOLATION_FORBIDDEN`;
    `status` defaults to `submitted` — the wire has no literal `pending`, and
    sending `status=pending` is a `400 VIOLATION_INVALID_STATE`). (b) IAM
    US-144's batch lookup resolves `staffName` from `staffMemberId`. BUT
    `department` and `leaveType` still have **zero** source on
    `StaffLeaveRequestResponse` (re-ground-truthed 2026-08-01), and both are
    required non-optional on the web entity + read unguarded by the shipped
    card — so `staff-leave` STAYS force-mock, with the residual gap carried to
    **ask #41** below. Doc comments on `staff-leave.di.ts` +
    `staff-leave.repository.ts` corrected accordingly (the "no tenant-wide
    list exists" rationale was stale).
14. **(US-E18.9, 2026-07-16)** `edu-api/services/core/internal/lms/teachingplan`
    has NO HTTP route to edit an existing teaching plan's weekly entries —
    `POST /api/v1/lms/teaching-plans` sets `weeklyEntries` exactly once at
    create time; `routes.go` mounts only `POST /`, `GET /`, `GET /:id`,
    `PUT /:id/{submit,approve,reject}`. The domain aggregate already HAS the
    capability: `TeachingPlan.UpdateEntries()`
    (`core/domain/entity/teaching_plan.go`) replaces the weekly entries and is
    unit-tested (`TestTeachingPlan_UpdateEntries_ReplacesEntries`) but is
    never called by any use-case or handler — dead code. Ask: expose it as
    `PUT /api/v1/lms/teaching-plans/{planId}?classSubjectId=&academicYear=`
    (entries-replace while `DRAFT`, mirroring the existing submit/approve/
    reject param shape) — this is likely the cheapest unblock in the whole
    epic, since the domain logic is already written and tested. Separately
    (a product decision, not purely a BE ask): the real contract has no
    per-term concept (one plan spans a full academic year) and no period axis
    (`WeeklyEntryResponse` is week-only, `{weekNumber, topic, notes}`) — the
    web screen's term-scoped, week×period grid has no lossless mapping onto
    this model regardless of what HTTP surface exists; unblocking `/cells`
    alone would not make the current UI wireable without also resolving this
    modeling gap (flagged for `uiux`/`ba`, not resolvable by `fe` alone).
    Until either lands, `teaching-plan`'s `TeachingPlanRepository` stays a
    permanent blocked stub (US-E18.9) — the epic's second fully-blocked DI
    factory after US-E18.8.
15. **(US-E18.11, 2026-07-16) [confirms #6/#7/#9/#13's premise a 5th time, for
    timetable]** No STUDENT/PARENT self-scope discovery endpoint exists for
    "which class am I/my linked child enrolled in". `GET /api/v1/classes` is
    ADMIN/SUPER_ADMIN(all)/TEACHER(assigned-only) — any other role hits
    `domainerror.ErrClassForbidden()` (ground-truthed in
    `services/core/internal/class/core/application/usecase/list_classes.go`
    line 59). `GET /api/v1/members/{memberId}/linked-students` (parent→student,
    real, callable) returns only `{linkId, parentMemberId, studentMemberId,
    createdAt}` — no classId. There is no other endpoint any STUDENT/PARENT
    actor can call to resolve a classId. Consequence: the timetable feature's
    `getMyTimetable` (student self-view) and `getChildren`+child view (parent)
    stay mock-first permanently — the epic's third fully-blocked operation set
    after US-E18.8/US-E18.9 (partial here — `getByClass`/`getByTeacher` on the
    same repository ARE wireable). Ask: either (a) add a
    `GET /members/{memberId}/enrollment`-style endpoint any STUDENT/PARENT-for-
    their-own-linked-student can call to resolve current classId, or (b) accept
    this stays mock-first indefinitely.

    **✅ RESOLVED (core US-153 + US-148, confirmed US-E18.26, 2026-08-01).**
    BE shipped BOTH asks: `GET /members/{memberId}/timetable?termId=`
    (US-153 — the by-member view, resolves teaching slots else current
    enrollment, PARENT-linked-child addressable) and
    `GET /members/{memberId}/enrollment?yearLabel=` (US-148 — resolves
    `classId`/`className`/`gradeLevel` for STUDENT self / linked PARENT /
    staff). `getMyTimetable`/`getByTeacher`/`getChildren`+child view all now
    wired real in `src/features/timetable/`. See
    `US-E18.26-timetable-by-member-room-wiring/story.md`.
16. **(US-E18.11, 2026-07-16)** No bulk/whole-school timetable-conflicts
    endpoint exists — `services/core/docs/openapi.yaml`'s `Timetable` tag has
    only `PUT`/`GET .../timetable` and `DELETE .../timetable/slots`; conflicts
    are detectable ONLY reactively, as a `409 TIMETABLE_TEACHER_CONFLICT` on
    the per-class `PUT`. The admin builder screen's proactive whole-school
    "conflict summary" card (listing every teacher double-booking across all
    classes, with jump-to-conflict) has no way to populate itself without an
    expensive full-tenant fan-out (every class × its timetable, cross-
    referenced client-side by `(teacherMemberId, day, period)`) — out of scope
    for US-E18.11. `getConflicts()` stays mock-first permanently; the reactive
    409 is wired instead (new `teacher-conflict` failure, surfaced on save).
    Ask: either a bulk conflict-scan endpoint, or a materialized/precomputed
    conflicts view, if the proactive dashboard is a real product requirement.
17. **(US-E18.11, 2026-07-16)** `SlotRequest`/`SlotResponse`
    (`services/core/docs/openapi.yaml`) have no `room` field at all — only
    `day`/`period`/`subjectId`/`teacherMemberId`. The web builder's per-slot
    room input (already-shipped UX) is decorative-only in real mode: it
    survives within a single editing session but is not persisted past a
    reload (same non-persistent-field category as ask #10/#11's `bands`/
    `count`). Ask: add `room` (optional string) to both schemas if per-slot
    room assignment is a real requirement.

    **✅ RESOLVED (core US-153, confirmed US-E18.26, 2026-08-01).** BE added
    optional `room` (maxLength 32) to both `SlotRequest`/`SlotResponse`.
    Threaded through the admin builder's mapper + RMW `updateSlot` both
    directions (incl. preserving `room` on untouched sibling slots across a
    single-cell edit). See `US-E18.26-timetable-by-member-room-wiring/story.md`.

18. **(US-E18.12, 2026-07-16)** No tenant/school-wide "grade entries pending
    approval" rollup exists — `GET .../grades` requires an already-known
    `(classId,subjectId,termId)` triple. The admin batch-oversight dashboard
    (`grade-approval-screen`) has no way to populate itself. Ask: either (a) a
    rollup endpoint, or (b) accept this stays mock-first indefinitely.
19. **(US-E18.12, 2026-07-16)** No reject/request-revision transition exists
    for `GradeEntry` (unlike `StudentConductGrade`, which has one). Ask: add a
    `PENDING_APPROVAL → DRAFT`/`REJECTED` transition mirroring conduct-grade
    reject, if admin-requested revision is a real product requirement.
20. **(US-E18.12, 2026-07-16) [confirms #6/#7/#9/#13/#15's premise a 6th
    time]** `LinkedStudentsResponse` (`GET /members/{id}/linked-students`)
    carries zero display fields (no student name/class) — same gap class
    across every "list linked/related entities" endpoint audited so far.
    Parent child-switchers (grades AND timetable) stay mock-first until IAM
    ships a batch profile lookup (ask #6/#7) or this endpoint gets a
    denormalized display name + current class.

    **🟡 PARTIALLY RESOLVED (core US-148, confirmed US-E18.26, 2026-08-01) —
    class half done, name half still open.** `LinkedStudentItemResponse` is
    now enriched with nullable `classId`/`className` (US-148) — timetable's
    parent child-picker wired real, showing the child's actual class. The
    student display NAME half of this ask is STILL open: no directory/IAM
    endpoint any PARENT can call resolves a linked student's name (directory
    RBAC 403s PARENT, confirmed US-E18.23). Timetable's child-picker degrades
    gracefully to a stable ordinal label ("Con thứ N") rather than inventing
    a name. See `US-E18.26-timetable-by-member-room-wiring/story.md`.
21. **(US-E18.13, 2026-07-16) [confirms #6/#7/#9/#13/#15/#18/#20's premise a
    7th time, different resource]** No `GET` listing endpoint exists for
    unseal requests at all — `services/core/docs/openapi.yaml`'s
    `AcademicRecords` tag defines only `POST
    .../academic-records/unseal-requests` (create) and `POST
    /academic-records/unseal-requests/{requestId}/approve` (approve); there
    is no way for a second admin, in a different session, to discover a
    pending `requestId` to approve. The two-admin async confirmation
    workflow this feature exists to serve is therefore unreachable end-to-
    end even though both POST actions individually exist. Ask: add `GET
    /api/v1/classes/{classId}/terms/{termId}/academic-records/unseal-requests`
    (or a tenant-wide variant) returning at least `{requestId, classId,
    termId, studentMemberId, requestedBy, reason, status, createdAt}`.
    Until then `academic-records`'s unseal workflow (`initiateUnseal`/
    `confirmUnseal`/`getPendingUnsealRequests`/`listTenantAdmins`) stays a
    permanent blocked stub (US-E18.13, ADR `0055`) — the epic's fourth fully-
    blocked operation set after US-E18.8/US-E18.9/US-E18.11's self-view. Only
    `sealBatch` (the batch-seal POST) is wired real. Separately, the read-
    only viewer (`getRecord`/`listYears`) also stays permanently mock — no
    wire year-grouping concept, no fixed `tx1`/`tx2`/`giuaKy`/`cuoiKy` column
    shape (real snapshot is `GradeSnapshotItemResponse[]`, a dynamic column
    array matching US-E18.7's real assessment-scheme model), and no student-
    identity fields on this endpoint (ask #9's gap, an 8th confirmation).
    **RESOLVED (core US-150, confirmed on `origin/main` 2026-08-01, wired by
    US-E18.24):** the requested `GET .../unseal-requests` listing endpoint
    now exists (cursor-paginated, `status` filter, defaults `PENDING`), plus
    a companion `GET .../seal-status` class-term rollup. `getPendingUnsealRequests`/
    `initiateUnseal`/`confirmUnseal`/`getSealStatus` are now wired real.
    `listTenantAdmins` stays mock — separate reason, not this ask's gap: the
    tenant-role model has no `SUPER_ADMIN` membership row to list at all. See
    `US-E18.24-unseal-workflow-wiring/story.md`.

22. **(US-E18.14, 2026-07-17) [confirms #6/#7/#9/#13/#15/#18/#20/#21's premise a
    9th time — AND extends #15 beyond its original scope]** Ask #15
    (US-E18.11) documented that PARENT has no way to resolve a linked child's
    `classId`. Reading `services/core/internal/conduct/core/application/usecase/
    list_student_violations.go` and `list_student_conduct_grades.go` found the
    identical gap **also blocks the STUDENT's own self-view**: both use-cases
    parse `classId` as a mandatory input BEFORE the role switch, and the
    `ownOnly`/self-scope branch only filters an already-classId-scoped page —
    it does not remove the requirement. `POST /api/v1/conduct/
    student-leave-requests` (`CreateStudentLeaveRequestRequest.ClassID`,
    `validate:"required,uuid"`) has the same shape for submit. There is no
    `GET /members/{id}/enrollment`-equivalent a STUDENT can call to resolve
    their own current classId (same absence confirmed for PARENT in ask #15).
    Consequence: unlike every other blocked cluster in this epic (US-E18.8/
    US-E18.9), which were blocked by a *display-data* or *roster-lookup* gap
    affecting oversight/admin screens, this is the first case where the gap
    also blocks the **self-service** pillar — i.e. even a student querying
    strictly their own records cannot do so against the real API. Ask: add a
    self-scope class-discovery endpoint (as ask #15 already requested) —
    this finding raises its priority, since it now blocks self-service, not
    just cross-entity oversight.

    **🟡 PARTIALLY RESOLVED (core US-148, confirmed US-E18.26, 2026-08-01) —
    the classId-discovery HALF for timetable, not conduct.**
    `GET /members/{memberId}/enrollment?yearLabel=` (the exact endpoint shape
    this ask requested) now exists and is wired for timetable's student
    self-view (US-E18.26). It has NOT been applied to `discipline`/conduct —
    that self-view UI doesn't exist in the web app at all yet (a product/
    design gap, not a BE gap, per US-E18.14's own note) and was explicitly
    out of scope for US-E18.26 (timetable-only). Recommendation for a future
    US: wire conduct's STUDENT self-view against this same enrollment
    endpoint once a `uiux`/`ba` pass defines the screen. See
    `US-E18.26-timetable-by-member-room-wiring/story.md`.

23. **(US-E18.15, 2026-07-17) [confirms #6/#7/#9/#13/#15/#18/#20/#21/#22's
    premise a 10th time]** `ExamPaperResponse` (`core`'s `exambank` context)
    carries only `authorId` (UUID) — no author display name. Same recurring
    IAM-name-lookup gap.

24. **(US-E18.15, 2026-07-17)** `AddQuestionRequest`/`ExamQuestionResponse`
    (`internal/lms/exambank/adapter/http/dto`) have no options-text array
    field — MCQ questions with more than one answer choice cannot fully
    round-trip through the real contract as currently defined (only
    `{questionType, body, answerKey, marks}` per question). Ask: add an
    `options: string[]` (or similar) field if MCQ-authoring parity with the
    web's current mock builder is a real product need.

    **✅ RESOLVED (core US-152, confirmed US-E18.28, 2026-08-01).** BE added
    `options: ExamQuestionOptionRequest[]` (2–4, `id` one of A–D) +
    `correctOptionId` + `difficulty` to `AddQuestionRequest` AND the new
    `UpdateExamQuestionRequest`, round-tripped on `ExamQuestionResponse`
    (`questionId`/`options`/`correctOptionId`/`difficulty` now present). MCQ
    questions fully round-trip; `exam-bank`'s mapper reshaped to map them
    faithfully instead of defaulting. See
    `US-E18.28-exam-bank-edit-delete-wiring/story.md`.

25. **(US-E18.15, 2026-07-17) [BE-side doc-hygiene, not a web blocker]**
    `services/core/docs/openapi.yaml`'s `ExamBank` write-path documentation
    is drifted from the actual Go source/routes: it documents
    `CreateExamPaperRequest.questions` (optional inline question array on
    create) and a `SetExamQuestionsRequest` full-replace endpoint at
    `POST /exam-papers/{id}/questions`; the real handler
    (`exam_paper_handler.go`) binds a metadata-only `CreateExamPaperRequest`
    (no `questions` field) and the real `/questions` endpoint appends
    exactly ONE question per call (`AddQuestionRequest`), DRAFT-only, with
    no replace/edit/remove semantics. Ask: regenerate/reconcile
    `openapi.yaml` for the `ExamBank` tag against the Go source. (The epic's
    own playbook step 1 already mandates ground-truthing the Go source, not
    trusting `openapi.yaml` alone — this is the first US where the doc was
    caught describing a materially richer contract than what is deployed,
    not just a path/field-naming drift.)

    **✅ RESOLVED (core US-152, confirmed US-E18.28, 2026-08-01).**
    `openapi.yaml`'s `ExamBank` tag re-checked against
    `internal/lms/exambank/adapter/http/**` — matches the Go source now
    (create still metadata-only, question add/edit/remove, options/
    correctOptionId/difficulty schema all present and consistent). No
    further drift found.

26. **(US-E18.15, 2026-07-17)** No update or delete endpoint exists for exam
    papers at all (`internal/lms/exambank/adapter/http/routes.go` mounts
    only create/add-question/change-status/get/list). If editing a DRAFT
    paper's metadata or discarding a mistaken DRAFT is a real product need,
    ask BE for `PATCH`/`DELETE` restricted to DRAFT + author-only.
    Separately: no `POST /lms/class-exams` UI exists anywhere in the web
    app — publishing an exam paper to a class, admin
    activate/complete/retract, and the submissions viewer (US-055/US-062)
    are net-new screens with zero prior design/BA work. Route to `/uiux` +
    `/ba` if this becomes a real product priority — BE already ships the
    full contract, this is a product/design gap, not a BE gap.

    **✅ RESOLVED (core US-152, confirmed US-E18.28, 2026-08-01) — paper
    update/delete half only.** BE shipped `PATCH`/`DELETE
    /exam-papers/:id` (author-only, DRAFT-only) and
    `PUT`/`DELETE /exam-papers/:id/questions/:questionId` (edit/remove one
    question, same guards). Wired real in US-E18.28 (`updateExam`/
    `deleteExam`, diff-sync question sub-calls — see ADR 0056 Amendment 2).
    `createExam` (bulk/inline-questions paper creation) still has no wire
    equivalent and stays a permanently blocked stub — out of scope for this
    resolution, not asked for by this ask's text. The separate
    `/lms/class-exams*` product/design gap (publish-to-class, admin
    lifecycle, submissions viewer) is untouched, still open.

29. **(US-E21.1, 2026-07-18)** No listing endpoint exists for tenant
    invitations at all — `services/iam/internal/membership/adapter/http/routes.go`
    mounts only `POST .../invitations` (invite), `DELETE
    .../invitations/:invitationId` (revoke), `POST /invitations/accept`
    (accept). `InvitationRepository`'s port (`core/application/port/
    invitation_repository.go`) only has `Save`/`Get(tenant+id)`/`GetByToken`
    — no `List`, confirming the Scylla model is point-lookup-shaped
    (`member_invitations` + `invitations_by_token`, both TTL-keyed), not a
    tenant-wide scan today. The admin invitations screen (US-E21.1) needs
    `GET /api/v1/tenants/{tenantId}/invitations` returning
    `{invitationId, email, roles[], status, invitedBy, createdAt, expiresAt}`
    (cursor-paginated) — `InvitationResponse` today has none of
    `status`/`invitedBy`/`createdAt` either (only `invitationId`/`email`/
    `roles`/`expiresAt`, returned solely from the invite POST). Until this
    ships, the admin invitation table stays permanently mock-first — the
    5th fully-blocked operation in the epic after US-E18.8/US-E18.9/
    US-E18.13/US-E18.14.
    **✅ RESOLVED (IAM US-147, confirmed US-E18.29, 2026-08-01).** IAM
    shipped `GET /api/v1/tenants/{id}/invitations?status=&cursor=&limit=`
    (tenant ADMIN or platform SUPER_ADMIN only — stricter than the member
    directory since this surface exposes raw invitee emails, PII;
    MANAGER/TEACHER get `forbidden_action`), returning
    `InvitationListItem { invitationId, email, roles[] (UPPERCASE),
    status (lowercase), invitedBy (raw userId), createdAt, expiresAt }`,
    cursor-paginated with the same short-page-but-`hasMore`-true semantics
    already established for the member directory. Wired real in US-E18.29
    (`invitation.repository.ts`, `iam-directory`'s `{raw:true}`+
    `parseEnvelope` pattern); `invitedBy` resolved to a display name via
    `iam-directory`'s `BatchResolveMembersUseCase`. `admin-invitations.di.ts`
    collapsed from US-E21.1's hybrid force-mock to a plain `USE_MOCK` gate.
30. **(US-E21.1, 2026-07-18)** No resend endpoint exists for an
    expired invitation (`routes.go` has no `.../resend` route, no use-case,
    no repository method). Ask: add a dedicated action endpoint mirroring
    this same service's `activate`/`deactivate` tenant-action convention,
    e.g. `POST /api/v1/tenants/{tenantId}/invitations/{invitationId}/resend`,
    reusing the SAME `invitationId` (server regenerates token + `expiresAt`,
    flips status back to `pending` in place — not a new invitation record).
    Separately, `InviteRequest` has no `expiryDays`/TTL field at all — the
    invitation's TTL is entirely server-computed
    (`entity.MemberInvitation.RemainingTTL`), so the web's 7/14/30-day expiry
    selector (`docs/product/design-spec.jsonc` → `screens.invitations.
    sendDialog.expirySelect`) has no real wire effect today; ask BE whether
    invite-time TTL should become client-configurable, or keep it
    server-policy-only (in which case a future design pass should reconsider
    whether the expiry selector belongs in the UI at all).
    **✅ RESOLVED (IAM US-147, confirmed US-E18.29, 2026-08-01) — resend half
    only.** BE shipped `POST /api/v1/tenants/{id}/invitations/{invitationId}/
    resend` exactly as asked: same `invitationId` reused, token +
    `expiresAt` rotated, `status` reset to `pending` in place (`roles`/
    `invitedBy`/`createdAt` preserved, not re-attributed to the resending
    admin). Rate-limited per-`invitationId` (3/hour, 429 `rate_limit_exceeded`
    + `Retry-After` header — first header-consumer in this repo, no client
    lockout timer built, toast-only per an explicit simplicity call). Wired
    real in US-E18.29. The `expiryDays`/TTL residual is UNRESOLVED — BE still
    has no client-configurable TTL field; the 7/14/30-day expiry selector in
    the send dialog still has zero wire effect (unaffected by this US, which
    only touched list/resend, not send) — still open for a future `ba-lead`
    product decision on whether to keep/hide the selector.

31. **(US-E21.2, 2026-07-18) [MAJOR — corrects ADR 0051's premise]**
    `POST /api/v1/invitations/accept` requires `RequireAuth` (Bearer JWT) —
    it is NOT public/unauthenticated, and its body (`dto.AcceptRequest`) is
    `{token}` only, no `fullName`/`password`/account-creation field
    anywhere in the DTO or use-case (`accept_invitation.go` only creates a
    tenant `Member` for the ALREADY-authenticated caller — it never touches
    the user/auth bounded context). There is no capability, anywhere on this
    endpoint, for an unauthenticated guest to create an account by accepting
    an invite. Separately, this app's own frontend has no self-serve
    `/register` screen either (`src/app/[locale]/(auth)/` only has
    `forgot-password`/`login`/`select-role`/`select-tenant`). See ADR `0059`
    (amends `0051`) + `US-E21.2-invite-accept/spec.md` §"Ground-Truth
    Correction". Ask: if self-serve public registration tied to an
    invitation token is ever wanted, it needs new BE surface (account
    creation + invitation consumption in one transaction) plus a new FE
    registration screen — track as a future joint ask, not solved by
    US-E21.2. Also confirms only 2 real terminal error codes exist for
    accept (`invitation_invalid` covers not-found/used/revoked as ONE code;
    `invitation_expired` separate) plus `invitation_email_mismatch` (403,
    confirms ADR `0051` rule 6's "no silent merge" concern as a hard reject)
    — no distinct "used" code and no `USER_EMAIL_ALREADY_EXISTS`
    account-conflict path exists on this endpoint.

28. **(US-E13.2, 2026-07-18)** No bulk/range endpoint exists for a class's
    attendance history — `internal/attendance/adapter/http/routes.go` only
    mounts a single-date class GET (`GET /classes/:classId/attendance?date=`)
    and a single-STUDENT range GET (`GET /members/:memberId/attendance?
    startDate=&endDate=`, scoped to one member, not a class). The web's
    history tab needs "this class's attendance across the last N days" —
    served today via a bounded (≤31 days) client-side fan-out of the
    single-date GET, aggregated into a per-day status-count summary. Ask: add
    a class-scoped date-range endpoint (e.g.
    `GET /classes/{classId}/attendance?startDate=&endDate=`, mirroring the
    member-range shape) to remove the fan-out. See ADR `0058` +
    `US-E13.2-attendance-be-wiring/US-E13.2-attendance-be-wiring.md`.

32. **(US-E18.17, 2026-07-22) [product/BE gap — messaging groups/pin/contacts]**
    Ground-truthing `services/social/docs/openapi.yaml` for the messaging
    remodel found three permanent blockers, none fixable by a web-side
    remap:
    - **No self-service group-room contract.** `POST /api/v1/rooms` only
      accepts `roomType ∈ {class_chat, announcement, parent_group, dm}` with
      a MANDATORY `sourceRefId`+`sourceRefType: class|system` pair — a room
      is always provisioned FROM a system source (a class, a club), never
      created ad hoc by an end user picking an arbitrary member set + name +
      color. `custom`/`club_chat`/`staff_internal` exist in `RoomSummary`'s
      enum but are reachable only via the separate Club endpoints or
      worker-side provisioning. The web's existing "create a group chat"
      teacher/admin flow (member picker + name + color + kind) has zero
      lossless mapping onto this model. Ask: either (a) ship a genuine
      self-service "create a custom room with an arbitrary member set"
      endpoint, or (b) accept the group-chat feature needs a product/design
      redesign around the real `class_chat`/`parent_group`/club model
      (route to `/uiux`+`/ba`).
    - **No message-pin endpoint at all** (only feed POSTS have
      `/feeds/posts/{id}/pin`, an unrelated already-wired feature). The
      web's pin/unpin-in-chat feature (group info panel pinned-messages
      list) has nothing to wire against.
    - **The only people-directory endpoint is role-gated.**
      `GET /social/api/v1/social/tenants/{tenantId}/members/directory`
      requires an `ADMIN`/`TEACHER` tenant-wide staff fact —
      `STUDENT`/`PARENT` callers get `PROFILE_NOT_FOUND` (404)
      unconditionally (enumeration-safe, by design). The web's "start a new
      chat" contact picker is role-agnostic today; wiring it real would
      silently break for non-staff roles with no fallback. Ask: either add
      a role-appropriate directory variant for STUDENT/PARENT (e.g. their
      own homeroom teacher(s) + linked-parent/child, mirroring the
      visibility rule already used for room-membership), or confirm the
      contact picker should become staff-only in real mode (a product
      decision, not purely a BE ask).
    Until any of these land, `createGroup`/`getGroup`/`updateGroup`/
    `addGroupMembers`/`removeGroupMember`/`leaveGroup`/`deleteGroup`,
    `pinMessage`/`unpinMessage` stay permanently mock (`getContacts` NO LONGER
    does — un-mocked in **US-E18.52**, Wave 8, after IAM ADR 0129) —
    the epic's 6th fully/partially-blocked operation set (after
    US-E18.8/US-E18.9/US-E18.13's unseal/US-E18.14/US-E21.1). See ADR
    `0060` + `US-E18.17-messaging-rooms-remap/story.md`.

33. **(US-E18.18, 2026-07-23) [BE-side gap — Kong routing AND auth trust
    model, two independent blockers]** `gateway/kong/kong.yml`'s comment
    ("notification is a worker (no HTTP) and is not routed here") is stale —
    `services/notification/docs/INTEGRATION.md` documents a real `cmd/server`
    HTTP+SSE surface (`/api/v1/stream`, `/api/v1/notifications/unread-counts`,
    `/api/v1/presence`, plus push endpoints). Ask #1 (Kong routing for
    `notification`) still stands. SEPARATELY, even once routed, ADR `0047`
    (kong auth trust model) means `notification`'s `cmd/server` trusts ONLY
    Kong-injected `X-Edu-Claims`/`X-Edu-Claims-Sig` headers — a direct
    service call (which is what this repo's SSE proxy does today, bypassing
    Kong entirely per ADR 0009/0030) will 401 regardless of any Bearer
    token, confirmed by ADR 0047's own Consequences section ("a direct call
    to a service carries no HMAC-signed `X-Edu-Claims` header ... returns
    401 regardless of the bearer token"). Ask: once Kong routes
    `notification`, this repo's `app/[locale]/api/stream/route.ts` real
    branch must ALSO be changed from direct-bypass-to-`NOTI_SERVICE_URL` to
    routing through Kong — a second, separate unblock beyond routing alone.
    See ADR `0061` + `US-E18.18-notification-sse-wiring/story.md`.
34. **(US-E18.18, 2026-07-23) [product/BE gap — no generic notification-bell
    concept exists on the real wire at all]** `GET
    /api/v1/notifications/unread-counts` is per-ROOM (`{roomId,
    unreadCount}[]`) — a messaging concept, not a generic
    grade/attendance/discipline/announcement/system notification concept.
    There is no `list`/`mark-read`/`mark-all-read`/generic-unread-count
    route anywhere on the `notification` service. The web's
    `notification`-feature bell (`getUnreadCount`/`listNotifications`/
    `markRead`/`markAllRead`) has ZERO real backing of any kind and stays
    force-mocked permanently (`HybridNotificationRepository`) — the 7th
    fully/partially-blocked operation set in the epic. If a real
    multi-category in-app notification center is a genuine product
    requirement, it needs new BE surface entirely (not a wiring swap); route
    to `/uiux`/`/ba` if prioritized.

    **✅ RESOLVED (BE US-146, confirmed US-E18.25, 2026-08-01).** BE shipped
    the real generic notification-center surface named as missing above:
    `GET /notifications` (list), `GET /notifications/unread-count`
    (SINGULAR generic count — distinct from the per-room PLURAL
    `unread-counts` this ask itself described), `PATCH /notifications/{id}/read`,
    `PATCH /notifications/read-batch`. `HybridNotificationRepository` is
    retired entirely; all 4 methods are now real. See
    `US-E18.25-notification-center-wiring/story.md` + ADR `0066`.
35. **(US-E18.18, 2026-07-23) [product question, not a BE gap]** The real
    `GET /api/v1/presence` contract is a flat 2-state model
    (`{userId, online: boolean, lastSeen: string|null}`) — there is no
    server-side "recently active" tier. The web's existing 3-state
    `PresenceState` (`online`/`recent`/`offline`, shipped US-E10.6) is kept
    (zero UI change) by deriving `recent` client-side from `lastSeen` age
    with a 5-minute engineering-default threshold — no confirmed
    product/design-spec value exists for this window. Ask `/uiux`/`/ba` to
    confirm or override the threshold if presence precision becomes a real
    product concern.
36. **(Audit 2026-07-26) [re-up ask #1 với evidence mới — Kong + compose gaps]**
    Đọc trực tiếp `edu-api/gateway/kong/kong.yml` + `docker/docker-compose.yml`:
    (a) Kong vẫn CHƯA route `social` (41 paths), `notification` (7 paths kể cả
    SSE `/api/v1/stream`), `lms`; comment dòng 3 kong.yml "notification is a
    worker (no HTTP)" đã STALE — `services/notification/docs/INTEGRATION.md`
    xác nhận `cmd/server` HTTP+SSE thật. (b) `docker-compose.yml` không định
    nghĩa service `social` lẫn `lms` — social đã full-implemented (528 files,
    57 routes) nhưng không bật được trong stack local. Ask: route Kong cho
    `social` + `notification`, thêm `social` vào compose, sửa comment stale.
    Đây là blocker duy nhất còn lại cho live-proof của US-E18.17/US-E18.18 và
    cho wiring thật feed/moderation (mock-first hiện tại). Lưu ý kèm ask #33:
    SSE proxy của web phải đi QUA Kong (ADR 0047 X-Edu-Claims) — route Kong
    xong thì web re-architect proxy (đã ghi ADR 0061).
37. **(Audit 2026-07-26) [reopen US-E18.16 — premise descope đã hết đúng]**
    US-E18.16 descoped 2026-07-17 vì "web không có feature lesson-plan /
    question-bank". Từ đó: DR-021 → US-E11.8 (lesson-plan authoring + builder)
    + US-E11.9 (question-bank + builder) đã implemented (routes
    `/teacher/lesson-plans*`, `/teacher/question-bank*`), và core đã expose
    `/core/api/v1/lms/lesson-plans` + `/core/api/v1/lms/questions` (BE US-136
    moved courseware off `lms` service). US-E18.16 giờ là wiring US khả thi
    bình thường (kèm remap `exam.endpoint.ts` `/lms/api/v1/exams` →
    `/core/api/v1/lms/class-exams` mà US-E18.15 chưa phủ phần `exam` feature).
38. **(Reopen resolution, 2026-07-26) [US-E18.16 — 2/3 already done, 1/3 stays
    mock: genuine gap, not a redo]** Re-running the ground-truth check per
    finding #37 found lesson-plan and question-bank were NOT left as bare
    net-new screens for this epic to wire — US-E11.8/US-E11.9 already wired
    them real end-to-end (repository/DI/`ensureFreshSession()`/error-map, full
    TDD+review+a11y+design-review+QA gate history in their own packets),
    confirmed by direct code read this session (no assumption). Zero
    additional code needed for either. The `exam` remap finding #37 raised
    (`exam.endpoint.ts`→`/core/api/v1/lms/class-exams`) turned out to be a
    genuine, non-lossless domain-model gap on independent examination — not
    a simple path swap: (a) real `ExamSubmission`/`ClassExam` is MCQ-only
    (auto-graded purely from the frozen snapshot's `answerKey`s), while the
    web `exam` feature explicitly models mixed MCQ+essay exams with a
    pending-grade intermediate state (ADR `0048`, written for the
    then-target `lms` service); (b) the web model carries no `classId`
    anywhere, while every real endpoint (`GET .../class-exams`,
    `POST .../submissions`) requires one (plus `termId`/`academicYearLabel`/
    `columnId` on submit, to route the score into a specific grade column) —
    same class of gap as ask #15 (`linked-students` no-`classId`); (c) the
    web's client-`deadline`/`expired` status model has no real counterpart —
    the real contract is an admin-driven `SCHEDULED→ACTIVE→COMPLETED`/
    `RETRACTED` workflow with no wire "deadline" field at all. Per this
    epic's own established precedent for a non-lossless gap (findings #14,
    #15, #27), `exam.endpoint.ts`/`src/features/exam/**` stay mock-first,
    untouched. Net effect: US-E18.16 closes `implemented` — 2 of 3
    sub-scopes are real (delivered by sibling US's, verified not re-done),
    1 of 3 is a documented, justified permanent mock-first hold, matching
    the epic's own definition of "done" for a wiring US (Wave-1/2 precedent:
    hybrid/partial repositories with a documented blocked remainder count as
    `Done`, not `planned`).
39. **RESOLVED (US-E18.30, 2026-08-02).** BE US-164 added a `roleManager =
    "MANAGER"` branch to `ListClassesUseCase.Execute()`
    (`list_classes.go:61`: `if isAdmin(...) || hasRole(in.ActorRoles,
    roleManager)`), granting principal tenant-wide read parity with
    ADMIN/SUPER_ADMIN on `GET /api/v1/classes` — exactly the ask below.
    BE US-173 additionally enriches `ClassResponse` with `studentCount` +
    `homeroomTeacherId`/`homeroomTeacherName` directly on the wire (list +
    get), letting `bootstrap/di/principal-classes.di.ts` flip to
    `USE_MOCK ? Mock : Real` (no more permanent force-mock) AND letting FE
    delete 5 separate client-side enrichment fan-outs across
    `class-management`/`teacher-class`/`teacher-dashboard`/`admin-roster`
    repositories (all proven removed via call-count regression tests). See
    `US-E18.30-principal-classes-real/US-E18.30-principal-classes-real.md`.

    **Original finding (for the record), (US-E13.8, 2026-07-26) [re-confirms
    finding under US-E18.11 — MANAGER (principal) cannot call
    `GET /api/v1/classes` at all, ground-truthed a 2nd time]** `core`'s
    `ListClassesUseCase.Execute`
    (`internal/class/core/application/usecase/list_classes.go`) branches
    `isAdmin(...) → ListByYear` / `isTeacher(...) → listForTeacher` /
    else → `domainerror.ErrClassForbidden()`. `MANAGER` matches neither
    branch — a principal calling this endpoint in real mode gets a hard
    403 `CLASS_FORBIDDEN`, not a degraded response. This was already
    ground-truthed once under US-E18.11 (see that row: "ground-truthed 403
    on `GET /classes` for non-ADMIN/non-TEACHER"), confirmed again here
    while resolving US-E13.8 (Principal Classes school-wide list). Since
    `admin`'s `IClassManagementRepository.listClasses()` is the only
    correct-data repository (real params/pagination/`enrich()`), US-E13.8
    forces principal's read of it to mock permanently (same
    force-mock-one-call-only pattern as `listTeachers` in
    `class-management.di.ts`) rather than letting principal share admin's
    real branch and 403 in production. Ask: extend `isAdmin`/the RBAC check
    in `list_classes.go` to also accept `MANAGER` (principal), matching the
    tenant-wide-oversight intent already granted to MANAGER on sibling
    `core` endpoints (grade entries, per-class reports, teaching plans —
    see the `MANAGER` grep hits already in `openapi.yaml` for those). See
    `US-E13.8-principal-classes/story.md`.

### Wave 4b — feed/moderation (audit 2026-07-26, resolves finding #36's "blocker" premise)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.20 | Feed + moderation BE wiring | rất cao | normal | Ground-truthed against `social`'s full `openapi.yaml`+`ERROR_CODES.md`+Go source (`pkg/kit/response/error.go` confirms `error.code` on the wire IS UPPER_SNAKE for `social`, same as `core`, via `codeFromKey=strings.ToUpper` — unlike IAM's raw-lowercase finding, US-E18.6). Both features join the epic's permanently-blocked-DI-factory class (after US-E18.8/9/14): feed's `Post`/`Comment` carry only `authorUserId` — zero display-name/role/avatar anywhere in `social`'s public API, and the one candidate resolver (`GET /social/members/{id}/profile`, US-127) is visibility-gated (shared room OR staff fact) so it 404s unpredictably for SCHOOL-scope posts read by non-staff — worse than every prior "raw-id fallback" gap in this epic since feed shows a DIFFERENT author on every row of a public wall, not one oversight field. Reaction taxonomy is a genuinely different domain model (real Facebook-style `like/love/haha/wow/sad/angry` single-count vs. web's celebratory `like/love/celebrate/clap` per-type) and attachments differ (single real multipart image vs. mock multi-placeholder) — neither reconcilable without a product/design decision. Moderation's `GET /reports` has no filter/stats/detail-GET at all, `targetType` excludes `comment`, and `moderation-audit` is ROOM-scoped (US-086 capability audit), a different concept than the feature's own dismiss/remove trail. `feed.di.ts`/`moderation.di.ts` force-mock regardless of `USE_MOCK`; the dead "real" classes are still corrected to the ground-truthed error taxonomy + 2 concretely-fixable endpoint facts (real pin `PUT`/`DELETE` exists per US-101; `moderate-delete` is bare `POST` no-body, not `DELETE`+body) — kept correct for the day the identity gap resolves, per this epic's own established practice. Zero UI/mock/domain change (mocks continue serving the shipped UX unchanged). See `US-E18.20-feed-moderation-wiring/story.md`. |

40. **(US-E18.20, 2026-07-26) [confirms #6/#7/#9/#13/#15/#18/#20/#21/#22/#23's
    premise an 11th time — AND the worst instance yet, since it blocks a
    PUBLIC feed, not one oversight field] + 2 net-new moderation gaps + 1
    BE-doc-drift flag** Ground-truthing `social`'s `Post`/`Comment` schemas
    found the recurring "no display-name join" gap again, but qualitatively
    worse: every post/comment in the feed (SCHOOL/CLASS/CLUB) shows a
    DIFFERENT author, so there is no single fallback field to raw-UUID (unlike
    a homeroom-teacher-name cell) — the entire feed screen has no reliable
    author identity source. The one candidate, `GET
    /api/v1/social/members/{targetUserId}/profile` (US-127), is
    visibility-gated (shared `RoomMember` row OR ADMIN/TEACHER staff fact) and
    would 404 unpredictably for SCHOOL-scope posts (author = tenant ADMIN) read
    by STUDENT/PARENT callers who share no room with that ADMIN. Ask: either
    (a) add `authorName`/`authorRole`/`avatarUrl` directly onto `Post`/`Comment`
    (denormalize at write time, same shape as every other ask in this class),
    or (b) relax the profile-visibility rule for feed-context reads
    specifically (any tenant member reading a SCHOOL/CLASS post they're
    already authorized to read should also see that post's author's basic
    profile, without a separate room-membership check).
    Separately, TWO independent, net-new moderation gaps (not covered by the
    asks above): (i) `GET /api/v1/reports` has no `status`/`contentType`/
    `search` filter and no stats rollup, and there is no `GET
    /api/v1/reports/{reportId}` detail endpoint at all — the web's queue
    screen (resolved/all tabs, content-type filter, search, stat row, detail
    sheet with duplicate-report list) has no real backing beyond the bare
    PENDING inbox list; and `SubmitReportRequest.targetType` excludes
    `COMMENT` (only `MESSAGE`/`POST`) — comment-target reports/removal have no
    real endpoint at all. Ask: add the missing filter params + a stats
    endpoint/field + a `GET .../reports/{id}` detail route + a `COMMENT`
    targetType (with its own moderate-delete route, mirroring the existing
    post/message ones), if the moderation queue's full feature set is a real
    product requirement. (iii) **BE-side doc-hygiene flag, not confirmed a web
    blocker**: `services/social/docs/openapi.yaml`'s
    `POST /reports/{reportId}/resolve` description states "MESSAGE targets
    (phase 3) and POST targets (phase 4) are both wired", but
    `ERROR_CODES.md`'s `REPORT_RESOLVE_DELETE_NOT_IMPLEMENTED` (501) row says
    the POST-target delete path "is a follow-up (phase 4)" — a direct
    contradiction this US did not have budget to resolve via Go source
    (mirrors finding #25's doc-vs-code drift class). Ask: reconcile, or
    confirm via `resolve_report` use-case source which statement is current.
    Given all of the above, `feed.di.ts`/`moderation.di.ts` force-mock
    regardless of `USE_MOCK` (see Wave 4b table row); `togglePin`/
    `removeContent(post)` have real, ground-truthed-correct HTTP surfaces
    (US-101 pin; direct moderate-delete) but are unreachable in practice since
    every `postId` a client could pass comes from the necessarily-mock feed
    read — same "isolated real endpoint, no reachable real id" shape as
    US-E18.9's dead `UpdateEntries()`. See
    `US-E18.20-feed-moderation-wiring/story.md`.

41. **(US-E18.23, 2026-08-01) [residual half of ask #13 — the FIRST ask in
    this class that is a missing *concept*, not a missing label]**
    `StaffLeaveRequestResponse` has no `department` and no `leaveType` field.
    With IAM US-144 (batch name lookup) and core US-149 (tenant-wide list) both
    landed, these two are the ONLY things still blocking the admin staff-leave
    screen from being wired real — every other blocker in ask #13 is closed.
    They are not substitutable: the web entity declares both required
    non-optional and the shipped card does an unguarded
    `LEAVE_TYPE_META[request.leaveType]` badge lookup plus a bare
    `{request.department}` interpolation, so a missing value is a crash or a
    blank, and unlike `memberName` there is no raw id that can honestly stand
    in for a leave *category*. `openapi.yaml`'s own note says `leaveType` is
    "intentionally NOT part of this response — a forward-looking product
    decision (OQ-149-01)", so this is as much a product question as a schema
    one. Ask: (a) resolve OQ-149-01 and, if leave categories are a real
    product concept, add `leaveType` to `SubmitStaffLeaveRequest` +
    `StaffLeaveRequestResponse` as an enum; (b) add `department` (or the
    `departmentId`/`departmentName` pair, denormalized at write time — core
    already owns the member↔department edge via `position-assignments`), OR
    confirm the department column should be dropped from the web screen.
    **Please state explicitly whether `leaveType` lands REQUIRED or
    optional/nullable** — that single answer decides whether the follow-up
    wiring US is a pure data-source swap (required → same shape as
    `class-management`, no design work) or needs `fe-component-architect` + a
    design-review pass for a placeholder/unknown-type state. Until then
    `staff-leave.di.ts` stays force-mock (rationale corrected in-code under
    US-E18.23; the old "no tenant-wide list exists" text was stale).
42. **(US-E18.25, 2026-08-01) [cheap potential BE addition, not a blocker]**
    `GET /notifications` (BE US-146) accepts only `type`/`cursor`/`limit` —
    there is no `?read=false`/`?unread=true` server-side filter, even though
    the same feature's `GET /notifications/unread-count` already backs an
    EXACT `COUNT(*)` over a per-status materialized view (so the data model
    clearly supports status-scoped queries, just not exposed on the list
    endpoint). The web's existing "Unread" filter tab (shipped, US-E10.2) has
    no direct real-mode equivalent as a result — it now does a bounded
    client-side drain (page at 100, filter `read===false` client-side,
    `MAX_PAGES=20` cap) instead, which is correct but strictly less
    efficient than a server-side filter would be (worst case: many
    mostly-read pages fetched to find a few unread rows). Ask: add
    `?read=false` (or `?unread=true`) to `GET /notifications`, reusing the
    existing per-status materialized view `unread-count` already reads from.
    See `US-E18.25-notification-center-wiring/story.md` + ADR `0066`.
43. **(US-E18.26, 2026-08-01) [drift risk, not a BE gap — flagged for a future
    web-only cleanup US]** `src/features/parent-links/infrastructure/
    repositories/parent-consent.repository.ts` (US-E20.2, a separate,
    un-ground-truthed feature) calls the SAME `GET /members/{id}/
    linked-students` URL this US (`timetable`) just ground-truthed, but casts
    the response to its own speculative `LinkedStudentResponseDto[]`
    (`{studentId, fullName, avatarUrl}`) — a shape the real BE has never
    returned (the real `LinkedStudentItemResponse` is `{linkId,
    parentMemberId, studentMemberId, createdAt, classId?, className?}`, per
    US-148, ground-truthed by both `US-E18.26`'s `fe-planner` and
    `fe-tech-lead-reviewer` independently). That feature's own doc comments
    still claim flipping `USE_MOCK=false` needs no rework — untrue given the
    actual wire shape. Not touched by US-E18.26 (out of scope, different
    feature module per decision `0017`'s feature isolation). Ask (web-side,
    not BE): a follow-up US should re-ground-truth `parent-links` against
    the real `LinkedStudentItemResponse` shape and fix the drifted DTO/cast
    before that feature is ever flipped to real mode.

### Wave 4c — Kong routing live-verify + SSE proxy re-architecture (closes asks #1/#33/#36); member-directory wiring (closes asks #6/#7)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.22 | Kong 5-service routing live-verify + SSE proxy re-architecture | — | high-risk | **Done** — ground-truthed `../edu-api/gateway/kong/kong.yml` + `docker-compose.yml` on `origin/main`: ask #1/#36 (Kong routes `social`/`notification`/`lms`, compose adds `social`+`lms`) is RESOLVED. Ran a real `make stack-up` (all 11 containers, incl. `edu-kong`/`edu-lms`/`edu-social`, healthy) and live-verified through Kong (`:8000`): register→signin (`clientId: "edu-web"`, IAM's seeded OAuth client) → `GET /noti/api/v1/stream` with Bearer token → `edu-notification`'s own access log shows `200`; same call with no `Authorization` header → Kong-level `401`. Separately confirmed `notification` has NO published host port under the network-segmentation topology — the OLD direct-bypass `NOTI_SERVICE_URL` design has no valid value to point at anymore, not just an auth mismatch. Re-architected `app/[locale]/api/stream/route.ts`'s real branch to route through Kong (`NEXT_PUBLIC_API_URL`, same convention as every other repository call) instead of direct-bypass; `NOTI_EP.stream` changed to the Kong-prefixed `/noti/api/v1/stream`; `NOTI_SERVICE_URL` env var retired (`.env.example` updated). Closes ask #33/#36 (this row) — see ADR `0065`. Explicitly OUT of scope: an epic-wide live-gateway regression re-run of every Wave 1-4b US (that is its own cross-cutting pass, not this US's remit); flipping any individual developer's `NEXT_PUBLIC_USE_MOCK` default in `.env.example`/`.env.local` (unchanged — each US's DI factory already switches on it, this US only removed the transport-layer blocker). Cross-repo observation (not a blocker): `notification`'s SSE response did not flush bytes to the client within several seconds of idle silence even after the `200` was logged server-side — likely Fiber-level buffering on the BE side, flagged for `edu-api` if tighter reconnect timing ever becomes a requirement. See `US-E18.22-use-mock-flip-sse-kong/story.md` + ADR `0065`. |
| US-E18.23 | Member-directory wiring (IAM US-144 + core US-149) | trung bình | normal | **Done** — ground-truthed `../edu-api/services/iam/docs/openapi.yaml` (`MemberListItem`/`MemberBatchItem`, tag `Members`) + `ERROR_CODES.md` + `services/core/docs/openapi.yaml` (`StaffLeaveRequestResponse`) on `origin/main`. Mints the epic's first brand-new SHARED feature module, `src/features/iam-directory/` (domain + infrastructure, no `presentation` — it owns no screen): `SearchMembersUseCase` (follows `nextCursor` until `hasMore` is false — BE applies `role`/`search` AFTER a keyset read, so a short or even ZERO-length page is NOT the end, the headline correctness trap of this contract) and `BatchResolveMembersUseCase` (owns the 50-id chunking so no caller ever sees `too_many_member_ids`; unresolvable ids are silently omitted, per BE's explicit not-an-existence-oracle contract). IAM's wire `error.code` is RAW LOWERCASE (`member_list_forbidden`, `too_many_member_ids`) — the US-E18.6 caveat holds, unlike `core`/`social`'s UPPER_SNAKE. Consumers COMPOSE the two use-cases from their own DI (`bootstrap/di` is where cross-feature composition belongs, decision `0017`, same precedent as `bootstrap/lib/resolve-current-term.ts`) and translate `IamDirectoryFailure` into their own union at that boundary. Result: (1) **`class-management.listTeachers` is REAL** (`role=TEACHER`, UPPERCASE per `MemberListItem.roles`) and the permanent mock-delegation wrapper in `class-management.di.ts` is DELETED — every method now follows the plain `USE_MOCK ? Mock : Real` gate (decision `0014`); (2) **`staffing` assignment `memberName` resolves via ONE batch call per `listAssignments` page** (not N), raw-`memberId` fallback demoted to the unresolvable subset, a failed lookup degrading to the fallback rather than failing the list; (3) **`staff-leave` deliberately STAYS force-mock** — US-149 + US-144 closed 2 of its 3 blockers, but `department`/`leaveType` have zero wire source and are required non-optional on the entity + read unguarded by the shipped card, so wiring would mean inventing data (forbidden by the AC) or a component/design change disproportionate to a wiring US; doc-comment-only correction there plus new ask **#41**. Asks #6/#7 RESOLVED, #13 PARTIALLY resolved (#41 carries the remainder), **#9 stays OPEN** — only its member-listing half is addressed; `EnrollmentResponse` still has no student display fields and `MemberListItem`/`MemberBatchItem` carry no `dob`/`gender`, so `getClassRoster`/`getSearchPool` were deliberately untouched. Zero UI/ViewModel/i18n change (pure data-source swap on both wired consumers) → no design-review gate. See `US-E18.23-member-directory-wiring/story.md`. |
| US-E18.24 | Unseal-workflow + seal-status wiring (core US-150) | cao | high-risk | **Done** — ground-truthed `core`'s US-150 additions on `origin/main` 2026-08-01: `GET .../unseal-requests?status=&cursor=&limit=` (cursor-paginated discovery for the two-ADMIN gate, resolves cross-repo ask #21) and `GET .../seal-status` (class-term rollup, distinct enum from the per-record status). Un-mocks `getPendingUnsealRequests`/`initiateUnseal`/`confirmUnseal`/`getSealStatus` in the existing `HybridAcademicRecordsSealRepository` (US-E18.13); display names for `studentMemberId`/`requestedBy` resolved via `BatchResolveMembersUseCase` (`iam-directory`, US-E18.23) composed from `bootstrap/di` (decision `0017`). `listTenantAdmins` stays force-mocked — investigated and does NOT fit: IAM's `MemberListItem.roles` enum has no `SUPER_ADMIN` (a platform role, not a tenant-membership row), so the directory can't back an accurate two-admin self-approve-fallback count (ADR 0037); not a missing-endpoint gap, no new cross-repo ask. UI: unseal tab moves to paginated fetch; seal-status display redesigned around the real coarser rollup shape (no per-subject detail on the wire) — design-review + a11y gate required. All gates green (tech-lead Approved, a11y PASS, design-review PASS, QA Go); 437 files/3026 tests, zero regression. ADR 0055 amended (partial supersession). Cross-repo ask #21 RESOLVED. See `US-E18.24-unseal-workflow-wiring/story.md`. |
| US-E18.28 | Exam-bank edit/delete + MCQ options wiring (core US-152) | cao | normal | **Done** — ground-truthed `core`'s US-152 additions on `origin/main` 2026-08-01: `PATCH`/`DELETE /exam-papers/:id` (author-only, DRAFT-only) + `PUT`/`DELETE /exam-papers/:id/questions/:questionId` + `options`/`correctOptionId`/`difficulty` on `AddQuestionRequest`/new `UpdateExamQuestionRequest`/`ExamQuestionResponse`. Un-mocks `updateExam` (metadata PATCH, skipped when unchanged, + question-level diff-sync: GET current → delete removed → PUT existing → POST new → final GET, non-atomic by design) and `deleteExam` (real DELETE) in the existing hybrid `ExamBankRepository`; `createExam` stays permanently blocked (no bulk-create endpoint shipped). Mapper reshaped lossless (`questionId` as entity id, faithful `options`/`correctOptionId`/`difficulty`); entity gained round-trip-only `questionType?`/`marks?` (no new UI field — needed so an unconditional PUT can't rewrite an ESSAY as MCQ or reset `totalMarks`). Builder route (`/teacher/exam-bank/[id]/edit`) now renders the real builder for an owned DRAFT in real mode via a new pure policy (`resolve-builder-access.ts`) — the security boundary stays `core`'s `loadOwnedDraftPaper`+`requireDraft()`. Two tech-lead review rounds: MUST FIX closed the Subject/Max-attempts fields silently discarding edits behind a false success toast (new `metaEditable` prop disables them in real mode with an explainer); SHOULD FIX added a pre-save completeness gate to avoid a generic error after a partial non-atomic write — `fe-lead` caught this was over-applied to mock mode (breaking the standard "drafts can be incomplete, only publish validates" pattern) and required scoping it to real mode only (`requireCompleteQuestions`, default `false`). Reorder controls (no wire equivalent) genuinely removed in real mode with a `role="note"` explainer, not merely disabled. `fe-accessibility-auditor` **PASS** (1 Major — imprecise `role="status"` on static copy — fixed pre-merge by `fe-lead`; 1 Minor deferred). Design-review gate **PASS** (tokens-only, no new component fork, states covered). `fe-qa-playwright` **GO** (0 defects; closed 4 test-coverage gaps — route-level `USE_MOCK`/JWT-`sub` gating had zero tests, real-mode delete-confirm flow was never driven to completion, the reviewer's own CONSIDER, one PATCH-skip asymmetry). 440 files/3129 tests (baseline 437/3081, zero regression); Storybook 151/1110. Closes cross-repo asks **#24**/**#25**/**#26** (RESOLVED, `createExam`'s bulk-create half of #26 stays open — no wire equivalent, unchanged; `/lms/class-exams*` product/design gap also untouched). See `US-E18.28-exam-bank-edit-delete-wiring/story.md` + ADR `0056` Amendment 2. |
| US-E18.26 | Timetable by-member views + slot `room` field wiring (core US-153 + US-148) | cao | normal | **Done** — ground-truthed `core`'s US-153 (`GET /members/{memberId}/timetable?termId=`, `room` on `SlotRequest`/`SlotResponse`) + US-148 (`GET /members/{memberId}/enrollment`, enriched `linked-students`) on `origin/main` 2026-08-01. Closes asks **#15** and **#17** (RESOLVED); partially closes **#20** (classId/className yes, student display name still open) and **#22** (classId-discovery half resolved for timetable, conduct self-view UI itself still unbuilt — separate product gap). Un-mocks US-E18.11's 3 permanently-mock operations: student self-view (`getMyTimetable` composes the by-member call with a degrade-not-fail enrollment call for `className`), teacher personal schedule (`getByTeacher` SIMPLIFIED from the old N+1 `GET /classes` fan-out to a 2-call composition — 1 by-member GET + 1 classes-list GET repurposed as a `classId→className` lookup, call-count-asserted), parent child-view (`getChildren` via enriched `linked-students`, per-child fetch via a NEW `getByMember(memberId)` primitive since the endpoint is memberId- not classId-keyed). `room` threaded through the admin builder's existing real write path both directions, catching an RMW bug the plan didn't anticipate (untouched sibling slots' `room` must also survive a single-cell edit). `TimetableChild.name`/`classId`/`className` now optional (ask #20's residual gap) with a stable-`ordinal`-derived degraded-identity fallback in the child-picker — the one user-visible diff, routed through `fe-component-architect` + design-review gate (PASS). `fe-tech-lead-reviewer` Approved (1 correction to the packet's own error-code assumption, 1 genuine defect found+fixed in-review — parent child-view wasn't composing its already-fetched `className` back onto the returned week). `fe-accessibility-auditor` PASS post-fix (1 Blocking avatar-contrast finding, reachable once real mode exposes 3+ children — fixed same-session). `fe-qa-playwright` Go post-gap-closure (found+closed 1 MAJOR proof gap — the room field had repository-level round-trip proof but no UI-level save-interaction test). 437 files/3081 tests (baseline 436/3041, zero regression); Storybook 151/1096. New follow-up ask **#43** (unrelated `parent-links` feature has a speculative DTO for the same URL that doesn't match the real BE — flagged, not fixed here). See `US-E18.26-timetable-by-member-room-wiring/story.md`. |
| US-E18.29 | Tenant-invitations wiring (IAM US-147) | cao | normal | **Done** — ground-truthed IAM's US-147 additions directly against `../edu-api/services/iam/internal/membership/adapter/http/{invitation_handler.go,dto/invitation_dto.go}` + `docs/openapi.yaml`/`INTEGRATION.md`/`ERROR_CODES.md` on `origin/main` 2026-08-01. Closes asks **#29**/**#30** (RESOLVED — resend half of #30 only, the `expiryDays`/TTL residual stays open). Un-mocks US-E21.1's list+resend (the epic's 5th fully-blocked operation set, after US-E18.8/9/13/14): `GET /tenants/{id}/invitations?status=&cursor=&limit=` (tenant ADMIN/SUPER_ADMIN only — stricter than the member directory, PII-gated) wired via `iam-directory`'s `{raw:true}`+`parseEnvelope` cursor pattern; `POST .../invitations/{id}/resend` wired, same-row token rotation confirmed. `invitedBy` (raw userId on the wire) resolved to a display name via `iam-directory`'s `BatchResolveMembersUseCase` (function-collaborator composition, never fails the list on a resolver error). `admin-invitations.di.ts` collapsed from hybrid force-mock to a plain `USE_MOCK` gate (US-E18.23/25 precedent). Presentation: one `useInfiniteQuery` per status tab (`status` now a real server param, moved INTO the query key), canonical `LoadMoreButton` reused, tab-count badges REMOVED (real pagination makes an accurate cross-tab count structurally impossible without eager-prefetching every tab — documented decision), search-while-paginated gets an explicit hint. Resend gains 409/429 (w/ `Retry-After`, first header-consumer in this repo, no lockout built) branches; broad `lists(tenantId)` invalidation on success/409 (a surgical per-row patch was explicitly rejected — resend moves a row ACROSS status partitions). `fe-tech-lead-reviewer` initial **Revision Required** (1 must-fix — AC-8's 403 `forbidden_action` had no failure-union home, fell to `unknown` with an unfixable retry button; 2 should-fix — list-query retry not gated on `retryable`, all 4 Server Actions missing `requireRole("admin")` defense-in-depth) → all fixed same-branch. `fe-accessibility-auditor` 2 findings (A11Y-001 blocking WCAG 4.1.3 — search hint needed `role="status"`+`aria-live`; A11Y-002 major — load-more-next-to-empty-state needed an sr-only linking hint) → both fixed same-branch, additive props on canonical shared components. Design-review gate: `/impeccable audit` 0 findings on production code. `fe-qa-playwright` **PASS/Go** — independently re-derived 8/8 AC, re-verified every fix at the assertion level, zero new gaps. 443 files/3191 tests (baseline 440/3166 pre-fix-pass, zero regression); Storybook 151/1132. No ADR. See `US-E18.29-invitations-wiring/story.md` + `plan.md` + `state-architecture.md`. |

### Wave 5 — batch 2 tiêu thụ BE US-164..173 (closes asks #8/#39/#40a/#40b-partial/#20-residual/#45/#9/#41/#42)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.30 | Principal Classes real (core US-164 MANAGER grant + US-173 studentCount/homeroom enrichment) | trung bình | normal | **Done** 2026-08-03 — gỡ force-mock màn Principal Classes (US-E13.8) sau khi `list_classes.go` cho MANAGER `ListByYear`; tiêu thụ `studentCount`/`homeroomTeacherId`/`homeroomTeacherName` trên ClassResponse ở mọi consumer danh sách lớp — bỏ 5 chỗ fan-out 2×N client-side; bonus-fix bug hiển thị raw UUID thay tên GV chủ nhiệm. Closes asks **#39**, **#8**. See `US-E18.30-principal-classes-real/story.md`. |
| US-E18.31 | Feed wiring — author identity (social US-165) | cao | normal | **Done** 2026-08-03 — intake premise "full un-mock" SAI: US-165 chỉ đóng 1/3 gap của feed. Ship **hybrid**: reads real (`authorName`/`authorRole` denormalized, `avatarUrl` reserved luôn null), writes honest-degrade trong real mode; canonical role map ở `features/feed/domain/policies/feed-role.ts`, repo `hybrid-feed.repository.ts`. Closes ask **#40(a)** (phần read). ADR `0067`. See `US-E18.31-feed-wiring/story.md`. |
| US-E18.32 | Moderation queue wiring (social US-172) | cao | normal | **Done** 2026-08-03 — 4/5 gap đóng: `GET /reports` filter `status`/`contentType`/`search`, `GET /reports/stats`, `GET /reports/{id}` detail, targetType +`COMMENT`; phần còn thiếu giữ mock có chủ đích (honest degrade khi stats read fail). Fix 2 bug shared primitive lộ ra khi wire: Sheet focus-restore (A11Y-001, `useAutoFocusReturn`/`use-dialog-return-focus.ts`) + StatCard icon contrast WCAG 1.4.11 (A11Y-002). Closes ask **#40(b)** (partial). ADR `0068`. See `US-E18.32-moderation-queue-wiring/story.md`. |
| US-E18.33 | Parent child-switcher real names (IAM US-167 tiered batch lookup) | trung bình | normal | **Done** 2026-08-03 — PARENT/STUDENT giờ gọi được `GET /members?ids=` (tier: chỉ `memberId`+`displayName`, field ABSENT = tier signal); tái dùng `BatchResolveMembersUseCase` (`iam-directory`, US-E18.23) cho tên con thật ở parent grades/timetable/children-overview; sửa 2 premise sai trong intake + stale raw-id-fallback comments ở `grades`. Closes residual của ask **#20**. See `US-E18.33-parent-child-names-wiring/story.md`. |
| US-E18.34 | Parent attendance real (`GET /members/{id}/attendance`) | trung bình | normal | **Done** 2026-08-03 — ask #45 hóa ra là **doc drift**: code `get_student_attendance.go` đã authorize PARENT-linked-child từ core US-047 (openapi summary stale). Un-mock US-E20.5: real `child-attendance.repository.ts`, retire `UnavailableChildAttendanceRepository`; phát hiện DTO status-casing sai mà mock che (`UPPER_SNAKE` wire → domain casing, giờ dùng chung `mapStatusFromWire` của `features/attendance`); DI-level client-validation-first test với real repo. Closes ask **#45** (reclassified doc-drift). See `US-E18.34-parent-attendance-real/story.md`. |
| US-E18.35 | Admin roster real (IAM US-169 dob/gender staff tier) | cao | normal | **Done** 2026-08-03 — scope lớn hơn intake (không chỉ 2 field): batch lookup staff tier giờ trả `dob`/`gender` (optional per-user, PII ADR-0122 phía BE) → US-E18.5 hết mock vĩnh viễn. Review round bắt 3 vấn đề thật: gap MANAGER-403 mới (filed ask **#46** — `ListStudentsInClassUseCase` thiếu MANAGER), false-empty regression, component-org duplicate → promote `components/shared/absent-value/` (thay `missing-value`/`unavailable-value`). Closes ask **#9** (phần dob/gender qua batch; denormalize lên `EnrollmentResponse` vẫn open). ADR `0069`. See `US-E18.35-admin-roster-real/story.md`. |
| US-E18.36 | Staff-leave full un-mock (core US-170 department + leaveType) | cao | normal | **Done** 2026-08-03 — `StaffLeaveRequestResponse` có `department`+`leaveType` (nullable per-user, migration 046) → mảnh cuối của màn admin staff-leave, gỡ force-mock từ US-E18.23. Un-mock lộ **security gap thật**: 2 Server Actions ở `admin/staff-leave/actions.ts` thiếu `requireRole` guard — đã vá cùng branch. Closes ask **#41**, phần còn lại của **#13**. See `US-E18.36-staff-leave-fields/story.md`. |
| US-E18.37 | Notification unread filter (notification US-171 `?read=false`) | thấp | tiny | **Done** 2026-08-03 — pure infra swap: inbox list nhận `?read=false` server-side → retire cơ chế bounded client-side drain của US-E18.25 (`notification.repository.ts`); regression-lock test giữ hành vi tab "Chưa đọc". Closes ask **#42**. ADR `0066` amended in-place. See `US-E18.37-notification-unread-filter/story.md`. |

### Wave 6 — batch 3 tiêu thụ BE US-174..184 (closes asks #43/#46/#44/#9-full/#12/#21-listing/#19)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.38 | Principal schedule real (core US-175 `roleManager` on `get_member_timetable.go`) | thấp | normal | **Done** 2026-08-06 — gỡ force-mock `makeGetMemberTimetableForPrincipalUseCase`, về plain `USE_MOCK ? Mock : Real` như mọi sibling factory trong `timetable-view.di.ts`. Ground-truthed: `roleManager` được cấp TRƯỚC guard `ActorMemberID == ""` nên không cần claim `memberId` (độc lập với fix US-174). Zero UI change. Closes ask **#43**. See `US-E18.38-principal-schedule-real/US-E18.38-principal-schedule-real.md`. |
| US-E18.39 | Principal students MANAGER read confirmed real (core US-175 `list_students_in_class.go`) | thấp | normal | **Done** 2026-08-06 — hầu như thuần doc/test fix: `makeRosterRepository()` đã là plain gate từ trước (không có honest-degrade riêng cho MANAGER), 403 cũ chỉ là lỗi real tự nhiên qua `toRosterFailure()`. Sửa doc-comment + test đã stale khẳng định 403 MANAGER là hành vi đúng vĩnh viễn. Closes ask **#46** — instance thứ 3 và cuối của pattern "MANAGER thiếu trong 1 use-case cụ thể". See `US-E18.39-principal-students-real/US-E18.39-principal-students-real.md`. |
| US-E18.40 | Teachers screen repoint (core US-181 subject-assignments, #44 = option b) | cao | normal | **Done** 2026-08-06 — `GET /core/api/v1/teachers` xác nhận KHÔNG BAO GIỜ tồn tại; `listTeachers()` repoint sang IAM directory (`role=TEACHER`, tái dùng `SearchMembersUseCase` — pattern giống hệt `class-management.di.ts`). "Môn dạy/số lớp phụ trách" compose per-class qua `GET /classes/{id}/subject-assignments` (route MỚI, khác `classSubjects` — đó là curriculum ClassSubject US-057), group theo `teacherMemberId`, bound tại 40 lớp (2× page-size mặc định của `GET /classes`), quá bound degrade về homeroom-only. Fields không có wire source bị XÓA (không fake): `hasConflict`, `classSubjectId`; `TeacherStatus.ON_LEAVE` → real `ACTIVE|INACTIVE|SUSPENDED`. Tìm + fix 2 bug thật khi ground-truth mutation: `assignHomeroomTeacher`/`assignSubjectTeacher` gửi sai field name (`teacherId` thay vì `teacherMemberId`) — mọi write real-mode trước đây sẽ 422. Closes ask **#44**. See `US-E18.40-teachers-screen-repoint/US-E18.40-teachers-screen-repoint.md`. |
| US-E18.41 | Admin roster search-pool real (core US-182, ADR 0125 FE-compose) | trung bình | normal | **Done** 2026-08-06 — `getSearchPool` (permanent stub từ US-E18.5) giờ = IAM STUDENT directory (drain toàn bộ qua `SearchMembersUseCase`) MINUS `GET /core/api/v1/enrollments/student-ids?academicYear=` (ids-only, mới). Tái dùng `resolveCurrentAcademicYear()` (US-E18.12) làm collaborator lazy; `currentClassId/Name` luôn `null` cho pool member (đúng theo định nghĩa unassigned, không cần lookup thứ 2). Thêm `poolError` VM key riêng (không gộp `fetchError`) để tránh false-empty khi fetch fail. Không còn force-mock nào sót trên `makeRosterRepository()`. Closes ask **#9 ĐẦY ĐỦ** (cả nửa dob/gender từ US-E18.35 lẫn nửa listing này). See `US-E18.41-admin-roster-search-pool-real/US-E18.41-admin-roster-search-pool-real.md`. |
| US-E18.42 | Assessment-scheme subject picker real (core US-177 `gradeLevel` filter) | thấp | normal | **Done** 2026-08-06 — DI factory ĐÃ là plain gate từ trước (real mode đã gọi endpoint thật), nhưng phát hiện bug thật: `SubjectForGradeDto` là fiction thời mock-era (`id`/`requiredAssessmentCount` luôn `undefined` ở real mode vì real schema dùng `subjectId`/`master.requiredExamCount`) — thay bằng DTO thật + full cursor-drain (BE's "filter trước pagination" chỉ đảm bảo mỗi TRANG đúng, không đảm bảo chỉ có 1 trang) + map 422 `gradeLevel` cụ thể (không match nhầm field khác cùng code). Closes ask **#12**. See `US-E18.42-subjects-by-grade-real/US-E18.42-subjects-by-grade-real.md`. |
| US-E18.43 | Sealed-students listing real (core US-183) | thấp | normal | **Done** 2026-08-06 — `listSealedStudents` (1 trong 4 method mock-delegated của `HybridAcademicRecordsSealRepository`) giờ real qua `GET /classes/{classId}/terms/{termId}/academic-records/sealed-students`; tên học sinh resolve qua `BatchResolveMembersUseCase` đã composed sẵn trong factory (không cần batch-lookup thứ 2). Reachability caveat kế thừa từ US-E18.13: `listAvailableClasses` (class/term selector) vẫn mock-first nên chuỗi 6 method thật (kể cả method mới này) chưa "meaningfully reachable end-to-end". Closes **nửa listing** của ask **#21**; nửa audit-trail vẫn treo (BE xác nhận model chỉ giữ cycle mới nhất, không có event-log đa cycle). See `US-E18.43-sealed-students-real/US-E18.43-sealed-students-real.md`. |
| US-E18.44 | Grade reject/request-revision flow (core US-184) | rất cao | high-risk | **Done** 2026-08-06 — capability MỚI hoàn toàn (không phải data-source swap): `POST .../grades/{studentId}/columns/{columnId}/reject` (ADMIN/MANAGER, `PENDING_APPROVAL→DRAFT`, KHÔNG có state `REJECTED` mới) trên `IGradeRejectionRepository` mới, tách biệt khỏi `IGradeApprovalRepository` (batch dashboard của ask #18, KHÔNG đụng, vẫn force-mock 100%). Privacy boundary structural: 3 field `rejectionReason`/`rejectedBy`/`rejectedAt` STAFF-ONLY, enforced bằng `@ts-expect-error` compile-time guard (widen `GradeCell`/`GradeBookRow` sẽ fail `tsc`) + 2 mapper riêng không bao giờ spread field này lên student/parent path. Role-discriminated VM (`TeacherGradeEntryVM`/`ApproverGradeEntryVM`, không thể edit-score với vai approver hay reject với vai teacher — compile error, không phải convention). 2 review round: round 1 phát hiện affordance mount sai route (`teacher/grades` — ADMIN/MANAGER-mapped principal/admin session bị namespace guard chặn không bao giờ tới được) → fix bằng cách repurpose 2 route ĐÃ TỒN TẠI (`principal/grade-book`, `admin/grade-book`, đổi từ đọc-only `GradeBookRow` sang entry-side `GradeSheet`/`StaffGradeCell`) thay vì tạo route mới; round 2 phát hiện thêm 1 bug bảo mật thật (`lockTermAction` thiếu `requireRole`, dormant khi mock — vá cùng round) + 1 bug runtime 500 pre-existing (RSC truyền closure literal làm Server Action prop ở `teacher/grades` default-load — `tsc`/`build`/Storybook đều không bắt được, chỉ bắt bằng unit test invoke trực tiếp prop) + thiếu nav entry cho 2 route approver (orphan route trước đó). Closes ask **#19**. See `US-E18.44-grade-reject-flow/US-E18.44-grade-reject-flow.md`. |
| US-E18.45 | Hygiene pass: memberId claim re-verify, 422 field casing, #40iii doc sync | — | tiny | **Done** 2026-08-06 — TRUE NO-OP, zero `src/` change. (a) grep xác nhận không còn comment nào đổ lỗi memberId-claim (US-174) cho các force-mock còn lại — tất cả vì lý do khác (không có endpoint/model); (b) grep xác nhận không có code nào từng match tên field PascalCase cũ của notification 422 (US-180) — không có gì để fix; (c) xác nhận `ERROR_CODES.md` phía BE đã tự sửa #40(iii) từ US-166. See `US-E18.45-hygiene-pass-batch3/US-E18.45-hygiene-pass-batch3.md`. |

### Wave 7 — batch 4 tiêu thụ BE US-186..189 (closes asks #18/#28/#16/#10/#11)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.46 | Grade-approval pending rollup + approve action (core US-186) | cao | normal | **Done** 2026-08-07 — hai wiring: (1) discovery read MỚI, tenant-wide `GET /api/v1/grade-entries/pending-approval?cursor=&limit=` (gate `isAdminOrManager`, oldest-first, cursor-paginated) — approver không cần biết trước classId+subjectId+termId; response KHÔNG có per-entry id/`batchId` (batch identity CHÍNH LÀ tuple `(classId,subjectId,termId)`) — xác nhận `IGradeApprovalRepository`/`admin/grades/approval` (batch dashboard cũ) VẪN force-mock, KHÔNG đụng. (2) Wire `GRADES_EP.approveEntry` — endpoint thật đã tồn tại từ US-E18.44 nhưng dormant (không có UI caller) — vì rollup chỉ có giá trị khi approver hành động được trên cái nó phát hiện ra. `IGradeRejectionRepository` RENAME → `IGradeDecisionRepository` + thêm `approveEntry` (chung actor/gate/addressing/lifecycle với reject); rollup có port riêng `IPendingApprovalRepository` (tenant-wide, read, không cần context per-key). UI mount trên 2 route ĐÃ reachable từ US-E18.44 (không route/nav mới). 2 review round: round 1 tìm bug thật — rollup stale sau approve/reject (`useState(seed)` không sync lại) + `hasMore` với cursor null silently REPLACE list; A11y tìm 2 vấn đề — accessible name thiếu thời gian chờ, load-more thiếu live-region — cả 4 vá cùng round. `formatRelativeTime` PROMOTE (move, không copy) từ `features/feed` sang `src/shared/relative-time.ts` (decision 0026, lần dùng thứ 2). Closes **#18**. See `US-E18.46-grade-approval-pending-rollup/US-E18.46-grade-approval-pending-rollup.md`. |
| US-E18.47 | Class attendance range real (core US-187) | thấp | normal | **Done** 2026-08-07 — thay fan-out ≤31 call/ngày (`Promise.allSettled` per-day) bằng 1 call range trên CHÍNH route cũ (`GET .../attendance`, `date` optional, XOR `startDate+endDate`, cap 366 ngày phía BE). `aggregateDaySummaries` (per-day fan-out) → `aggregateRangeDaySummaries` (từ `records[]` phẳng), cùng contract `AttendanceDaySummary[]`, ZERO UI diff (xác nhận: 0 file `.tsx` trong diff). Proof trọng tâm là call-COUNT (1 thay vì N), không chỉ result-shape. `MAX_HISTORY_DAYS=31` giữ nguyên có chủ đích — lý do cũ (ADR 0058 §5, chi phí fan-out) không còn đúng nhưng nâng lên là quyết định product/UX, không tự ý đổi. Reviewer xác nhận behaviour cũ vốn không phân biệt "ngày chưa ghi nhận" vs "ngày ghi nhận rỗng" (cả 2 đều ra summary 0-count) — hành vi mới giữ y hệt, còn cải thiện thêm: lỗi non-404 giờ throw thay vì bị nuốt im lặng thành "cả range 0-count". Closes **#28**. See `US-E18.47-class-attendance-range-real/US-E18.47-class-attendance-range-real.md`. |
| US-E18.48 | Timetable whole-school conflicts scan real + admin UI (core US-188, ADR 0128) | cao | normal | **Done** 2026-08-07 — `getConflicts` từ permanent `[]` stub (ask #16) thành real `GET /core/api/v1/timetable/conflicts?termId=`. **Signature sai từ đầu, không chỉ implementation**: endpoint là whole-TENANT (path phẳng, KHÔNG nested dưới `/classes/{id}`), tenant lấy từ token claim → `getConflicts(classId, yearId)` → `getConflicts()` không tham số, `termId` resolve trong repo qua `resolveCurrentTermId()` đã có (US-E18.11). `ConflictInfo` mở rộng thành **discriminated union** 2 loại (`teacher-double-booked` / `room-double-booked`, key ổn định — enum wire `TEACHER_DOUBLE_BOOKED`/`ROOM_DOUBLE_BOOKED` không bao giờ thoát khỏi mapper, decision 0008) + `classes[{classId, subjectId}]`; entity mới `TimetableConflictScan{termId, conflicts, truncated}`. **XOÁ `TimetableData.conflicts`** — field này luôn `[]` ở real mode (fiction field), giờ nguồn xung đột duy nhất là scan → per-cell highlight lần đầu tiên hoạt động thật ở real mode. **UI mới** (`ConflictScanPanel`, feature-local theo 0026) THAY THẾ `ConflictSummary` mock-only cũ (không đặt cạnh — một surface, một nguồn), render 2 loại phân biệt bằng tone (teacher = `error` vì write path chặn thật; room = `warning` + câu "cần xử lý thủ công" vì **ADR 0128: room chỉ phát hiện khi đọc, write path KHÔNG chặn**), `truncated` hiện thành hint (không phải lỗi), scan fail degrade trong panel bằng `ListError` (grid vẫn dùng được, không bao giờ hiện "không có xung đột"). Route `(app)/admin/timetable` ADMIN-only qua `evaluateAdminAccess` (strict equality) — MANAGER map sang appRole `principal` nên bị chặn, đúng với BE (MANAGER không được whole-school scan). Review phát hiện thêm 1 platform-wide finding (KHÔNG chặn US này): `ROLE_ENUM_TO_APP` không có entry nào map sang appRole `admin` — cả BE `ADMIN` lẫn `MANAGER` đều vào `principal`, nên `/admin/*` hiện chỉ reachable qua mock-mode; cần một ADR riêng, không gộp vào story này. Page chuyển sang `Suspense` + `Promise.all` (scan là read tenant-wide nặng, không được cộng dồn latency). Mock seed thêm 3 room-clash + cap 5 để demo `truncated`. Closes ask **#16**. See `US-E18.48-timetable-conflicts-scan-real/US-E18.48-timetable-conflicts-scan-real.md`. |
| US-E18.49 | Grade-scale `bands` + column `requiredCount` real (core US-189) | trung bình | normal | **Done** 2026-08-07 — đảo ngược giả định của US-E18.7/ADR 0053 ("client-only, không bao giờ gửi lại"): cả hai field giờ BE lưu thật. `mapGradeScale()` đọc `dto.bands` cho `SCALE_10`/`SCALE_4` (`minThreshold` là chuỗi decimal như `minValue`/`maxValue`), sort highest-first, tự suy lại `id`/`colorToken` (không có trên wire); preset CHỈ còn là fallback khi tenant chưa tuỳ biến (absent / `null` do Go nil-slice / mảng rỗng) hoặc payload không parse được. `toSetGradeScaleRequestDto()` nay GỬI bands cho scale số — trước đó không gửi gì và mọi tuỳ biến của admin bị nuốt im lặng — và vẫn KHÔNG BAO GIỜ gửi cho `LETTER_ABCD` (BE 422 tổ hợp đó). `count: 1` hardcode trong `mapAssessmentScheme()` bị xoá: `requiredCount` bị OMIT khỏi response khi chưa đặt ⇒ map thành `null`, entity mở rộng `count: number | null`, write dùng conditional-spread nên key VẮNG MẶT (không phải `null`). ⚠️ `requiredCount` là DISPLAY METADATA — BE không enforce theo điểm đã nhập — nên copy mới là "Dự kiến số bài … hệ thống không bắt buộc nhập đủ" và cột mới khởi tạo ở trạng thái CHƯA ĐẶT thay vì 1. Thêm failure `invalid-bands` cho 422 `GRADE_SCALE_INVALID_BANDS` (một code gộp mọi vi phạm, không có `error.fields[]`) và `validateGradeScale()` nhận thêm tham số `scaleType` + 3 rule mirror phía client (≤10 bands CHỈ cho scale số — LETTER serialise tới 64 `letterGrades`; label 1..32 ký tự sau trim). Review fix round: giữ nguyên precision dưới 0.1 cho threshold (bỏ `toFixed(1)` không cần thiết) + amend ADR 0053's body (không chỉ header) cho 4 đoạn văn đã stale. Closes asks **#10**/**#11**. |


### Wave 8 — batch 5 tiêu thụ BE US-186..193 (đóng toàn bộ asks 2026-08-06)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.51 | Message pin / unpin / pin board real (social US-192) | cao | normal | **Done** 2026-08-07 — đóng phần **message-pin** trong 3 capability mà ADR 0060 ghi là "không có real contract" (group lifecycle vẫn treo ở US-E18.50, contacts ở US-E18.52). **Quyết định kiến trúc:** XOÁ `GroupEntity.pinnedMessages` thay vì trỏ lại — pin board thật là resource riêng, gate riêng (`GET /rooms/{roomId}/pinned-messages` chỉ cần membership; pin/unpin cần `moderate_msg`), phẳng + không paginate, newest-pin-first ⇒ entity mới `PinnedMessage` + method `getPinnedMessages()` + query key riêng `["messaging","pinned",id]`, fetch độc lập với group detail (vốn vẫn mock). 4 outcome map thành 4 failure RIÊNG: `pin-limit-reached` (409 cap 50), `message-already-pinned` (409), `message-not-pinned` (404), `pin-forbidden` (403 `SOCIAL_INSUFFICIENT_ROOM_PERMISSION`/`ROOM_NOT_MEMBER`) — hai 409 cùng status nên branch theo CODE. 429 của pin board tái dùng đúng mapping của message-history (code làm `cause`, KHÔNG đẻ failure rate-limit song song); 403 khi ĐỌC cố ý KHÔNG map thành `pin-forbidden`. **Ground-truth phát sinh (ngoài packet):** (1) `senderName` của message nhúng trong board luôn là `""` (`toMessageDTO(msg, "")` — không persist; openapi cũng thiếu field này dù Go handler có emit) ⇒ `senderName` optional trong entity + fallback i18n ở presentation, KHÔNG bịa placeholder trong mapper — **ask #32(b') gửi BE**: cân nhắc denormalize sender name vào pin board (hoặc cho FE một directory lookup) nếu muốn hiển thị tên người gửi; (2) wire KHÔNG có room-capability nào ⇒ gate của context-menu chuyển sang tri-state (`undefined` = chưa biết ⇒ vẫn bấm được, nhận 403 phản ứng; chỉ `false` mới disable) — nếu giữ `Boolean(selfIsGroupAdmin)` thì mọi group ở real mode sẽ có nút pin CHẾT vĩnh viễn. Không có realtime signal cho pin (BE xác nhận vắng mặt, không phải chưa build) ⇒ refetch bằng invalidation sau 201/204, chứng minh bằng call-count trong Storybook. Thêm affordance **unpin** trên pin board (trước đó AC unpin không thể thao tác được vì UI chưa từng có). Closes ask **#32(b)**. |
| US-E18.52 | Contact picker non-staff qua IAM narrowed tier (iam US-190, ADR 0129 amend 0120) | trung bình | normal | **Done** 2026-08-07 — `getContacts()` rời slice force-mock của ADR 0060. Lý do force-mock cũ ("people-directory endpoint chỉ mở cho ADMIN/TEACHER") nay SAI: `GET /iam/api/v1/tenants/{id}/members` phục vụ thêm **narrowed tier** cho STAFF/STUDENT/PARENT — `role=` BẮT BUỘC và chỉ nhận `ADMIN\|MANAGER\|TEACHER\|STAFF` (thiếu/sai → 403 `member_list_role_filter_required`), `search=` chỉ match displayName, row chỉ còn `memberId`/`userId`/`displayName`. Đây là lần mở rộng thứ N của capability dùng chung `iam-directory`, KHÔNG fork: kiểm tra trước khi sửa và xác nhận `DirectoryMember` (endpoint LIST) là type RIÊNG với `MemberSummary`/`MemberBatchItem` (endpoint BATCH `?ids=`, đã mở rộng ở US-E18.33/35/41) → widen đúng entity, conditional-spread nên VẮNG MẶT vẫn là vắng mặt (presence = tín hiệu tier), staff-tier row byte-identical như cũ (có test regression riêng). Failure mới `role-filter-required` TÁCH BẠCH khỏi `forbidden` (nguyên nhân khác, cách sửa khác: lỗi wiring vs thiếu quyền). `MessagingRepository` nhận port `ContactDirectoryPort {role, list}` compose ở `bootstrap/di/messaging.di.ts` từ `SearchMembersUseCase` — repo `social` không tự gọi `iam` (decision 0017) và tái dùng vòng drain "tin `hasMore`, không tin độ dài trang". **Filter chốt = `role: "TEACHER"`** (design-spec/screens.md không định nghĩa phạm vi picker; endpoint chỉ nhận MỘT role nên nhiều role = N lần drain; trùng filter với `class-management.di.ts`/`principal-teachers.di.ts`) — ghi rõ trong DI + Evidence, flag cho product nếu muốn mở rộng. Caption vai trò chuyển sang `roleKey` (key ổn định, dịch ở presentation) vì row narrowed KHÔNG có chuỗi role; không có thông tin vai trò → BỎ HẲN dòng caption (không để dòng trống trông như thiếu dữ liệu) qua `ContactRoleCaption` dùng chung cho cả 3 picker (trước đó lặp markup 3 nơi, decision 0026). XOÁ `ContactResponseDto` + `toContactEntity` (anticipatory — chưa từng có nguồn thật). Parent→parent qua `?ids=` batch KHÔNG đụng; group lifecycle + pin VẪN force-mock (lý do chưa hết hạn); `USE_MOCK=true` không đổi. Closes **#32(c)**. See `US-E18.52-contact-picker-non-staff/US-E18.52-contact-picker-non-staff.md`. |

## Dependencies & thứ tự

- Wave 0 trước tất cả (proof-of-pattern). Wave 1 các US độc lập module → chạy
  song song được (worktree per US, decision `0033`).
- US-E18.12 (grades) nên xong TRƯỚC US-E18.13 (academic-records seal phụ thuộc
  khái niệm term-lock: BE trả `UNLOCKED_GRADES_EXIST` khi seal).
- US-E18.14 (conduct) độc lập nhưng đụng nhiều màn (teacher/principal/parent) —
  không chạy song song với US nào cùng chạm `features/discipline`.
- Wave 4 chờ Kong route (cross-repo request #1).

## Design Source

Không có màn mới — mọi US giữ nguyên UI hiện có (design-review gate chỉ áp cho
US thêm state UI mới: E18.10 revise, E18.12 submit/lock, E18.13 seal-flow,
E18.14 conduct workflow).
