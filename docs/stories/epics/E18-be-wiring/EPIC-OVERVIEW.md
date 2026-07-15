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
| US-E18.5 | Admin roster wiring | MATCH− | normal | `students/unassigned` search pool WEB-ONLY → decision: derive từ IAM members − enrolled, hoặc chờ BE |
| US-E18.6 | IAM member + tenant wiring | MATCH | normal | ⚠️ iam ERROR_CODES.md gần rỗng — xác nhận taxonomy với BE trước khi map failure |

### Wave 2 — drift nhỏ (path fix) + workflow bổ sung

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.7 | Assessment scheme + grade scale wiring | path | normal | Bỏ prefix `/config/` ở grade-scale; scheme cần trailing `/terms/{termId}` |
| US-E18.8 | Staff-leave wiring | path | tiny | Thêm segment `/conduct/`: `/core/api/v1/conduct/staff-leave-requests` |
| US-E18.9 | Teaching-plan wiring | path | normal | BE nest `/lms/teaching-plans`; `/cells` WEB-ONLY → decision (gộp vào PUT plan hay chờ BE) |
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
