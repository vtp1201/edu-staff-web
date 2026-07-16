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
| US-E13.2 *(packet có sẵn, epic E13)* | Attendance wiring | **cao** | normal | Re-scope theo audit: prefix `/core/api/v1/classes/{id}/attendance` + `/members/{id}/attendance`; mô hình period-based của web ≠ class/date-based BE → remap |

### Wave 3 — drift lớn, redesign contract phía web

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.11 | Timetable wiring (builder + consumer views) | cao | normal | BE class-scoped `/classes/{id}/timetable(/slots)`; `/timetable/conflicts` không tồn tại (conflict = error `TIMETABLE_TEACHER_CONFLICT` khi ghi slot); `/me`,`/teacher/me`,`/my-children` không tồn tại → resolve classId phía web (roster/linked-students) — decision trong packet |
| US-E18.12 | Grades contract remap | **rất cao** | high-risk | Web `class-subjects/{csId}` + grade-batches ≠ BE `classId/subjectId/termId/columnId` + per-column `submit`/`approve` + term `lock`. Semantic remap publish/request-revision → submit/lock. Student đọc qua `/members/{id}/grades`, parent qua `/members/{id}/grade-report`. Cân nhắc tách 2 US khi intake (entry+submit / approval+lock+report) |
| US-E18.13 | Academic-records seal remap | cao | high-risk | BE seal theo class+term; web flat `/academic-records/*`; initiate/confirm 2 bước → `unseal-requests`+`approve`; `seal-status`/`sealed-students`/`audit-trail` không có BE tương đương → phần đó giữ mock + flag |
| US-E18.14 | Discipline → conduct remap | cao | high-risk | Prefix `discipline`→`conduct`; tách student/staff; full submit/approve/reject trên violations + conduct-grades (web đang collapse thành override); absences có `/{date}/flag` |
| US-E18.15 | LMS exam family wiring | naming | normal | `exam-bank`→`/lms/exam-papers` (+`/status`); `exams`→`/lms/class-exams` (+`activate/complete/submissions`) — lifecycle giàu hơn mock |
| US-E18.16 | LMS lesson + question bank wiring | naming | normal | `lessons`→`/lms/lesson-plans` (+`publish`, `/subject/{id}`); questions có `/search`+`/publish`. `courses`/lesson-complete/notes: BE không có → giữ mock + flag |

### Wave 4 — blocked bởi Kong route (chờ cross-repo)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.17 | Messaging remodel (rooms/DMs) | **rất cao** | high-risk | Vocabulary đổi hẳn: conversations/groups → `rooms`+`dms`; thêm read/typing/mute/moderation. **Blocked**: Kong chưa route `/social` |
| US-E18.18 | Notification wiring (SSE + unread-counts) | cao | normal | BE chỉ có `/stream`, `/notifications/unread-counts` (số nhiều), `/presence`; list/per-item-read/read-batch KHÔNG có BE → giữ mock phần đó + flag BE story. Sửa SSE path `/events/stream`→`/api/v1/stream`. **Blocked**: Kong chưa route notification |

## KHÔNG thuộc wave này (BE chưa có endpoint — cần BE story hoặc quyết định giữ mock)

- **Announcements** — cả cụm không có trên BE (không service nào có `announcements`).
- **Audit log** — core có error `AUDIT_ENTRY_*` nhưng không expose endpoint.
- LMS `courses` / lesson-completion / notes (US-E18.16 chỉ wire phần có).
- Timetable `/me`-family + conflicts-summary (US-E18.11 giải bằng client-side resolve + error-driven conflict).
- Roster `students/unassigned`, class `/teachers` list, subject `restore`.
- Notification list + mark-read.
- Feed post pinning (BE US-101 `in_progress`) — thuộc nhóm B (UI mới), không thuộc epic này.

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
