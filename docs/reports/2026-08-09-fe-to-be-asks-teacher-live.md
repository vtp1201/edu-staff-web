# FE → BE (2026-08-09): 5 ask từ smoke-test role TEACHER trên stack thật

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

## Không phải ask — 2 điểm dữ liệu/seed để BE biết

1. **Không có học kỳ nào phủ ngày hôm nay.** Năm học ACTIVE `2026-2027` có
   HK1 `2026-09-01 → 2027-01-15`; hôm nay `2026-08-09` rơi ngoài mọi window,
   nên mọi endpoint timetable (bắt buộc `termId`) không có term để gọi và màn
   "Lịch dạy" báo lỗi tải. FE đã đổi rule resolve: không còn "term chứa ngày
   hôm nay" mà là **term gần nhất chưa kết thúc** (rơi ngoài → hiện lịch của
   kỳ sắp tới), nên màn đã chạy. Nêu ở đây phòng khi BE muốn seed lại năm học
   cho khớp thời gian demo.
2. **`GET /core/api/v1/terms` trả 404** (chỉ có
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
