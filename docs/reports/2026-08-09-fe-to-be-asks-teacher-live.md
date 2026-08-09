# FE → BE (2026-08-09): 13 ask từ smoke-test TEACHER + PRINCIPAL + PARENT trên stack thật

> Bối cảnh: chạy `edu-staff-web` với `NEXT_PUBLIC_USE_MOCK=false` qua Kong
> `localhost:8000`, tài khoản `giaovien@demo.local`, tenant
> `aeb0e462-9ced-48b3-ba36-803f9266b09d`. Toàn bộ evidence dưới đây là curl
> thật, chạy 2026-08-09.
>
> **Tin tốt trước:** ask cũ *"IAM không mint `memberId` vào token tenant-scoped"*
> (`2026-08-02-fe-to-be-missing-memberid-claim.md`) đã **ĐÓNG** — token sau
> `POST /iam/api/v1/members/switch-tenant` giờ có `memberId` + `memberRoles`,
> và mọi endpoint core nhánh TEACHER trả 200 (không còn 403 `CLASS_FORBIDDEN`).
> Cảm ơn BE. FE đã đổi mọi chỗ đọc `sub` sang đọc `memberId` (xem ask #3).

## #1 — `GET /core/api/v1/classes/{classId}/students` không trả tên học sinh

`EnrollmentResponse` chỉ có id, nên MỌI màn hình hiển thị danh sách học sinh
(điểm danh, tab "Học sinh" của giáo viên, sổ điểm) nhận về id thô:

```bash
curl -s "$KONG/core/api/v1/classes/59db9632-.../students" -H "Authorization: Bearer $TOKEN"
# {"success":true,"data":[
#   {"enrollmentId":"e3d3191a-...","classId":"59db9632-...",
#    "studentMemberId":"1aff4f6f-b125-4903-8639-c1f1bc597ab9",
#    "academicYearLabel":"2026-2027","enrolledAt":"..."}, ...]}
#   ^ không có displayName
```

**FE đã tự xử lý** (không chờ BE): mỗi màn giờ gọi thêm một lượt batch
`GET /iam/api/v1/members?ids=<csv>` để decorate tên — đúng pattern
`admin-roster` đã dùng từ US-E18.35. Nên đây **không phải blocker**, nhưng nó
là 1 round-trip cross-service thừa trên mọi lần render danh sách lớp.

**Ask:** BE project `displayName` vào `EnrollmentResponse` (giống cách
`ClassResponse` đã có sẵn field `homeroomTeacherName`). Nếu BE quyết định
không làm (student name thuộc IAM, core không nên cache), **trả lời "không
làm" cũng đủ** — FE giữ nguyên lượt IAM và sẽ đóng ask.

## #2 — `ClassResponse.homeroomTeacherName` luôn `null`

Field đã có trên wire nhưng không được populate:

```bash
curl -s "$KONG/core/api/v1/classes" -H "Authorization: Bearer $TOKEN"
# {"classId":"59db9632-...","name":"10A1","gradeLevel":10,
#  "academicYearLabel":"2026-2027","status":"ACTIVE","studentCount":2,
#  "homeroomTeacherId":"68f65162-...","homeroomTeacherName":null}
#                                     ^ luôn null
```

Cùng bản chất với #1 (core giữ id, tên nằm ở IAM). Ask: hoặc populate, hoặc
xác nhận field này là dead → BE bỏ khỏi contract để FE không hiểu nhầm là
"BE sẽ trả, chỉ đang thiếu data".

## #3 — Xác nhận quan hệ `memberId` ↔ `userId` (contract, không phải bug)

Trên seed hiện tại hai giá trị **bằng nhau**:

```
token claims: userId = 68f65162-cdb6-4801-b354-855a86dbb717
              memberId = 68f65162-cdb6-4801-b354-855a86dbb717
core:         homeroomTeacherId = 68f65162-... (khớp cả hai)
```

FE đã sửa để so khớp mọi resource của core theo **`memberId`** (không phải
`sub`/`userId`) — nếu hai id này trùng nhau chỉ vì cách seed, code cũ (so theo
`sub`) sẽ **âm thầm sai** trên dữ liệu thật: giáo viên mất sạch lớp GVCN mà
không có lỗi nào hiện ra.

**Ask:** xác nhận bằng một câu — `memberId` là id RIÊNG của membership
(user × tenant) và **có thể khác** `userId`, đúng không? Nếu đúng thì mọi
`*MemberId` của core (`homeroomTeacherId`, `studentMemberId`,
`teacherMemberId`, `authorMemberId`) đều là member id, không phải user id —
FE sẽ ghi thành ADR để không ai đọc nhầm `sub` lần nữa.

## #4 — `GET /noti/api/v1/notifications/unread-count` trả 500

Phát hiện khi wire badge "chưa đọc" trên chuông ở header (gọi trên MỌI trang,
mọi role):

```bash
curl -s "$KONG/noti/api/v1/notifications/unread-count" -H "Authorization: Bearer $TOKEN"
# {"success":false,"data":null,
#  "error":{"code":"INTERNAL_SERVER_ERROR","message":"An internal error occurred",
#           "retryable":false},"meta":{"requestId":"297ef3c9-..."}}
```

Token cùng phiên vẫn gọi được core/iam bình thường (xem bảng cuối), nên không
phải vấn đề auth. FE fail-safe về `0` (chuông không hiện badge) nên không vỡ
giao diện, nhưng badge sẽ luôn trống tới khi BE sửa.

**Ask:** BE trace `requestId` ở trên trong log `noti` và cho biết đây là lỗi
hạ tầng (thiếu bảng/migration của noti trên môi trường demo) hay lỗi code.

## #5 — `GET /noti/api/v1/stream` đóng kết nối ngay, không gửi byte nào

Nghiêm trọng hơn #4 vì nó tạo **vòng lặp request vô hạn**: browser mở
`EventSource`, upstream nhận rồi đóng sau 1–3 giây với **0 byte** (không frame,
không comment keep-alive, không `retry:`), `EventSource` coi đó là mất kết nối
và mở lại → lặp mãi trên mọi tab đang mở.

```bash
for i in 1 2; do
  curl -sN --max-time 20 -o /dev/null \
    -w "conn=%{time_starttransfer}s total=%{time_total}s bytes=%{size_download}\n" \
    "$KONG/noti/api/v1/stream?tenant=aeb0e462-..." \
    -H "Authorization: Bearer $TOKEN" -H "Accept: text/event-stream"
done
# conn=1.019965s total=1.019982s bytes=0
# conn=3.109726s total=3.122911s bytes=0
```

Header trả về đúng (`200`, `Content-Type: text/event-stream`,
`X-Kong-Upstream-Latency: 3013`), nên vấn đề nằm ở `noti` chứ không phải Kong.

**FE đã giảm đau** (merge cùng ngày): reconnect đổi từ cố định 4s sang backoff
luỹ thừa 4s → 8s → 16s … trần 60s, reset khi `open` thành công. Vòng lặp vẫn
còn nhưng giãn còn 1 lần/phút thay vì 15 lần/phút mỗi tab.

**Ask:** `noti` giữ stream mở và phát ít nhất một comment keep-alive định kỳ
(`: ping\n\n` mỗi ~15–30s) như SSE thường làm. Nếu stream cố tình đóng khi
không có subscriber, xin cho biết để FE chuyển hẳn sang polling.

## #6 — Seed lịch dạy phi thực tế: 1 giáo viên dạy TẤT CẢ tiết của 1 lớp

`GET /core/api/v1/members/{teacherMemberId}/timetable?termId=` trả **25 slot**:
Thứ 2→Thứ 6, tiết 1→5, tất cả đều lớp 10A1, phòng P.201, và cả ba môn
(Toán / Ngữ văn / Tiếng Anh) đều do **cùng một** `teacherMemberId`.

```
MON 1 Ngu Van 59db9632 P.201     MON 2 Tieng Anh 59db9632 P.201
MON 3 Toan   59db9632 P.201     MON 4 Ngu Van   59db9632 P.201 …
```

FE render đúng những gì BE trả (đã đối chiếu từng slot), nên đây **không phải
bug FE** — nhưng nó làm màn "Lịch dạy" trông sai và không demo được các case
thật (giáo viên dạy nhiều lớp, có tiết trống, môn khác nhau khác GV).

**Ask:** seed lại thời khoá biểu demo cho giống thực tế — mỗi GV chỉ dạy môn
mình phụ trách, xen kẽ nhiều lớp, có tiết trống. Nếu tiện, thêm 2–3 tài khoản
giáo viên nữa (hiện chỉ có `giaovien@demo.local`) để test màn phân công.

## #7 — Học bạ: `AcademicRecordResponse` không có tên học kỳ (đang lộ uuid)

`GET /core/api/v1/members/{id}/academic-records` trả `termId` là uuid và không
có `termName`, nên tiêu đề từng khối trong màn Học bạ hiện thẳng
`85823bdd-6fa1-4685-b4fc-408cde4641a8`.

**FE đã tự xử lý:** resolve `termId → name` từ `GET /academic-years/{id}/terms`
(best-effort — calendar lỗi thì học bạ vẫn render, chỉ mất nhãn). Cùng bản chất
với ask #1/#2: core giữ id, tên nằm ở aggregate khác.

**Ask (tuỳ chọn):** denormalize `termName` (+ `academicYearLabel` đã có) vào
`AcademicRecordResponse` để bỏ thêm một lượt gọi calendar. Trả lời "không làm"
cũng đủ để FE đóng ask.

## #8 — `GET /iam/api/v1/tenants/{id}/members` FORBIDDEN cho member role `ADMIN`

Tài khoản `hieutruong@demo.local` có `memberRoles: ["ADMIN"]` (đúng tier hiệu
trưởng), nhưng không đọc được danh bạ thành viên của chính tenant mình:

```bash
curl -s "$KONG/iam/api/v1/tenants/aeb0e462-.../members?role=TEACHER&limit=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# {"success":false,"error":{"code":"FORBIDDEN_ACTION",
#  "message":"You do not have permission to perform this action"}}
```

Trong khi endpoint batch **lại cho phép** cùng token đó:

```bash
curl -s "$KONG/iam/api/v1/members?ids=1e821c2b-..." -H "Authorization: Bearer $ADMIN_TOKEN"
# {"success":true,"data":[{"memberId":"1e821c2b-...","displayName":"Admin Demo",
#   "email":"hieutruong@demo.local","roles":["ADMIN"]}]}
```

Hệ quả: màn **Giáo viên** (`/principal/teachers`) hiện "Bạn không có quyền truy
cập" — nó đọc danh bạ IAM lọc `role=TEACHER` (US-E18.40, chính là phương án
BE chọn khi đóng ask #44). Ô "Giáo viên" trên Tổng quan cũng không có nguồn.

**Ask:** cho member role `ADMIN` (và `MANAGER`) đọc `GET /tenants/{id}/members`
trong tenant của chính họ. Nếu chỉ `SUPER_ADMIN` được phép là cố ý, xin nói rõ —
khi đó FE cần một endpoint khác để liệt kê giáo viên, vì không có cách nào lấy
danh sách member nếu không biết trước id.

## #9 — `GET /core/api/v1/classes` trả RỖNG cho caller admin-tier khi thiếu `academicYear`

Cùng tenant, cùng thời điểm — chỉ khác role:

```bash
# TEACHER (tự lọc theo phân công): 2 lớp
curl -s "$KONG/core/api/v1/classes" -H "Authorization: Bearer $TEACHER_TOKEN"   # → 2 rows

# ADMIN: rỗng khi KHÔNG truyền academicYear …
curl -s "$KONG/core/api/v1/classes" -H "Authorization: Bearer $ADMIN_TOKEN"     # → data: []
# … nhưng có dữ liệu khi truyền
curl -s "$KONG/core/api/v1/classes?academicYear=2026-2027" -H "…$ADMIN_TOKEN"   # → 10A1
```

Đây là lý do gốc khiến gần như MỌI màn của hiệu trưởng trống (Học sinh, Sổ đầu
bài, Bảng điểm, Lớp học): FE gọi `listClasses({})` như tài liệu cho phép
(`academicYear` optional) và nhận về rỗng — không lỗi, không cảnh báo.

**FE đã tự xử lý:** mọi màn "năm hiện tại" giờ truyền `academicYear` tường minh.

**Ask:** thống nhất hành vi giữa hai nhánh — hoặc nhánh admin cũng trả tất cả
khi thiếu filter (giống nhánh teacher), hoặc `academicYear` thành **bắt buộc**
và thiếu thì trả `400` thay vì rỗng im lặng. Trạng thái hiện tại là cái bẫy khó
thấy nhất trong ba lựa chọn.

## #10 — Thiếu dữ liệu demo cho vai trò hiệu trưởng

Với seed hiện tại, trường demo có **1 lớp** (10A1), **2 học sinh**, **1 giáo
viên**. Các màn quản trị vì thế đúng-mà-trống, không demo được gì:

- Tổng quan: Lớp 1 / Học sinh 2 (số thật, FE đã bỏ số giả 48/1.240/96,4% trước đó).
- Không có nguồn cho ô "Giáo viên" (chặn bởi #8) và "Tỉ lệ chuyên cần" (không có
  endpoint tổng hợp nào — FE đang để dấu "—" thay vì bịa số).

**Ask:** seed thêm cho tenant demo — khoảng 6–10 lớp trải 2–3 khối, 20–30 học
sinh/lớp, 5–8 giáo viên có phân công GVCN/GVBM khác nhau, cộng điểm danh vài
ngày gần đây. Nếu có endpoint tổng hợp tỉ lệ chuyên cần theo trường/ngày thì
càng tốt; chưa có thì FE giữ dấu "—".

## #11 — `GET /core/api/v1/parent-student-links/consents` trả 405

Endpoint đọc consent của phụ huynh (INT-002 trong spec US-E20.2) không nhận
`GET`:

```bash
curl -s "$KONG/core/api/v1/parent-student-links/consents" -H "Authorization: Bearer $PARENT_TOKEN"
# 405 {"error":{"code":"METHOD_NOT_ALLOWED", …}}
curl -s "$KONG/core/api/v1/members/{parentMemberId}/consents" -H "…"   # 404
```

Hệ quả trước khi FE vá: màn **"Con của tôi"** chết theo — nó dùng chung use-case
"linked students + consents", nên consents lỗi là cả danh sách con biến mất.
FE đã tách: màn danh sách con giờ chỉ đọc linked-students (nó vốn không hiển thị
consent). Nhưng **phần chỉnh consent trong Hồ sơ** vẫn chưa có nguồn.

**Ask:** xác nhận đường dẫn/động từ đúng của read + update consent (hoặc cho
biết endpoint chưa làm, để FE giữ mock cho riêng phần đó).

## #12 — `GET /members/{id}/linked-students` không nhận alias `me`, và không trả tên con

Hai điểm FE đã sửa nhưng nên ghi lại vì spec cũ nói khác:

1. `GET /core/api/v1/members/me/linked-students` → `PARENTLINK_FORBIDDEN`.
   Alias `me` (spec US-E20.2 INT-001 mô tả "server tự resolve memberId") KHÔNG
   tồn tại; phải truyền memberId thật. FE trước đây gửi `me` nên phụ huynh nhận
   thông báo "Bạn không có quyền xem danh sách này" — một lỗi 403 giả.
2. Response là **object bọc** `{ "links": [...] }` với khoá `studentMemberId`,
   **không** phải mảng phẳng `{studentId, fullName}` như DTO cũ của FE, và
   **không có tên học sinh** → FE decorate bằng `GET /iam/api/v1/members?ids=`
   (hoạt động tốt với token PARENT, cảm ơn ADR-0120).

**Ask (nhỏ):** cập nhật `openapi.yaml` cho khớp thực tế (không có `me`, có
wrapper `links`), và cân nhắc kèm `studentName` như ask #1.

## #13 — Conduct/discipline: blocker đã GỠ, nhưng chưa có dữ liệu

Cả cụm hạnh kiểm/kỷ luật của FE đang **force-mock vĩnh viễn** (`discipline.di.ts`,
US-E18.14) vì hai blocker được ghi trong story: (1) không tra được UUID học sinh
và (2) STUDENT/PARENT không có cách nào biết `classId` của mình để gọi list
(ask #15/#22).

**Cả hai giờ đã hết:** `linked-students` trả kèm `classId`/`className` (US-148)
và `/members/{id}/enrollment` trả lớp của học sinh. Verify bằng token PARENT thật:

```bash
GET /core/api/v1/conduct/student-violations?classId=97bba43f-…        → 200 data: []
GET /core/api/v1/conduct/student-conduct-grades?classId=…&termId=…    → 200 data: []
GET /core/api/v1/conduct/student-leave-requests?studentMemberId=…     → 200 data: []
```

Nghĩa là FE **có thể** un-mock cụm này (một US wiring riêng, không phải sửa vặt) —
nhưng với dữ liệu hiện tại thì cả 3 màn sẽ chỉ đổi từ "mock đẹp" sang "trống".

**Ask:** seed dữ liệu hạnh kiểm/kỷ luật cho tenant demo — vài vi phạm ở các mức
độ khác nhau (đủ trạng thái DRAFT/SUBMITTED/APPROVED/REJECTED), điểm hạnh kiểm
theo học kỳ cho học sinh của lớp demo, và vài đơn xin nghỉ. Có dữ liệu rồi FE
sẽ mở US un-mock (đóng luôn ask #15/#22).

Cũng xin xác nhận: PARENT có được gọi `student-conduct-grades`/`student-violations`
với `classId` của **con mình** một cách chính thức không (hiện trả 200 — muốn
chắc đó là RBAC cố ý chứ không phải lỗ hổng).

## Không phải ask — 2 điểm dữ liệu/seed để BE biết

1. **Không có học kỳ nào phủ ngày hôm nay.** Năm học ACTIVE `2026-2027` có
   HK1 `2026-09-01 → 2027-01-15`; hôm nay `2026-08-09` rơi ngoài mọi window,
   nên mọi endpoint timetable (bắt buộc `termId`) không có term để gọi và màn
   "Lịch dạy" báo lỗi tải. FE đã đổi rule resolve: không còn "term chứa ngày
   hôm nay" mà là **term gần nhất chưa kết thúc** (rơi ngoài → hiện lịch của
   kỳ sắp tới), nên màn đã chạy. Nêu ở đây phòng khi BE muốn seed lại năm học
   cho khớp thời gian demo.
2. **Điểm cho năm học ACTIVE chưa được seed**: `GET /members/{id}/grades?year=2026-2027`
   trả `groups: []` trong khi `?year=2025-2026` có dữ liệu. Màn "Bảng điểm" của
   học sinh khoá theo năm ACTIVE (đúng design — xem năm cũ là màn Học bạ) nên
   hiện empty. FE đã đổi copy để nói rõ "Chưa có điểm cho năm học 2026-2027".
   Sheet của giáo viên (`/classes/{c}/subjects/{s}/terms/{t}/grades?year=`) thì
   CÓ dữ liệu cho 2026-2027 — chỉ luồng self-view của học sinh là trống.
3. **`GET /core/api/v1/terms` trả 404** (chỉ có
   `/core/api/v1/academic-years/{yearId}/terms`, FE đang dùng route này —
   không cần đổi). Nêu ra chỉ để BE xác nhận route phẳng là cố ý không có.

## Đã kiểm chứng OK (không cần BE làm gì)

| Endpoint | Kết quả |
| --- | --- |
| `POST /iam/api/v1/auth/signin` + `/members/switch-tenant` (`clientId=edu-web`) | 200, token có `memberId`/`memberRoles`/`tenantId` |
| `GET /core/api/v1/classes` (TEACHER) | 200, auto-filter đúng lớp của GV |
| `GET /core/api/v1/classes/{id}/students` | 200 (thiếu tên — ask #1) |
| `GET /core/api/v1/classes/{id}/attendance?date=` | 200, `records: []` khi chưa điểm danh (đúng; FE nay tự dựng roster từ danh sách HS thay vì render rỗng) |
| `GET /core/api/v1/classes/{id}/homeroom-entries` | 200, có data seed |
| `GET /core/api/v1/members/{memberId}/timetable?termId=` | 200, có slot |
| `GET /iam/api/v1/members?ids=` (caller TEACHER) | 200, trả `displayName` |
| Kong routes `core`/`lms`/`noti`/`social` | đã cấu hình đủ |
