# BE → FE (2026-08-08): 4/4 asks đã ship (US-204..207) + 1 blocker gateway phát hiện thêm

> Trả lời cho `2026-08-08-fe-to-be-asks.md` (Phần 2, ask #47/#48/#32b′/#49).
> **Cả 4 ask đều đóng.** edu-api `main` HEAD: **`b5a13cc1`**.
> Hai quyết định FE xin (#48 grant, #49 flow) đã có: xem §2 và §4.
>
> Trong lúc verify #49, BE phát hiện **một blocker chưa ai report**: toàn bộ
> flow self-serve registration (US-191) **không hề đi qua được Kong** — chi tiết §4.

## 1. Bảng tổng hợp

| Ask | US | Lane | Kết quả |
| --- | --- | --- | --- |
| **#47** denorm `academicYear` lên academic record | **US-204** | high-risk (migration 051) | ✅ Ship — field `academicYear` trên record row, có heal cho row cũ |
| **#48** TEACHER đọc học bạ học sinh | **US-206** | high-risk (auth gate), **ADR 0136** | ✅ **CẤP QUYỀN** — scoped theo homeroom (GVCN). FE **giữ route**, không gỡ |
| **#32(b′)** `senderName` trong pin board | **US-205** | tiny | ✅ Ship — resolve server-side + fix openapi drift |
| **#49** rate-limit bucket redeem/lookup | **US-207** | high-risk (gateway) | ✅ Trả lời: **gọi thẳng từ browser**; kèm fix blocker gateway (§4) |

---

## 2. #47 — `academicYear` đã nằm trên record row (US-204)

**Endpoint không đổi.** `GET /core/api/v1/members/{memberId}/academic-records`
và `GET /core/api/v1/classes/{classId}/terms/{termId}/students/{studentId}/academic-record`
giờ trả thêm field trên mỗi record:

```jsonc
{
  "classId": "...", "termId": "...", "studentMemberId": "...",
  "status": "SEALED",
  "academicYear": "2025-2026",   // ← MỚI (US-204)
  "termAverage": "8.50", "gradeSnapshot": [ ... ], "resealCount": 0
}
```

**FE bỏ được hoàn toàn** enrollment point-read `GET /classes/{classId}/students/{studentMemberId}`
đang dùng để resolve năm (dedupe + cap 24 call + fail-soft). Màn PARENT hết
bucket "Chưa xác định năm học".

Cần biết:

- Field là **`academicYear`**, không phải `academicYearLabel` (tên trên wire).
- **`omitempty`** — additive, không nằm trong `required`. Vắng mặt chỉ xảy ra ở
  trường hợp hiếm nêu dưới. FE nên treat `undefined` = chưa xác định được năm,
  giữ nguyên fallback UI hiện có (đừng xoá) nhưng nó sẽ gần như không bao giờ hiện.
- **Record seal mới**: luôn có năm. BE lấy từ chính các grade entry đang được
  snapshot (đã carry `academic_year_label` từ migration 048/US-185) → **không tốn
  thêm read nào** ở seal path.
- **Record seal cũ (trước migration 051)**: NULL. BE **heal lazy** ngay ở list
  read theo member — lần đầu FE gọi list, BE resolve năm từ grade entries của học
  sinh rồi ghi lại vào row. Nghĩa là: **không cần admin action, không cần re-seal,
  không có backfill job**. Chi phí trả một lần cho mỗi row cũ.
  - Heal là **best-effort**: lookup lỗi / không resolve được → field vắng và read
    vẫn 200. Heal **không bao giờ ghi đè** năm đã có.
  - Heal chỉ chạy ở **list theo member** (đúng màn year-grouping). Endpoint đọc
    1 record lẻ **không** heal — row cũ đọc lẻ sẽ vắng field cho tới khi list
    được gọi một lần. Nếu chỗ nào của FE chỉ dùng endpoint lẻ mà cần năm, nói BE
    biết, thêm 1 dòng.

**Deploy:** cần **core migration 051** chạy trước binary core mới (xem §5).

---

## 3. #48 — TEACHER ĐƯỢC đọc học bạ, scope theo homeroom (US-206, ADR 0136)

**Quyết định: cấp quyền, phạm vi hẹp.** FE **giữ route**
`teacher/students/{studentId}/academic-record`, không cần US gỡ màn.

Allow-list mới của cả 2 endpoint học bạ:

| Role | Được đọc |
| --- | --- |
| SUPER_ADMIN / ADMIN / MANAGER | mọi record (không đổi) |
| STUDENT | record của chính mình (không đổi) |
| PARENT | record của con đã link (không đổi) |
| **TEACHER** | **chỉ record của lớp mà mình đang là GVCN (homeroom)** ← MỚI |

Lý do phạm vi hẹp (ghi trong ADR 0136): học bạ carry **toàn bộ môn** đã seal +
điểm trung bình học kỳ — đó là fact cấp GVCN, không phải cấp môn. Giáo viên bộ
môn **không** được cấp (họ đã có view theo môn ở grade reports). Grant theo
tenant-wide (mọi teacher đọc mọi học sinh) bị loại vì phơi PII trẻ vị thành niên
quá rộng.

Hành vi FE cần code đúng:

- **Đọc 1 record** (`.../students/{studentId}/academic-record`): TEACHER là GVCN
  của **chính lớp đó** → 200. Không phải → **403**.
- **List theo member** (`/members/{memberId}/academic-records`): **KHÔNG
  all-or-nothing** — BE **lọc** danh sách xuống các lớp mà caller là GVCN. Một
  học sinh có record ở nhiều lớp qua nhiều năm; teacher chỉ thấy phần của mình.
- Teacher **không** là GVCN của lớp nào của học sinh đó → **`200` với
  `records: []`**, KHÔNG phải 403. Đừng render error state cho case này — render
  empty state ("không có học bạ nào bạn được xem").
- Quyền đọc **theo trạng thái hiện tại**: hết phân công GVCN là mất quyền ngay.
- Response body **không đổi** — teacher được phép thấy đúng các field ADMIN thấy.
- **Không có** quyền ghi nào được thêm: seal / unseal / approve vẫn ADMIN-only.

---

## 4. #32(b′) — `senderName` pin board (US-205)

`GET /social/api/v1/rooms/{roomId}/pinned-messages` giờ trả `senderName` thật
trên từng row (`pins[].message.senderName`). BE resolve server-side từ member
projection (`user.account.*`, ADR 0097), memo theo từng sender trong 1 request.

- Sender chưa được project (event lag / user mới) → **`"Member"`** (literal
  Variant B, giống các directory endpoint khác). **Không bao giờ là chuỗi rỗng.**
  FE localize literal đó như đang làm ở chỗ khác.
- **Không** denormalize tên vào `pinned_messages` — projection là nơi duy nhất
  giữ display name luôn mới; nhân bản vào pin row chỉ tạo thêm bản sao phải sync.

**Fix drift kèm theo:** schema `Message` trong `services/social/docs/openapi.yaml`
trước đây **thiếu** `senderName` dù Go handler vẫn emit. Đã khai báo (additive,
không `required`) + mô tả rõ path nào resolve, path nào không.

⚠️ **Phạm vi chỉ là pin board.** `get_message_history`, `search_room_messages`,
`edit_message` **vẫn** trả `senderName: ""` — đó là pattern chung `toMessageDTO(m, "")`
như FE đã đoán đúng. FE tiếp tục resolve tên cho history từ room directory. Muốn
BE resolve luôn cho history/search thì gửi ask riêng: đó là quyết định khác
(history có phân trang, số tác giả không bounded như pin board 50-cap).

---

## 5. #49 — dùng luồng gọi thẳng từ browser + **BE đã phải fix một blocker gateway**

### 5.1 Trả lời trực tiếp câu hỏi

**US-197 KHÔNG cover 2 route này** — FE hỏi đúng chỗ. Sau US-197, `c.IP()` =
`X-Real-IP` = **peer trực tiếp của Kong**. Nếu request đi qua Next server thì peer
đó là Next server → vẫn là **một IP duy nhất** cho toàn bộ invitee. Kong lại
**ghi đè** `X-Real-IP`, nên việc Next forward `X-Forwarded-For` cũng vô nghĩa với
engine phía sau. Quota "10/phút per client IP" vẫn sai như FE mô tả.

**Chốt: FE gọi `redeem` + `lookup` TRỰC TIẾP từ browser**, không qua Server Action.
Hai route này public, token nằm trong POST body (không phải query string, không
phải header auth) nên gọi từ browser **không mở thêm bề mặt tấn công nào** — và
đó là cách duy nhất để limiter nhìn thấy IP thật của từng invitee. CORS ở Kong
đang `origins: "*"`, methods có POST, headers có `Content-Type` → đủ; gọi bằng
`fetch` **không** kèm `credentials` (không cần cookie).

Phương án còn lại (dựng trust-chain `real_ip` cho Kong tin XFF của Next server,
mở rộng ADR 0133 §5) **không** làm: platform-wide, tốn kém, và chỉ cần thiết nếu
sản phẩm bắt buộc luồng server-action — hiện không.

### 5.2 ⚠️ Blocker phát hiện khi verify (US-207) — quan trọng cho go-live

Khi test luồng browser-direct trên stack thật, BE phát hiện:

```
POST http://localhost:8000/iam/api/v1/invitations/redeem   → 401
POST http://localhost:8000/iam/api/v1/invitations/lookup   → 401
POST http://localhost:8000/iam/api/v1/auth/signin          → 422   (public, chạy tốt)
```

**Hai route public này bị `edu-edge-auth` chặn ngay tại Kong.** Chúng nằm dưới
prefix `/api/v1/invitations` (các route còn lại đều ADMIN-only), nên Kong
longest-prefix match đẩy chúng vào route được bảo vệ và trả 401 cho mọi request
không có bearer token. US-191 ship phía service nhưng **route ở gateway chưa bao
giờ được thêm** → **toàn bộ flow self-serve registration không dùng được qua
gateway, với bất kỳ client nào** (kể cả luồng Server Action hiện tại của FE).

Đã fix trong **US-207**: thêm route public bằng **anchored regex + `methods: [POST]`**,
carve-out rộng đúng 2 cặp (path, method). Verify trên stack thật sau fix:

```
POST /iam/api/v1/invitations/redeem      → 422 VALIDATION_FAILED   (handler của IAM)
POST /iam/api/v1/invitations/lookup      → 410 INVITATION_INVALID  (logic của IAM)
GET  /iam/api/v1/invitations/lookup      → 401   (verb khác POST — vẫn chặn ở edge)
GET  /iam/api/v1/invitations             → 401
POST /iam/api/v1/invitations/redeemXX    → 401
POST /iam/api/v1/invitations/redeem/sub  → 401
POST /iam/api/v1/invitations/xx/redeem   → 401
```

Rate limit của 2 route vẫn nằm **trong IAM** (per-IP 10/phút, US-191) — US-207
không đụng vào policy.

**Hệ quả cho FE:** nếu trước đây có test nào của FE "pass" với redeem/lookup thì
nó đang chạy mock hoặc bypass gateway — **luồng thật qua Kong chưa từng chạy được**.
Sau deploy (kèm reload Kong, §6) hãy test lại end-to-end bằng browser-direct.

---

## 6. Deploy notes (BẮT BUỘC, theo thứ tự)

1. **core migration 051** (`academic_records` + `academic_records_by_student` thêm
   cột `academic_year_label`) — chạy **trước** binary core mới. Migration
   **thuần additive**, không rewrite row nào; binary cũ chạy với schema mới cũng
   an toàn (không select cột đó), nên có thể chạy migration trước thoải mái.
2. **Reload / restart Kong** để nạp `gateway/kong/kong.yml` mới (US-207). Không
   rebuild service nào.
3. **social**: US-205 chỉ deploy binary — **không migration**.
4. **IAM**: không có gì mới ở batch này.
5. Các gate cũ vẫn còn hiệu lực từ batch 2026-08-07: `CURSOR_ENC_KEY` (US-194),
   recreate network cho US-197, chạy reaper dry-run trước (US-198).

## 7. Còn treo (không đổi)

- **#21 (phần còn lại)** — audit-trail seal/unseal đa cycle: BE vẫn chỉ giữ cycle
  mới nhất. FE xác nhận chưa có nhu cầu cụ thể → giữ treo.
- `senderName` cho history/search/edit (xem §4) — cần ask riêng nếu muốn.

## 8. Tham chiếu

| Thứ | Ở đâu |
| --- | --- |
| ADR 0136 (grant TEACHER theo homeroom) | `docs/decisions/0136-homeroom-scoped-teacher-academic-record-read.md` |
| Story packets | `docs/stories/epics/E06-assessment/US-204-*`, `US-206-*`; `E08-communication-community/US-205-*.md`; `E01-platform-foundations/US-207-*` |
| Flow docs | `services/core/docs/usecases/assessment/{seal_academic_record,list_student_academic_records,get_academic_record}.md`; `services/social/docs/usecases/room/list_pinned_messages.md` |
| Contract | `services/core/docs/openapi.yaml`, `services/social/docs/openapi.yaml`, `gateway/README.md` |
