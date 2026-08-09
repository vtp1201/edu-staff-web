# BE → FE (2026-08-09): trả lời 13 ask từ smoke-test TEACHER / hiệu trưởng / phụ huynh

> Trả lời cho `2026-08-09-fe-to-be-asks-teacher-live.md`.
> **Cả 13 ask đã xử lý xong** — 11 fix + 1 xác nhận contract + 1 từ chối có lý do.
> ⚠️ #13 có **một phát hiện quan trọng** cho kế hoạch un-mock: xem cuối mục #13.
> #8 và #9 là **hai lỗi thật của BE**, cảm ơn team đã bắt được. Toàn bộ verify lại
> bằng curl thật qua Kong `localhost:8000`, tenant
> `aeb0e462-9ced-48b3-ba36-803f9266b09d`, ngày 2026-08-09.
>
> **FE cần làm gì:** chỉ ask #1 và #3 có việc (bỏ bớt 1 round-trip, ghi ADR).
> #2/#4/#5 fix hoàn toàn phía BE, FE không phải đổi code.

| # | Ask | Trạng thái | FE cần làm |
| --- | --- | --- | --- |
| 1 | roster thiếu tên HS | ✅ ĐÃ LÀM (thêm `displayName`) | Bỏ được lượt decorate qua IAM |
| 2 | `homeroomTeacherName` null | ✅ FIXED (lỗi cấu hình, field KHÔNG dead) | Không |
| 3 | `memberId` ↔ `userId` | ✅ Đã xác nhận — **luôn bằng nhau**, nhưng đọc `memberId` vẫn đúng | Ghi ADR theo mục #3 |
| 4 | `unread-count` 500 | ✅ FIXED (hạ tầng) | Không |
| 5 | SSE 0 byte → reconnect loop | ✅ FIXED (lỗi code BE) | Không (backoff của FE cứ giữ) |
| 6 | TKB phi thực tế, 1 GV dạy hết | ✅ ĐÃ SEED LẠI + thêm 3 tài khoản GV | Không |
| 7 | `termName` trong học bạ | ❌ **KHÔNG LÀM** — xem lý do ở #7 | Giữ nguyên join hiện tại |
| 8 | ADMIN bị 403 ở `tenants/{id}/members` | ✅ FIXED — **lỗi BE**, gate leak | Bỏ workaround nếu có |
| 9 | `classes` rỗng khi thiếu `academicYear` | ✅ FIXED — giờ trả mọi năm | Không (truyền year vẫn đúng) |
| 10 | Thiếu dữ liệu cho hiệu trưởng | ✅ ĐÃ SEED — 31 lớp / 150 HS / điểm danh | Không |
| 11 | `GET .../consents` trả 405 | ✅ ĐÃ LÀM endpoint đọc consent | Bỏ mock phần consent |
| 12 | `me` alias + thiếu tên con | ✅ Đã thêm `studentName`; xác nhận **không có** `me` | Bỏ lượt decorate IAM |
| 13 | Conduct/kỷ luật rỗng | ✅ ĐÃ SEED đủ 4 trạng thái | ⚠️ Un-mock được GV/BGH; **màn phụ huynh thì KHÔNG** — đọc kỹ mục #13 |

---

## #1 — `displayName` đã có trên roster

BE **làm**, không trả lời "không làm". `GET /api/v1/classes/{classId}/students`
giờ trả thêm `displayName` trên mỗi dòng:

```bash
curl -s "$KONG/core/api/v1/classes/59db9632-.../students" -H "Authorization: Bearer $TOKEN"
# {"success":true,"data":[
#   {"enrollmentId":"3e91a694-...","classId":"59db9632-...",
#    "studentMemberId":"1aff4f6f-b125-4903-8639-c1f1bc597ab9",
#    "academicYearLabel":"2026-2027","enrolledAt":"2026-08-09T01:46:00Z",
#    "displayName":"Hoc Sinh Demo 1"},
#   {..., "displayName":"Hoc Sinh Demo 2"}]}
```

Cách làm: dùng lại đúng pattern enrichment của US-173 (`homeroomTeacherName`) —
**một** lệnh gọi `DisplayNames` nội bộ cho cả trang (id đã dedupe, chunk 100),
chạy **sau** authorization nên không thể lộ tên cho caller không được xem roster.

**Ba điều FE cần biết:**

1. `displayName` là **best-effort** (ADR 0124). Khi lane nội bộ tới IAM lỗi hoặc
   chưa cấu hình, field là `null` và **roster vẫn trả 200 bình thường** — BE
   không bao giờ để lỗi resolve tên làm hỏng danh sách. FE nên giữ fallback
   render theo id/placeholder khi `null`.
2. Chỉ có ở endpoint **LIST roster**. `GET .../students/{studentMemberId}`
   (single) và `POST .../students` vẫn không có — chưa có nhu cầu.
3. `studentMemberId` vẫn là **id định danh duy nhất**. `displayName` thuần hiển
   thị, đừng match/so sánh theo nó.

→ FE bỏ được lượt `GET /iam/api/v1/members?ids=<csv>` trên các màn roster. Nếu
màn nào còn dùng chung component với chỗ khác thì cứ giữ, không hại gì.

Đã cập nhật `openapi.yaml` (`EnrollmentResponse.displayName`, nullable) +
`INTEGRATION.md`.

## #2 — `homeroomTeacherName`: KHÔNG phải dead field, là lỗi cấu hình

Đừng bỏ khỏi contract. Field vẫn null vì stack demo chạy thiếu
`INTERNAL_API_SECRET` — biến bật lane gRPC nội bộ core → iam. Không có nó, core
chạy `MemberReader` stub (không có dữ liệu tên) và **cố tình** trả `null` thay vì
bịa tên. Đã bật trên stack demo:

```bash
curl -s "$KONG/core/api/v1/classes" -H "Authorization: Bearer $TOKEN"
# {"classId":"59db9632-...","name":"10A1",...,
#  "homeroomTeacherId":"68f65162-...","homeroomTeacherName":"Giao Vien Demo"}
```

Cùng biến này cũng là thứ làm `displayName` ở #1 có giá trị. Ngoài ra nó bật
**guard phân quyền cross-service thật (fail-closed)** — trước đó stack demo đang
chạy stub permissive, tức các check role cross-service **không hề chạy**. Đã
smoke lại toàn bộ 4 role sau khi bật, không endpoint nào gãy.

Vẫn nên coi `homeroomTeacherId` (không phải name) là tín hiệu "lớp có GVCN":
id luôn có khi tồn tại phân công, name có thể null.

## #3 — `memberId` **bằng** `userId`, và luôn luôn như vậy

Trả lời thẳng: **hai giá trị này bằng nhau theo thiết kế, không phải trùng do
seed.** Membership không có surrogate id — bảng `iam.members` khoá chính là
`(tenant_id, user_id)`. Trích `pkg/kit/auth/claims.go`:

> *"Membership identity is the composite (tenantID, userID) — there is no
> surrogate member id … MemberID (== userID, no surrogate) is LOAD-BEARING for
> authorization since US-174"*

**Nhưng FE sửa sang đọc `memberId` là ĐÚNG, đừng revert.** Lý do không phải
"giá trị khác nhau" mà là **ngữ nghĩa**:

- `memberId` **chỉ tồn tại trên token đã scope tenant** (sau `switch-tenant`).
  Đọc nó = tự động được bảo chứng "đang đứng trong tenant".
- `sub`/`userId` có mặt cả trên token **chưa** scope tenant. Code so theo `sub`
  sẽ "chạy được" cả khi phiên chưa có tenant context — đúng kiểu sai âm thầm.

Nội dung nên ghi vào ADR của FE:

> Mọi field `*MemberId` của core (`homeroomTeacherId`, `studentMemberId`,
> `teacherMemberId`, `authorMemberId`, `approverMemberId`) là member id của
> tenant hiện tại. Giá trị của nó **bằng** `userId` (IAM không có surrogate
> member id), nhưng client PHẢI đọc claim `memberId`, không đọc `sub` — vì chỉ
> `memberId` bảo chứng token đã scope tenant. Nếu sau này IAM đổi sang surrogate
> id, code đọc `memberId` không phải sửa gì.

## #4 — `unread-count` 500: hạ tầng, không phải code

Container `notification` mất session ScyllaDB sau khi container `scylladb` bị
recreate (container mới ⇒ IP mới; driver giữ host list cũ nên không nối lại
được). Cùng lúc đó `iam` cũng hỏng theo cách y hệt (`/.well-known/jwks.json` trả
500). Restart service là hết:

```bash
curl -s "$KONG/noti/api/v1/notifications/unread-count" -H "Authorization: Bearer $TOKEN"
# {"success":true,"data":{"count":2},...}
```

Không thiếu migration, không thiếu bảng — MV `notifications_unread_by_user` có
đủ. BE ghi nhận điểm yếu "service không tự hồi phục khi DB đổi IP" như debt hạ
tầng riêng; nếu FE gặp lại **500 đồng loạt trên nhiều service**, gần như chắc là
ai đó vừa recreate container infra — ping BE restart, đừng nghi token.

## #5 — SSE: đã phát byte ngay khi connect

Đây là **lỗi code BE thật**, đã fix. Nguyên nhân: byte đầu tiên chỉ xuất hiện ở
heartbeat **thứ 30 giây**. Trong 30s đó mọi intermediary nhìn thấy một
`200 text/event-stream` chưa gửi gì; proxy nào cắt upstream rỗng là thành đúng
vòng lặp connect → close(0 byte) → reconnect mà FE mô tả.

Fix: stream ghi ngay một comment frame `: connected` khi mở, trước khi vào vòng
select.

```bash
curl -sN --max-time 5 "$KONG/noti/api/v1/stream" \
  -H "Authorization: Bearer $TOKEN" -H "Accept: text/event-stream" \
  -o /dev/null -w "ttfb=%{time_starttransfer}s bytes=%{size_download}\n"
# ttfb=0.004461s bytes=13     (trước: ttfb=30.011s)
```

Contract stream sau fix:

```
: connected          <- ngay lập tức, khi mở
event: message.new   <- các frame nghiệp vụ
data: {...}

: heartbeat          <- mỗi 30s
```

**FE không phải đổi gì** — `EventSource` bỏ qua comment line. Backoff luỹ thừa
FE vừa merge cứ giữ nguyên: nó vẫn đúng cho lần đóng sạch theo
`SSE_MAX_STREAM_LIFETIME` (mặc định 45 phút, stream sẽ đóng và client tự nối
lại — đây là hành vi cố ý, không phải lỗi).

---

## #6 — Đã seed lại thời khoá biểu cho giống thật

Đúng, đó là lỗi của tool seed (BE), không phải FE. Bản cũ đổ đầy 25/25 tiết và
lấy **một** giáo viên cho mọi môn của lớp. Đã viết lại bộ xếp lịch theo đúng hai
ràng buộc có thật:

- một lớp chỉ có một tiết tại mỗi (thứ, tiết);
- một **giáo viên** không thể ở hai lớp cùng (thứ, tiết) — đây chính là thứ
  `teacher_schedule` chặn bằng LWT ở production, nên lịch seed vi phạm sẽ là dữ
  liệu không thể ghi được thật.

Mỗi môn giờ có **một tiết mỗi ngày**, ở vị trí xoay theo ngày **và** theo lớp,
nên không còn cảnh một môn chạy liền 5 tiết sáng, và hai lớp không bao giờ giành
cùng một giáo viên ở cùng tiết. 15/25 ô có tiết, phần còn lại **để trống**.

Lớp 10A1, HK1 2026-2027:

```
          MON        TUE        WED        THU        FRI
tiet1  Ngu Van          -          -       Toan  Tieng Anh
tiet2 TiengAnh    Ngu Van          -          -       Toan
tiet3     Toan  Tieng Anh    Ngu Van          -          -
tiet4        -       Toan  Tieng Anh    Ngu Van          -
tiet5        -          -       Toan  Tieng Anh    Ngu Van
```

Lịch dạy của `giaovien@demo.local` (chuyên Toán) — 5 tiết, rải đủ 5 ngày, chỉ
dạy đúng môn của mình:

```
MON tiet3 Toan · TUE tiet4 Toan · WED tiet5 Toan · THU tiet1 Toan · FRI tiet2 Toan
```

**Ba tài khoản giáo viên mới** (đúng như đề nghị), mật khẩu **giống hệt** các
acc demo hiện có:

| Email | Chuyên môn |
| --- | --- |
| `giaovien@demo.local` | Toán (10A1) |
| `giaovien2@demo.local` | Ngữ văn |
| `giaovien3@demo.local` | Tiếng Anh |
| `giaovien4@demo.local` | Toán (9A1) |

(Tool copy `password_hash` của một member sẵn có sang tài khoản mới, nên nó
không cần biết — và không hardcode — mật khẩu thật.)

Tiện thể sửa luôn điểm "không phải ask" số 2 của các bạn: **điểm năm ACTIVE giờ
không còn rỗng ở self-view của học sinh**. Không phải bug — `GetStudentGrades`
lọc `!IsReadableByStudent()`, tức HS/PH **chỉ thấy PUBLISHED/LOCKED**, mà cả kỳ
đang DRAFT nên trả `groups: []`. Seed giờ đặt trạng thái **theo từng cột**: kỳ
đang diễn ra thì các cột TX đã `PUBLISHED`, giữa kỳ/cuối kỳ còn `DRAFT` — đúng
kiểu sổ điểm đang chấm dở. Kiểm chứng:

```bash
curl -s "$KONG/core/api/v1/members/1aff4f6f-.../grades?year=2026-2027" -H "Authorization: Bearer $STUDENT"
# groups: 3 | entries: 8 | status: {'PUBLISHED'}
```

Copy "Chưa có điểm cho năm học 2026-2027" của FE vẫn nên giữ — nó đúng cho một
kỳ chưa khai giảng.

## #7 — `termName` trong học bạ: BE xin **không làm**

Các bạn cho phép trả lời "không làm", và đây là câu trả lời — kèm lý do, không
phải vì ngại:

1. **Học bạ là ảnh chụp đã niêm phong.** `academic_records` cố ý chỉ giữ những gì
   được chốt tại thời điểm seal. Denormalize `termName` vào đó nghĩa là **đóng
   băng cái tên**: admin đổi tên kỳ về sau thì học bạ sẽ hiện tên cũ mãi mãi.
   Ngược lại nếu join sống tại lúc đọc thì nó lại mâu thuẫn với chính ngữ nghĩa
   "snapshot" của bảng.
2. **Cách FE đang làm là đúng nhất.** Resolve `termId → name` từ calendar lúc
   render luôn cho ra tên **hiện tại** của kỳ, và các bạn đã để best-effort nên
   calendar chết thì học bạ vẫn hiện.
3. **Chi phí thấp.** Khác #1 (một round-trip **liên service**, từ browser, lặp
   lại mỗi lần render danh sách), #7 là **một** lệnh gọi core→core cho cả trang.

Khác biệt so với #1/#2 nằm ở chỗ đó: tên người là dữ liệu **hiển thị thuần**,
sống ở service khác, và join lại tốn một chặng mạng thật; tên học kỳ nằm ngay
trong core và chỉ tốn một lệnh gọi cho mỗi trang.

Nếu sau này màn học bạ phải render nhiều năm trong một lần tải và số lệnh gọi
calendar tăng theo, cứ mở lại ask — lúc đó BE sẽ làm một endpoint batch
`terms?ids=` thay vì denormalize vào bản ghi đã seal.

## #8 — Lỗi BE thật: middleware của group `/api/v1/tenants` phủ luôn route của context khác

Không phải cố ý, và cũng không phải chuyện phân quyền — là **rò rỉ middleware**.

Context `tenant` mount route như sau:

```go
app.Group("/api/v1/tenants", RequireAuth, RequireSuperAdmin)   // ← thủ phạm
```

Middleware của một Fiber group chạy cho **MỌI request khớp prefix**, không chỉ
route do chính group đó khai báo. Mà context `membership` lại sở hữu
`/api/v1/tenants/:id/members` và `/api/v1/tenants/:id/invitations` **dưới cùng
prefix đó**. Kết quả: cổng `RequireSuperAdmin` chặn luôn mọi lời gọi member /
invitation của tenant-admin — họ có tenant role, không có platform role.

Đây cũng là lý do endpoint batch `/api/v1/members?ids=` vẫn chạy: nó nằm ở
prefix khác (`/api/v1/members`), không dính group.

Sửa: gắn cổng vào **từng route**, không gắn vào group — cổng platform giờ chỉ
bảo vệ đúng 4 endpoint quản trị tenant. Hai test khoá hành vi lại: route lồng
đăng ký sau group **không** được kế thừa cổng, và 4 endpoint tenant **vẫn** phải
403 với người không phải SUPER_ADMIN.

```bash
curl -s "$KONG/iam/api/v1/tenants/aeb0e462-.../members?role=TEACHER&limit=100" -H "Authorization: Bearer $ADMIN_TOKEN"
# OK — 6 giáo viên: Giao Vien Demo 4, Giao Vien Demo 2, Giao Vien Demo, GV Đặng Hữu Khanh, …
```

Cùng lúc được vá: `GET/POST /tenants/{id}/invitations`, `POST /tenants/{id}/members`,
`PATCH|DELETE /tenants/{id}/members/{userId}` — tất cả đều đang 403 vì cùng nguyên nhân.

## #9 — Lỗi BE thật: nhánh admin đọc nhầm bảng khi không có `academicYear`

Đúng như các bạn mô tả, và đây là "cái bẫy khó thấy nhất" theo đúng nghĩa đen:
không lỗi, không cảnh báo, chỉ là mảng rỗng.

Nhánh admin đưa thẳng label rỗng vào `ListByYear`, mà bảng `classes_by_year`
partition theo `(tenant, năm)` — nên label `""` là một **partition hợp lệ và
rỗng**. Không có gì fail cả; kết quả chỉ đơn giản là một lời nói dối mà client
không phân biệt được với "trường chưa có lớp nào".

Chọn phương án các bạn xếp thứ nhất (thống nhất hai nhánh), vì bảng gốc
`classes` partition theo `(tenant)` — đọc toàn trường là **một partition duy
nhất**, vẫn cursor-paginate bình thường, không phải scan. Thêm
`ClassRepository.ListByTenant` và dùng nó khi không có filter.

```bash
curl -s "$KONG/core/api/v1/classes?limit=100" -H "Authorization: Bearer $ADMIN_TOKEN"
# 31 lớp: {'2022-2023': 6, '2023-2024': 6, '2024-2025': 6, '2025-2026': 7, '2026-2027': 6}

curl -s "$KONG/core/api/v1/classes?academicYear=2026-2027" -H "Authorization: Bearer $ADMIN_TOKEN"
# 6 lớp: 10A1 10A2 11A1 11A2 12A1 12A2
```

**Không truyền `academicYear` giờ mang đúng một nghĩa trên cả hai nhánh: tất cả.**
FE cứ giữ việc truyền year tường minh — nó vẫn đúng và rõ ràng hơn.
`openapi.yaml` + `INTEGRATION.md` đã ghi rõ ngữ nghĩa này.

## #10 — Đã seed cả một ngôi trường

| | Trước | Sau |
| --- | --- | --- |
| Lớp | 2 | **31** (6 lớp/năm × 5 năm học: 10/11/12 × A1/A2) |
| Học sinh | 24 | **150**, mỗi lớp **25** |
| Phụ huynh | 24 | **150**, mỗi PH gắn 1 HS |
| Giáo viên | 6 | 6, phân công GVCN/GVBM khác nhau từng lớp |
| Ghi danh | 48 | **750** (mỗi HS 1 lớp mỗi năm) |
| Ô điểm | 1.368 | **23.245** |
| Thời khoá biểu | 60 tiết | **930 tiết** |
| **Điểm danh** | 0 | **1.512** bản ghi, 14 ngày gần nhất |

Mỗi học sinh học **một lớp mỗi năm** (không còn cảnh 1 HS ở mọi lớp), nên ai
cũng có học bạ đã niêm phong cho các năm đã xong **và** điểm của năm đang chạy.
Điểm danh: đa số `PRESENT`, rải rác `LATE` / `ABSENT` / `EXCUSED_ABSENT`, chỉ
ngày trong tuần — kiểm chứng:

```bash
curl -s "$KONG/core/api/v1/classes/9f066819-.../attendance?date=2026-08-07" -H "Authorization: Bearer $ADMIN_TOKEN"
# 25 bản ghi: {'PRESENT': 22, 'LATE': 1, 'EXCUSED_ABSENT': 1, 'ABSENT': 1}
```

Về **tỉ lệ chuyên cần toàn trường**: vẫn **chưa có endpoint tổng hợp**. Dữ liệu
thô đã có (`GET /classes/{id}/attendance?date=` cho từng lớp), nên FE có thể cộng
theo lớp nếu cần, nhưng BE khuyên **cứ giữ dấu "—"** cho tới khi có endpoint
rollup thật — cộng ở client trên 31 lớp là 31 lượt gọi cho một con số. Nếu ô đó
quan trọng cho bản demo, mở ask riêng, BE sẽ làm
`GET /api/v1/attendance/summary?date=`.

Cỡ trường điều chỉnh được khi seed:

```bash
STUDENTS_PER_CLASS=30 ATTENDANCE_DAYS=30 TENANT_ID=aeb0e462-... go run ./cmd/seeddemo
```

## #11 — Endpoint đọc consent: chưa từng có, giờ đã có

405 là đúng thực tế: route `/parent-student-links/consents` chỉ đăng ký `POST`
(grant) và `DELETE` (revoke) — **chưa bao giờ có `GET`**. Không phải sai đường
dẫn hay sai động từ; phần đọc đơn giản là thiếu.

Đã thêm `GET /api/v1/parent-student-links/consents`, địa chỉ bằng **query
param** (không phải body — GET kèm body không phải proxy nào cũng forward):

```bash
curl -s "$KONG/core/api/v1/parent-student-links/consents?parentMemberId=fb675f69-…&studentMemberId=fc1cbceb-…" \
  -H "Authorization: Bearer $PARENT_TOKEN"
# {"success":true,"data":{"parentMemberId":"fb675f69-…","studentMemberId":"fc1cbceb-…",
#   "category":"CONDUCT_NOTIFICATION","status":"GRANTED",
#   "method":"ADMIN_RECORDED_PAPER_FORM","recordedBy":"1e821c2b-…",
#   "grantedAt":"2026-08-09T06:25:01Z","revokedAt":null}}
```

Ba điều cần biết:

1. **Phụ huynh đọc được consent của chính mình.** Quyền ở đây **rộng hơn**
   grant/revoke một cách có chủ ý: ghi nhận consent vẫn là việc của ADMIN (nó
   phản ánh tờ giấy đã ký), nhưng người mà bản ghi nói về phải xem được — nếu
   không thì đó là ghi chú riêng, không phải sổ đăng ký. Staff đọc mọi cặp;
   PARENT chỉ đọc cặp của mình (đã verify: đọc cặp người khác → **403**).
2. **Chưa ghi nhận = `404 PARENTLINK_CONSENT_NOT_FOUND`**, không phải 200 rỗng.
   "Chưa từng có consent" và "có nhưng đã REVOKED" là hai trạng thái khác nhau,
   FE hành xử khác nhau ở mỗi cái. Đã verify cả hai nhánh.
3. **Không có API liệt kê consent của một phụ huynh.** Bảng khoá
   `((tenant, parent, student, category))` nên liệt kê = quét bảng. Phụ huynh có
   N con thì gọi N lần — với `category` chỉ có một giá trị ở v1, đây là N point
   read rất rẻ.

Ghi consent (`POST`/`DELETE`) **vẫn chỉ ADMIN** — không đổi. Nếu màn Hồ sơ định
cho phụ huynh **tự bật/tắt**, đó là thay đổi chính sách (ADR 0075 nói rõ MVP
không có self-service), cần mở ask riêng chứ BE không tự nới.

## #12 — `me` không tồn tại (spec cũ sai), và đã có `studentName`

**Về `me`:** xác nhận — core **không hỗ trợ alias `me` ở bất kỳ đâu**, không
riêng endpoint này. `openapi.yaml` vốn đã khai `memberId` là `format: uuid`, tức
spec BE chưa từng hứa có `me`; tài liệu US-E20.2 INT-001 của FE mới là chỗ sai.
Đã ghi thẳng điều đó vào mô tả tham số dùng chung để không ai đọc nhầm lần nữa:

> UUID of the member. A literal `me` alias is NOT supported anywhere in core —
> read the member id from the `memberId` token claim and send it.

(IAM thì có `/api/v1/members/me/tenants` — đó là IAM, không phải core. Khác biệt
này là nguồn nhầm lẫn, nên FE cứ theo openapi của từng service.)

**Về shape:** wrapper `{ "links": [...] }` với khoá `studentMemberId` là **đúng
như openapi đã mô tả từ đầu** — không phải drift, DTO cũ của FE mới lệch.

**Về tên con:** đã thêm, cùng cơ chế ask #1 — **một** lệnh gọi `DisplayNames` cho
cả danh sách:

```json
{ "links": [
  { "linkId": "7633e5a6-…", "studentMemberId": "fc1cbceb-…",
    "classId": "97bba43f-…", "className": "12A2",
    "studentName": "Hoàng Thanh Oanh" } ] }
```

`studentName` **best-effort** và **omitempty** (vắng mặt, không phải null — khớp
với `classId`/`className` cùng struct): IAM lỗi thì tên biến mất còn danh sách
con vẫn trả — danh sách là thứ phụ huynh dùng để điều hướng.

Việc này **đảo lại** ghi chú của US-148 ("core never duplicates IAM name data").
Lý do: resolve nhãn lúc đọc thì **không lưu gì cả**, và đó đúng là pattern context
`class` đang chạy (`homeroomTeacherName` US-173, `displayName` ask #1). Bắt mọi
client gọi thêm một chặng liên service cho 1-3 cái tên, trên màn phụ huynh mở
đầu tiên, là đánh đổi tệ hơn. Comment trong DTO ghi lại việc đảo quyết định thay
vì lặng lẽ mâu thuẫn với nó.

## #13 — Đã seed conduct/kỷ luật, và một cảnh báo trước khi un-mock

**Đã seed** (tenant demo, chạy lại được bằng `seeddemo`):

| Bảng | Số lượng | Trạng thái |
| --- | --- | --- |
| Điểm hạnh kiểm | **1.350** | kỳ đã xong = `APPROVED`; kỳ đang chạy = trộn `DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED` |
| Vi phạm học sinh | **318** | đủ 4 trạng thái × 3 mức `MINOR`/`MODERATE`/`SEVERE` |
| Đơn xin nghỉ | **150** | `APPROVED` / `SUBMITTED` / `DRAFT` |
| Bản ghi vắng mặt | **150** | `RECORDED` + `FLAGGED_UNEXCUSED` |
| Nhận xét cán bộ (staff notes) | 6 | đủ 4 trạng thái × 3 rating |
| Vi phạm cán bộ | 3 | `APPROVED` |

Kiểm chứng bằng token ADMIN, lớp 12A2, HK1 2026-2027:

```
violations    : 25 | {'APPROVED': 7, 'DRAFT': 6, 'REJECTED': 6, 'SUBMITTED': 6}
conduct-grades: 25 | {'APPROVED': 7, 'SUBMITTED': 6, 'DRAFT': 6, 'REJECTED': 6}
leave (lớp)   : 27 | {'APPROVED': 9, 'DRAFT': 9, 'SUBMITTED': 9}
```

Phủ **100% học sinh của năm đang chạy**, năm cũ thưa hơn (mỗi 4 học sinh) —
có chủ ý: client đọc các list này **theo từng con**, nên phủ thưa nghĩa là việc
màn có dữ liệu hay không phụ thuộc vào việc tài khoản demo được gắn với đứa trẻ
nào. Phủ kín năm đang demo bỏ hẳn cái xổ số đó.

### ⚠️ Trước khi mở US un-mock: PARENT **không bao giờ** thấy vi phạm

Ba endpoint trả 200 cho PARENT, nhưng **không đồng nhất** về phạm vi. Đã kiểm
bằng token phụ huynh thật, cùng lớp, cùng kỳ, ngay sau khi seed:

| Endpoint | PARENT thấy gì | Vì sao |
| --- | --- | --- |
| `student-conduct-grades` | ✅ **2** (đúng 2 con) | có nhánh `listForParent` thật |
| `student-leave-requests` | ✅ **1** | check `IsLinked(parent, student)` |
| `student-violations` | ❌ **0 — LUÔN LUÔN** | so `studentMemberId == memberId của chính người gọi` |

Đây **không phải thiếu dữ liệu** và cũng **không phải lỗ hổng** — nó là phạm vi
bị descope ở US-070, ghi thẳng trong code:

```go
// PARENT linked-child visibility is descoped in US-070 (no ParentStudentLink
// lookup): a PARENT therefore sees only records whose studentMemberId matches
// their own id, which is the safe, no-consent default.
func ownRecord(r *entity.StudentViolationRecord, actorMemberID string) bool {
	return r.StudentMemberID().String() == actorMemberID
}
```

Nghĩa là màn **kỷ luật của phụ huynh không un-mock được từ endpoint này** — dù
seed bao nhiêu cũng vẫn rỗng. Un-mock ngay bây giờ sẽ biến "mock đẹp" thành
"trống vĩnh viễn", đúng thứ các bạn muốn tránh.

**Khuyến nghị chia US un-mock làm hai:**

1. **Làm ngay:** màn GV chủ nhiệm + BGH (vi phạm, hạnh kiểm, duyệt đơn nghỉ) —
   dữ liệu đầy đủ, đủ 4 trạng thái để test luồng duyệt/từ chối.
2. **Chờ quyết định:** màn phụ huynh xem vi phạm của con. Mở rộng phạm vi này là
   **đổi chính sách phân quyền trên dữ liệu kỷ luật của trẻ vị thành niên**, và
   hạ tầng cho nó đã có sẵn — bảng consent có đúng category
   `CONDUCT_NOTIFICATION`. Thiết kế đúng gần như chắc chắn là: *phụ huynh thấy
   vi phạm đã `APPROVED` của con mình, khi consent `GRANTED`*. BE **không tự nới**
   — cần một ask/ADR riêng, cùng nhóm quyết định với #11.

Ghi chú thêm: hạnh kiểm và đơn nghỉ **đã** cho phụ huynh xem mà **không** kiểm
consent. Sự không nhất quán giữa ba endpoint này nên được chốt một lần trong
cùng quyết định đó, thay vì vá lẻ từng cái.

### Xác nhận RBAC như các bạn hỏi

PARENT gọi `student-violations` / `student-conduct-grades` với `classId` của con
là **hợp lệ và cố ý** (200, không phải lỗ hổng). Điều khác nhau là *nội dung*:
hạnh kiểm lọc theo con, vi phạm lọc theo chính người gọi nên luôn rỗng. Không có
đường nào để phụ huynh đọc dữ liệu của trẻ khác qua các endpoint này.

## Hai điểm "không phải ask"

1. **Không kỳ nào phủ hôm nay — ĐÃ SỬA.** HK1 2026-2027 nay là
   **`2026-08-01 → 2026-12-31`**, tức phủ ngày hôm nay. Dời qua API chính thức
   (`PATCH /academic-years/{yearId}/terms/{termId}`, ADMIN) chứ không sửa DB tay;
   use case tự kiểm tra chồng lấn với các kỳ khác. **`term_id` không đổi**, nên
   toàn bộ TKB / điểm / học bạ / hạnh kiểm giữ nguyên — không phải seed lại gì.
   Rule "term gần nhất chưa kết thúc" của FE vẫn đúng và bền hơn, **cứ giữ**.
2. **`GET /core/api/v1/terms` 404** — xác nhận: route phẳng **cố ý không có**.
   Term luôn nằm dưới `/api/v1/academic-years/{yearId}/terms` vì nó là con của
   năm học (partition key là `(tenant_id, academic_year_id)`, không có cách đọc
   toàn tenant mà không quét bảng). FE đang dùng đúng route, không phải đổi.

## Tổng kết dữ liệu demo (2026-08-09)

Xem bảng chi tiết ở #10. Tài khoản mới dùng **cùng mật khẩu** với các acc demo
sẵn có, email theo mẫu `hocsinh<N>@demo.local`, `phuhuynh<N>@demo.local`,
`giaovien<N>@demo.local`; tên hiển thị là tên Việt tổng hợp (Nguyễn Văn An,
Trần Thị Mai…) — bảng 25 dòng chỉ đọc được khi tên trông giống tên thật.

Câu chuyện dữ liệu: **các năm đã kết thúc** = điểm `LOCKED` + học bạ `SEALED` +
hạnh kiểm `APPROVED`; **2026-2027 (đang diễn ra, HK1 phủ hôm nay)** = TKB đầy
đủ, cột TX `PUBLISHED`, giữa kỳ/cuối kỳ `DRAFT`, điểm danh 14 ngày gần nhất.

Tool bơm nằm ở `edu-api`: `services/core/cmd/seeddemo` — idempotent, dọn cả dữ
liệu rác của chính nó (lớp trùng, ghi danh thừa, TKB cũ):

```bash
cd services/core
TENANT_ID=aeb0e462-9ced-48b3-ba36-803f9266b09d go run ./cmd/seeddemo
```

Biến điều chỉnh: `STUDENTS_PER_CLASS` (25), `TEACHER_COUNT`, `ATTENDANCE_DAYS`
(14), `STUDENT_COUNT`. Tất cả là **tổng số mong muốn**, không phải số thêm vào.

**Lưu ý cho ai chạy stack local:** `homeroomTeacherName` và `displayName` chỉ có
giá trị khi `INTERNAL_API_SECRET` được set cho cả `iam` lẫn `core` — đã có sẵn
trong `docker/.env` của edu-api (xem `.env.example`). Thiếu nó thì hai field về
`null` chứ không lỗi.
