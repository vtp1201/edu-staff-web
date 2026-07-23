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
| US-E18.13 | Academic-records seal remap | cao | high-risk | **Done** — ground-truthed against `core`'s `AcademicRecords` tag + Go source (`assessment/*` use-cases). Confirms `sealBatch` matches the web's existing class+term model almost exactly and wires real (bare POST, no body) via a hybrid facade; the hard client pre-check (`getSealStatus`) is replaced by a reactive gate (real 422 `unlocked-grades-exist`/`too-many-reseals`) since seal is idempotent on the real contract (drops old blocking `already-sealed`). **Implementation-time correction to the epic table's assumption**: the two-admin unseal workflow's `initiate`/`confirm` POSTs exist, but there is NO GET listing endpoint for pending unseal requests at all — a second admin in a different session can never discover a real `requestId` to approve, so the whole unseal workflow (not just `seal-status`/`sealed-students`/`audit-trail`) stays permanently mock (cross-repo ask #21, 4th fully-blocked operation set in the epic). Separately, the read-only viewer (`getRecord`/`listYears`) also stays mock — no wire year-grouping, no fixed tx1/tx2/giuaKy/cuoiKy columns (real snapshot is a dynamic column array matching US-E18.7's model), no student-identity fields. `AllLockedGate` UI updated for the reactive-not-blocking gate (design-review + a11y pass, 1 should-fix fixed). See `US-E18.13-academic-records-wiring/story.md` + ADR `0055`. |
| US-E18.14 | Discipline → conduct remap | cao | high-risk | **Done** — ground-truthed against `core`'s `conduct` domain (`student-violations`/`student-conduct-grades`/`student-leave-requests` routes + Go source). Confirms the epic table's premise partially: real BE genuinely has full submit/approve/reject on violations and conduct-grades (replacing web's single-action `overrideConductGrade`), and a genuine staff/student split (`staff-violations`, `staff-conduct-notes`) plus `student-absences` (`/{date}/flag`). But **none of it is wireable today**: every real endpoint keys on a real student `studentMemberId` UUID the web roster can't resolve (extends ask #9), and — a NEW finding — even STUDENT self-service list/submit calls require a `classId` the student has no way to discover (`list_student_violations.go`/`list_student_conduct_grades.go` require `classId` even on the own-record branch; `CreateStudentLeaveRequestRequest.ClassID` is a mandatory body field), extending ask #15 beyond PARENT to STUDENT self-view too. Repository/DTO/error-taxonomy/DI-only remap: real `DisciplineRepository` implements the ground-truthed 19-code error matrix (shared `ApprovalTransition` domain service — `VIOLATION_SAME_ACTOR`/`VIOLATION_INVALID_TRANSITION`/`VIOLATION_REJECTION_REASON_REQUIRED` are reused verbatim across violations/conduct-grades/leave, confirmed by reading the use-cases side-by-side) but every method is a permanent blocked stub; `discipline.di.ts` force-mocks regardless of `USE_MOCK` — the third fully-blocked DI factory in the epic after US-E18.8/US-E18.9. `staff-violations`/`staff-conduct-notes`/`student-absences` have no web screen at all (not a BE gap — a product/design gap, flagged for `uiux`/`ba`). Zero UI/entity/use-case/mock-repo change. See `US-E18.14-discipline-conduct-wiring/story.md` + cross-repo ask #22. |
| US-E18.15 | LMS exam family wiring | naming | normal | `exam-bank`→`/lms/exam-papers` (+`/status`); `exams`→`/lms/class-exams` (+`activate/complete/submissions`) — lifecycle giàu hơn mock |
| US-E18.16 | LMS lesson + question bank wiring | **naming assumption false** | normal | **Descoped, zero code** — ground-truthing found `"lessons"→"/lms/lesson-plans"` is a false match: web's only "lesson" feature (`lesson-bank`, file-sharing) and BE's `lesson-plans` (DRAFT→PUBLISHED planning document w/ objectives/contentOutline/activities/assessmentMethod) are unrelated domain models, zero lossless overlap. No web feature exists at all for BE's question-bank (`exercisebank`/`/lms/questions/search`) — only unrelated per-lesson Q&A comments share the word "questions". Not a BE gap (BE ships both contracts cleanly) — a product/design-scope gap; net-new screens needed via `/uiux`→`/ba`→`/fe`, not a wiring swap. `courses`/lesson-complete/notes already stay mock (no action needed, already true). See `US-E18.16-lesson-question-bank-wiring/story.md` + cross-repo/product finding #27. |

### Wave 4 — blocked bởi Kong route (chờ cross-repo)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.17 | Messaging remodel (rooms/DMs) | **rất cao** | high-risk | **Done** — the "Blocked: Kong chưa route `/social`" label only blocked LIVE verification, not contract-first wiring (ADR `0060`, decision to proceed anyway). Real-wired: `getConversations`/`getMessages`/`sendMessage`/`deleteMessage`/1:1 `createConversation` (`school-dms`) against ground-truthed `/social/api/v1/rooms...`; two NEW additive capabilities `markConversationRead` (`POST .../read`) + `sendTypingIndicator` (`POST .../typing`, throttled outbound only — inbound still needs SSE, US-E18.18) wired real with zero new UI surface. Self-delete window corrected 1h→5min to match the real `DELETE_WINDOW_EXPIRED` rule (incl. the disabled-hint copy the a11y audit caught still saying "1 hour"). Permanently mock via a new `HybridMessagingRepository` facade (real methods some, mock others, same hybrid pattern as US-E18.4/US-E18.5/US-E18.11): the entire ad hoc group lifecycle (`createGroup`/`getGroup`/`updateGroup`/`addGroupMembers`/`removeGroupMember`/`leaveGroup`/`deleteGroup` — no self-service group-room contract exists, only system-provisioned `class_chat`/`parent_group`), `pinMessage`/`unpinMessage` (no message-pin endpoint at all), and `getContacts` (the only people-directory endpoint is role-gated ADMIN/TEACHER-only). Live-gateway proof still deferred (ask #1). See `US-E18.17-messaging-rooms-remap/story.md` + ADR `0060` + cross-repo/product ask #32. |
| US-E18.18 | Notification wiring (SSE + unread-counts + presence) | cao | normal | **Done** — the "Blocked: Kong chưa route notification" label only blocked LIVE verification, not contract-first wiring (ADR `0061`, same precedent as US-E18.17/ADR `0060`); `kong.yml`'s "notification is a worker (no HTTP)" comment is stale — `INTEGRATION.md` confirms a real `cmd/server` HTTP+SSE surface exists. **Second, independent deferral reason found**: `edu-api` ADR `0047` (kong auth trust model, dated AFTER this repo's original SSE-proxy design) retired per-service Bearer-JWT verification — `notification` now trusts ONLY Kong-injected `X-Edu-Claims` headers, so the web's direct-bypass SSE proxy (`NOTI_SERVICE_URL`, ADR 0009/0030) will 401 even once Kong routes `notification`, until the proxy itself is re-architected to go through Kong. Fixed `NOTI_EP.stream` path (`/events/stream`→`/api/v1/stream`). **Implementation-time correction**: `unread-counts` is per-ROOM (messaging), not a generic notification concept — wired into `MessagingRepository.getConversations()`'s real branch (closes ADR 0060 ask #32(a)'s "no unread field on the wire" gap) rather than the generic `notification` feature; `notification.getUnreadCount()` repurposed to SUM real per-room counts (narrower real meaning than mock's synthetic multi-category count, documented). `listNotifications`/`markRead`/`markAllRead` force-mocked permanently via new `HybridNotificationRepository` — zero real backing exists for any of them. Remapped the web's own speculative `RealtimeEvent` SSE contract (`bootstrap/realtime/event.ts`, ADR 0009's "web defines first") to the REAL flat wire vocabulary (`message.new`/`message.edited`/`message.deleted`/`unread.updated`/`typing` — no `payload` wrapper, no `eventId`, `typing` has no `tenantId`/embedded `type`); legacy mock-only frame types (`notification.new`/`attendance.updated`/`presence.changed`) kept, clearly flagged as having zero real BE equivalent. Wired inbound `typing` to `ChatWindow`'s dormant indicator (closes US-E18.17's explicitly deferred item) and inbound `message.new`/`unread.updated`/etc to conversation-list/chat-window cache invalidation. Fixed presence's real contract (`userIds` param not `memberIds`, `{items:[...]}` envelope not bare array, real 2-state `{online,lastSeen}`→domain's existing 3-state `PresenceState` via an injected-clock 5-minute "recent" threshold — no confirmed product/design-spec value for this threshold, flagged as an open question). See `US-E18.18-notification-sse-wiring/story.md` + ADR `0061` + cross-repo/product asks #33-#35. |

## KHÔNG thuộc wave này (BE chưa có endpoint — cần BE story hoặc quyết định giữ mock)

- **Announcements** — cả cụm không có trên BE (không service nào có `announcements`).
- **Audit log** — core có error `AUDIT_ENTRY_*` nhưng không expose endpoint.
- LMS `courses` / lesson-completion / notes (already mock by design, no
  BE-wiring action needed — US-E18.16).
- LMS `lesson-plans` (real BE contract exists, but web has NO matching
  feature — `lesson-bank` is an unrelated file-sharing feature, not a
  planning-document editor) / question-bank `exercisebank` (real BE contract
  exists, but web has NO feature at all, mock or otherwise) — product/
  design-scope gap, not a BE gap; net-new screens needed via `/uiux`→`/ba`
  before any `/fe` wiring is possible (US-E18.16, finding #27).
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
    `pinMessage`/`unpinMessage`, and `getContacts` stay permanently mock —
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
