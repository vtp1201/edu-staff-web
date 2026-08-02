# BE → FE (2026-08-02): batch US-164..173 — trả lời các asks trong report 2026-08-01

> BE phản hồi `2026-08-01-fe-to-be-asks.md`. Hai đợt: (A) US-164..168 đã merge
> TRƯỚC khi FE gửi report (FE chưa thấy khi verify), (B) US-169..173 merge hôm
> nay 2026-08-02 theo đúng thứ tự ưu tiên FE xếp. Toàn bộ contract chi tiết nằm
> trong `services/<svc>/docs/{openapi.yaml,INTEGRATION.md,ERROR_CODES.md}` trên
> `edu-api main` — mục dưới chỉ tóm tắt + các điểm FE PHẢI biết khi wire.

## Đợt A — đã giải trước 2026-08-01 (FE verify sót, chỉ cần re-verify)

| Ask | Giải bởi | Tóm tắt |
| --- | --- | --- |
| #39 MANAGER vào `list_classes` | US-164 | MANAGER được ListByYear tenant-wide — màn Principal Classes hết 403 |
| #40(a) author identity trên feed | US-165 | `authorName`/`authorRole`/`avatarUrl` denormalize lúc write lên `Post`/`Comment` |
| #40(b) một phần | US-166 | `status=` filter inbox + `GET /reports/{reportId}` + `COMMENT` targetType + comment moderate-delete |
| #20 (phần tên) PARENT batch lookup | US-167 | Batch lookup TIERED (ADR-0120): PARENT/STUDENT gọi được, nhận `memberId`+`displayName` |

## Đợt B — merge 2026-08-02

### #9 → US-169 (merge `ade443e1`): dob/gender trên batch lookup, staff tier only

- `GET /api/v1/members?ids=` (IAM): `MemberBatchItem` thêm `dob` + `gender` —
  **chỉ staff tier** (SUPER_ADMIN / ADMIN / MANAGER / TEACHER) thấy; tier hẹp
  (STAFF/STUDENT/PARENT) tuyệt đối không nhận 2 key này.
- `EnrollmentResponse` bên core KHÔNG đổi — roster compose qua batch IAM như
  US-144 (ADR 0122).
- Self-profile: `PATCH /api/v1/users/me` nhận `gender`
  (`MALE|FEMALE|OTHER|UNDISCLOSED`, optional).
- ⚠️ **3 điều PHẢI biết:**
  1. `dob`/`gender` **null cho mọi học sinh hiện có** đến khi từng user tự
     `PATCH /users/me` — chưa có đường admin-set-cho-người-khác (non-goal, cần
     follow-up story nếu US-E18.5 cần data ngay).
  2. **Đừng dùng `dob`/`gender` làm tier signal** — chúng optional per-user kể
     cả staff tier. Branch tier theo presence của `email`/`roles` như cũ.
  3. **`PATCH /users/me` là replace-semantics**: bỏ sót key
     (`dob`/`gender`/`avatarUrl`) sẽ bị CLEAR về rỗng. Client phải đọc
     `GET /users/me` rồi echo lại đủ field muốn giữ. (Data-loss footgun đã
     document trong INTEGRATION.md; chuyển sang partial-merge là story riêng.)

### #41 → US-170 (merge `b98867fc`): staff-leave `leaveType` + `department`

Trả lời câu hỏi required-vs-nullable của FE:

- **`leaveType`**: **required khi POST submit** — enum **UPPERCASE**
  `ANNUAL | SICK | PERSONAL | FAMILY`. ⚠️ Mock lowercase của FE sai: gửi
  `"annual"` → 422 `VALIDATION_FAILED` (không case-normalize, fail loudly).
  **Nullable trên mọi response** — null CHỈ với rows tạo trước migration
  (không backfill vì không có giá trị thật).
- **`department`**: **luôn nullable, không writable** — resolve read-time từ
  staffing, là phòng ban **HIỆN TẠI** của member (không phải snapshot lúc xin
  nghỉ; reassign sau này đổi cả field trên đơn cũ). Null khi member không
  thuộc phòng ban ACTIVE nào hoặc lookup best-effort fail (ADR 0123).

### #42 → US-171 (merge `da401865`): notification inbox `?read=false`

- `GET /api/v1/notifications?read=false` — trang unread-only từ MV sẵn có,
  cursor pagination giữ nguyên semantics.
- **Chỉ hỗ trợ `read=false`** (đúng tab "Chưa đọc"): `read=true` → 400
  `NOTIFICATION_READ_FILTER_UNSUPPORTED`; `read` + `type` kết hợp → 400
  `NOTIFICATION_FILTER_CONFLICT`; giá trị khác `true|false` → 422; bỏ trống =
  unfiltered.
- ⚠️ **MV lag**: row vừa mark-read có thể còn xuất hiện thêm 1 trang
  `read=false` (eventually consistent, ADR 0115) — FE nên dedupe/ẩn client-side
  sau khi mark read.

### #40(b) phần còn lại → US-172 (merge `dd70db8c`): filters + stats

- `GET /api/v1/reports?status=&contentType=&search=`:
  - `contentType`: enum `MESSAGE | POST | COMMENT`.
  - `search`: max 200 ký tự, match trên `reasonFreeText` (fold dấu tiếng Việt,
    case-insensitive). KHÔNG match `reasonCategory`.
  - ⚠️ **Bounded scan** (cap 10 trang × 100 rows/request): trang trả về
    ngắn/rỗng kèm `hasMore=true` nghĩa là "**gọi tiếp với `nextCursor`**",
    KHÔNG phải "hết queue". FE phải loop theo cursor.
- `GET /api/v1/reports/stats` → `{ "pending": n, "resolved": n }` (int64) —
  **best-effort/eventually-consistent** và **KHÔNG theo filter** (stat row
  render từ số unfiltered, by design).
- Không error code mới; input sai → 400 `INVALID_REQUEST_PARAMETERS`.

### #8 → US-173 (merge `9a6675c2`): class list enrichment

- `ClassResponse` (list + get) thêm 3 field, **luôn present** (không omit):
  - `studentCount` (integer ≥ 0)
  - `homeroomTeacherId` (uuid, nullable) — **signal authoritative** cho việc
    lớp có GVCN hay không
  - `homeroomTeacherName` (string, nullable) — ⚠️ null có 2 nguyên nhân KHÔNG
    phân biệt được: chưa gán GVCN, HOẶC resolve tên cross-service fail
    (best-effort, ADR 0124). **Đừng suy "không có GVCN" từ name null** — dùng
    `homeroomTeacherId`.
- `POST`/`PATCH /classes` trả cùng shape nhưng **unenriched** (`0`/`null`/`null`)
  — FE refetch list/get nếu cần số liệu ngay sau create/rename.
- Hết fan-out 2×N: một trang list = đủ data render.

## Trạng thái registry sau batch này

- **P1: đóng hết** (#39, #40(a), #40(b), #20, #9).
- **Phần 3 (asks mới khi wire): đóng hết** (#41, #42).
- **Còn treo P2**: #18 (rollup pending-approval), #19 (reject transition
  GradeEntry), #28 (class-scoped attendance range), #12 (`gradeLevel=` filter
  subjects), #16 (bulk conflict scan), #10/#11 (bands/requiredCount — chờ BE
  confirm), #21-rest (sealed-students list + audit-trail).
- **Còn treo P3**: #32 messaging, #31 registration+invite, viewer học bạ,
  ADR 0064 link audit-trail. (#40(iii) doc drift đã reconcile trong US-166.)
- SSE flush latency (observation): chưa xử lý — US-155/160 harden SSE nhưng
  chưa đụng Fiber buffering; vẫn trong backlog BE.
