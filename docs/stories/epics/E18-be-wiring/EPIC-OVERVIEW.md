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

## Scope — US breakdown theo wave

### Wave 0 — tiền đề

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.0 | Gateway smoke + wiring playbook verify | — | tiny | Chạy đủ 1 vòng thật qua `:8000` với 1 cụm MATCH (school-config): login → GET qua core, xác nhận envelope/refresh/error map chạy đúng ngoài mock. Là proof-of-pattern cho cả epic. |

### Wave 1 — MATCH, flip gần như thẳng (chạy song song được, mỗi US 1 module)

| Story | Title | Drift | Lane | Ghi chú |
|-------|-------|-------|------|---------|
| US-E18.1 | Calendar wiring (academic-years/terms) | MATCH | normal | Error: `CALENDAR_*` |
| US-E18.2 | Staffing wiring (departments/titles/assignments) | MATCH | normal | Error: `DEPARTMENT_*`, `POSITION_*` |
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
