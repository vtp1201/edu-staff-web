# BE → FE (2026-08-07): TOÀN BỘ asks còn treo đã ship (US-186..193) + trả lời viewer học bạ

> Trả lời cho `2026-08-06-fe-to-be-asks.md` (Phần 2). Kể từ report đó, BE đã ship
> **8 US** đóng **tất cả** các ask còn implement được. edu-api `main` HEAD:
> **`e2a3a445`**. Mọi US đều qua đủ pipeline (tech-lead Approved + security audit
> + unit/integration proof, harness `implemented`).

## 1. Các ask Phần 2 → đã ship

| Ask | US | Endpoint / contract | Ghi chú cho FE |
| --- | --- | --- | --- |
| **#18** rollup pending-approval tenant-wide | **US-186** (high-risk, ADR 0127) | `GET /core/api/v1/grade-entries/pending-approval?cursor=&limit=` (ADMIN/MANAGER) — rollup batch class/subject/term + counts + submittedAt, cursor-paginated oldest-first | Bảng clone mới `grade_entries_pending_by_tenant` (migration **049**) + reconcile worker. `IGradeApprovalRepository` (batch dashboard) giờ có read path thật. |
| **#28** attendance range theo class | **US-187** | `GET /core/api/v1/classes/{classId}/attendance?startDate=&endDate=` — mirror của member-range | Không migration. |
| **#16** timetable-conflicts toàn trường | **US-188** (ADR 0128) | `GET /core/api/v1/timetable/conflicts?termId=` (ADMIN/SUPER_ADMIN) — scan double-booking, recompute fresh, response có `truncated` flag | `truncated=true` KHÔNG phải lỗi — nghĩa là có thể còn conflict chưa hiện. Write path hiện KHÔNG reject room conflict (đọc-only, per ADR 0128). |
| **#10/#11** bands + requiredCount | **US-189** (high-risk) | `bands[]` persist trên numeric grade scale; `requiredCount` (nullable, 1..100) trên `AssessmentColumnResponse` + scheme write path | Migration **050**. Band label được trim server-side (VULN-189-002). |
| **#32(b)** message-pin | **US-192** | `POST/DELETE /social/api/v1/rooms/{roomId}/messages/{messageId}/pin`, `GET /rooms/{roomId}/pinned-messages` — quyền pin/unpin = capability `moderate_msg` (OWNER/ADMIN/MODERATOR); list chỉ cần membership | Migration social **038**. Cap **50 pin/room** (409 khi vượt). List = bare array (bounded, không paginate), tự loại pin của message đã xóa. KHÔNG có realtime signal — FE refetch sau 201/204. Pin message ≠ pin post (feed): contrast table trong `INTEGRATION.md`. List pinned dùng CHUNG quota rate-limit với message-history (429 `SOCIAL_READ_RATE_LIMITED`). |
| **#32(a)** group room tự tạo | **US-193** (ADR 0132) | `POST /social/api/v1/rooms/groups` (201) + `POST /rooms/{roomId}/archive` (204, idempotent) | Tạo room: allow-list **ADMIN/MANAGER/TEACHER/STAFF** (deny-by-default, STUDENT/PARENT 403 `SOCIAL_GROUP_ROOM_CREATION_FORBIDDEN`). Creator tự thành OWNER — response 201 KHÔNG echo membership object. Thêm member = 2-call flow qua endpoint add-member có sẵn. Archive chỉ áp dụng room `CUSTOM` (409 `SOCIAL_ROOM_NOT_SELF_SERVICE` với room hệ thống class_chat/parent_group), gate bằng capability `delete_room`. Không có field `description`. |
| **#32(c)** directory cho STUDENT/PARENT | **US-190** (high-risk, ADR 0129 amend 0120) | `GET /iam/api/v1/tenants/{tenantId}/members` giờ mở cho STUDENT/PARENT/STAFF ở **narrowed tier** | Narrowed tier: (1) **`role=` BẮT BUỘC** và chỉ nhận `ADMIN\|MANAGER\|TEACHER\|STAFF` — thiếu hoặc role khác → 403 `MEMBER_LIST_ROLE_FILTER_REQUIRED`; (2) `search=` chỉ match displayName; (3) row chỉ còn `memberId`/`userId`/`displayName` — `email`/`roles`/`status` **absent** (không phải null/empty — branch theo PRESENCE). Staff tier: response byte-identical như cũ. Contact picker non-staff = list staff qua endpoint này; parent→parent vẫn qua `?ids=` batch. |
| **#31** self-serve registration | **US-191** (high-risk, ADR 0130+0131) | `POST /iam/api/v1/invitations/redeem` (public, 201) + `POST /iam/api/v1/invitations/lookup` (public, 200 — preview để build form) | Body: token + password + fullName (KHÔNG có email — email lấy từ invitation). 201 trả member + **tenant-scoped session luôn** (khỏi signin lại). Errors: 410 token hết hạn/đã dùng (kể cả replay — là 410, KHÔNG phải 409), 409 `INVITATION_ACCOUNT_EXISTS` khi email đã có account → FE route sang sign-in + accept-invitation flow có sẵn. Token CHỈ đi trong POST body, đừng bao giờ đưa vào query string. Rate limit per-IP 10/phút cho cả 2 route. Optional header `X-Client-Id` (≤128 chars, metadata-only). |

## 2. Trả lời câu hỏi viewer học bạ (year-grouping)

**Model `classId+termId` là CHỐT cho aggregate học bạ** — seal/unseal/approval
semantics gắn vào tuple (class, term) theo ADR 0047; sẽ không có rewrite theo
year. NHƯNG read path theo member **đã tồn tại từ US-064**:

- `GET /core/api/v1/members/{memberId}/academic-records` — trả **toàn bộ**
  records của một học sinh across mọi class-term (clone `academic_records_by_student`,
  RBAC: ADMIN/MANAGER any, STUDENT self, PARENT linked-child).

Year-grouping làm **client-side**: record row carry `classId`+`termId`;
`academicYearLabel` resolve qua class (đã có trong class DTO) hoặc calendar API.
Record DTO hiện **không** denormalize `academicYear` — nếu FE muốn field đó nằm
ngay trên record row (đỡ join client-side), gửi ask mới: đó là một denorm nhỏ
(thêm cột + backfill), làm được nhanh nhưng cần story riêng.

## 3. Còn treo (không đổi)

- **#21 audit-trail seal/unseal đa cycle** — vị trí BE giữ nguyên: chỉ giữ cycle
  mới nhất + lịch sử unseal-request. Cần hơn → FE gửi ask mới nêu field cụ thể.

## 4. Deploy notes (BẮT BUỘC trước khi bật build mới)

1. **core migrations 047 → 050** theo thứ tự (047 rejection metadata US-184,
   048 year-heal US-185, 049 pending-rollup US-186, 050 grade-scale bands US-189).
2. **social migration 038** (`pinned_messages`) trước khi bật US-192/193 build.
3. IAM: **không có migration** — US-190/191 chỉ cần deploy binary. Env mới
   (optional, có default): `RATELIMIT_REDEEM_MAX` / `RATELIMIT_REDEEM_WINDOW`.

## 5. Debt BE tự ghi nhận (FE không cần hành động, chỉ để biết)

- US-194: cursor của member LIST hiện là base64 thô — narrowed-tier caller kiên
  trì có thể suy ra member id qua cursor (Medium, đã ghi ADR 0129). Fix = opaque
  cursor, story riêng.
- US-197: per-IP rate limiter toàn platform hiện đếm chung sau Kong (chưa set
  ProxyHeader) — sẽ fix platform-wide.
- US-199: room-create endpoints (`/rooms`, `/school-dms`, `/rooms/groups`) chưa
  có rate limit (pattern có sẵn, không phải regression mới).

---

**Tóm tắt:** 8/8 asks implement được đã đóng (US-186..193, main `e2a3a445`);
viewer học bạ đã trả lời ở §2 (classId+termId chốt, đọc theo member đã có,
year-grouping client-side hoặc gửi ask denorm); chỉ #21-remainder chờ ask mới
từ FE.
