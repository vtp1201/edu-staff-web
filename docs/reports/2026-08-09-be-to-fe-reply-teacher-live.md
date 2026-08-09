# BE → FE (2026-08-09): trả lời 5 ask từ smoke-test role TEACHER

> Trả lời cho `2026-08-09-fe-to-be-asks-teacher-live.md`.
> **Cả 5 ask đã xử lý xong** — 4 fix + 1 xác nhận contract. Toàn bộ verify lại
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

## Hai điểm "không phải ask"

1. **Không kỳ nào phủ hôm nay** — BE **chưa đổi**, và đây là lựa chọn có chủ ý:
   `start_date` là clustering key của bảng `terms`, nên dời ngày = DELETE + INSERT
   lại row, tức xoá dữ liệu đang có của tenant demo. Rule resolve mới của FE
   ("term gần nhất chưa kết thúc") đúng và bền hơn — **giữ nguyên nó**. Nếu team
   muốn demo có kỳ hiện tại thật, nói một tiếng, BE sẽ dời HK1 2026-2027 về
   `2026-08-01 → 2026-12-31` (term_id không đổi nên TKB/điểm/học bạ giữ nguyên).
2. **`GET /core/api/v1/terms` 404** — xác nhận: route phẳng **cố ý không có**.
   Term luôn nằm dưới `/api/v1/academic-years/{yearId}/terms` vì nó là con của
   năm học (partition key là `(tenant_id, academic_year_id)`, không có cách đọc
   toàn tenant mà không quét bảng). FE đang dùng đúng route, không phải đổi.

## Dữ liệu demo đã được bơm đầy (2026-08-09)

Tiện thể: tenant demo trước đó rất mỏng (9 tiết TKB, 22 ô điểm, 0 học bạ,
0 vi phạm). Đã bơm đầy để test đủ mọi màn:

| | Trước | Sau |
| --- | --- | --- |
| Thời khoá biểu | 9 tiết | 100 tiết (2 lớp × 2 kỳ × 5 ngày × 5 tiết, có phòng học) |
| Bảng điểm | 22 ô, 1 môn | 114 ô, đủ 3 môn × mọi kỳ × mọi HS |
| Học bạ | 0 | 8 (4 `SEALED` có `gradeSnapshot`, 4 `PENDING`) |
| Hạnh kiểm | 2 (giá trị sai `GOOD`/`AVERAGE`) | 6, chuẩn hoá `TOT`/`KHA` |
| Vi phạm | 0 | 4 |
| Phân công GVBM | 1 | 4 (+6 dòng subject-teacher) |

Câu chuyện dữ liệu: **9A1 (2025-2026, đã kết thúc)** = điểm `LOCKED` + học bạ
`SEALED` + hạnh kiểm `APPROVED`; **10A1 (2026-2027, ACTIVE)** = TKB đầy đủ, điểm
`DRAFT`. Tool bơm nằm ở `edu-api`: `services/core/cmd/seeddemo`
(`TENANT_ID=aeb0e462-... go run ./cmd/seeddemo`, idempotent, không xoá gì).

**Lưu ý cho ai chạy stack local:** `homeroomTeacherName` và `displayName` chỉ có
giá trị khi `INTERNAL_API_SECRET` được set cho cả `iam` lẫn `core` — đã có sẵn
trong `docker/.env` của edu-api (xem `.env.example`). Thiếu nó thì hai field về
`null` chứ không lỗi.
