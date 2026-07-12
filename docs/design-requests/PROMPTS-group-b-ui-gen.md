# Prompt Pack: Gen UI cho nhóm B (BE đã có API, web chưa có màn)

> **Bối cảnh**: BE `edu-api` đã implemented 100 US (4 service: `iam`, `core`,
> `notification`, `social`). Web đã có UI mock-first cho gần hết — riêng nhóm B
> dưới đây **chưa có màn hình nào**. File này chứa các prompt để gen reference
> mockup trên **Claude Design**.
>
> **Đồng bộ baseline**: UI trên Claude Design **đã được đồng bộ với
> `design_src/edu/`** (36 file jsx + `tokens.js` + `ui.jsx` + `icons.jsx`).
> Mọi prompt dưới đây do đó KHÔNG cần mô tả lại design system từ đầu — chỉ cần
> yêu cầu "theo baseline EduPortal hiện có" và nêu phần MỚI. Output của mỗi
> prompt là 1 file jsx mới (hoặc extend file có sẵn) đúng convention
> `design_src/edu/<slug>.jsx`, dùng `tokens.js` + primitives trong `ui.jsx`,
> KHÔNG raw hex ngoài token.
>
> **Quy trình sau khi gen**: mỗi mockup gen xong đi qua `/uiux` (reconcile +
> design-spec.jsonc entry + UX copy i18n keys) → `/ba` (spec + AC) → `/fe`
> (implementation). File này chỉ là bước gen mockup đầu vào.

---

## Checklist thứ tự chạy prompt

Thứ tự xếp theo: dependency giữa các màn → giá trị nghiệp vụ → độ phức tạp
(làm màn nền tảng trước, màn extend sau).

- [ ] **P1 — Social Feed (bảng tin trường/lớp)** — màn mới lớn nhất, gen trước
      để các prompt P2/P6 extend lên nó
- [ ] **P2 — Content Reporting & Moderation** — phụ thuộc P1 (report post/comment)
      + extend `messaging.jsx` (report message)
- [ ] **P3 — Parent–Student Links & Consent** — độc lập, admin + parent view
- [ ] **P4 — Tenant Invitations & Accept Onboarding** — độc lập, admin + public view
- [ ] **P5 — Email Verification Flow** — nhỏ, extend `profile.jsx` + banner shell
- [ ] **P6 — Presence Indicator** — extend `messaging.jsx`, chạy sau P2 để tránh
      2 lần đụng cùng file
- [ ] **P7 — Switch Tenant** — nhỏ, extend app shell (header) + 1 màn chọn trường

Sau mỗi prompt: 
- [ ] Lưu output vào `design_src/edu/<slug>.jsx` (P1/P3/P4 là file mới;
      P2/P5/P6/P7 sửa file có sẵn — diff phải giữ nguyên phần cũ)
- [ ] Soát tokens-only (không hex mới ngoài `tokens.js`)
- [ ] Chạy `/uiux` để tạo DR-NNN + design-spec.jsonc entry + copy keys

---

## P1 — Social Feed: bảng tin trường & lớp

**Target**: file MỚI `design_src/edu/feed.jsx` — component `FeedScreen`.
**BE contract** (service `social`, đã implemented US-097→100, pinning US-101 đang dở):
- `GET/POST /api/v1/feeds/school` — feed toàn trường
- `GET/POST /api/v1/feeds/classes/{classId}` — feed theo lớp
- `PUT/DELETE /api/v1/feeds/posts/{postId}/reaction` — toggle emoji reaction
- `GET/POST /api/v1/feeds/posts/{postId}/comments` — bình luận
- `DELETE /api/v1/feeds/posts/{postId}/moderate-delete` — gỡ bài (moderator)
- `POST /api/v1/reports` — báo cáo nội dung (UI ở P2, nhưng P1 phải chừa entry
  point: menu "…" trên post/comment có item "Báo cáo")

### Prompt

```
Dựa trên baseline EduPortal đã đồng bộ (tokens.js, ui.jsx, layout shell sidebar
260px + header 64px như các màn hiện có), thiết kế màn hình MỚI "Bảng tin"
(FeedScreen) — social feed của trường học, file design_src/edu/feed.jsx.

NGƯỜI DÙNG & PHẠM VI:
- 4 role đều xem được: teacher/principal (đăng bài school + class), student/parent
  (chỉ xem + reaction + comment; student đăng được vào feed LỚP nếu policy cho phép).
- Tab switcher đầu trang: "Toàn trường" | "Lớp <tên lớp>" (student/teacher thấy các
  lớp của mình — dropdown nếu nhiều lớp).

LAYOUT (desktop 1280):
- Cột chính (max-width ~680px, căn giữa vùng content): composer + danh sách post.
- Composer card: avatar người dùng + input "Chia sẻ với cả trường…" (placeholder đổi
  theo tab), nút đính kèm ảnh (icon), nút "Đăng" (primary). Role không có quyền đăng
  → ẩn composer hoàn toàn (không disable).
- Post card: header (avatar, tên + role badge màu theo --edu-role-*, thời gian tương
  đối, badge "Đã ghim" nếu pinned, menu "…" gồm: Ghim/Bỏ ghim (moderator), Gỡ bài
  (moderator), Báo cáo (mọi role trừ tác giả)); body text (line-clamp 5 + "Xem thêm");
  grid ảnh đính kèm (1-4 ảnh); footer: reaction bar (nhóm emoji đếm số + nút thả
  reaction, trạng thái đã-thả highlight bằng bg primary/12 + border) + nút "Bình luận"
  kèm số đếm.
- Comment thread (expand dưới post): danh sách comment (avatar nhỏ, tên, text, thời
  gian), input thêm comment ở cuối. Comment cũng có menu "…" (Báo cáo / Gỡ — theo quyền).
- Post ghim: hiển thị đầu feed, icon ghim + viền nhẹ primary/30.

STATES bắt buộc: loading (skeleton 3 post card), empty ("Chưa có bài viết nào" +
illustration + CTA đăng bài đầu tiên cho role có quyền), error (banner + retry),
end-of-feed ("Bạn đã xem hết"). Feed phân trang cursor → nút/auto "Tải thêm".

MOBILE (375): cột đơn full-width, composer sticky khỏi? KHÔNG — composer nằm trong
flow; tab switcher scroll ngang nếu nhiều lớp.

A11Y: reaction buttons là <button> có aria-pressed + aria-label tiếng Việt
("Thả cảm xúc Thích, 12 người"); menu "…" là menu Radix-style đúng semantics;
thời gian có title đầy đủ; ảnh có alt.

MOCK DATA: seed FEED_POSTS ~6 bài (2 của hiệu trưởng scope school — 1 bài pinned,
2 của GVCN scope class, 1 của học sinh, 1 bài dài để test line-clamp), mỗi bài
2-3 loại reaction, 1 bài có 3 comment. Tên người/lớp dùng đúng dàn nhân vật mock
hiện có trong baseline (Nguyễn Minh Khoa 11A2, cô Trần Thu Hà, ...).

RÀNG BUỘC: tokens-only (không hex mới), reuse Badge/Card/Avatar/EmptyState pattern
từ ui.jsx, KHÔNG chế palette mới. Không copy layout từ mạng xã hội cụ thể nào —
giữ tone gọn gàng, học đường, mật độ thông tin vừa phải như các màn EduPortal khác.
```

---

## P2 — Content Reporting & Moderation

**Target**: 
- File MỚI `design_src/edu/moderation.jsx` — `ModerationScreen` (admin/principal).
- EXTEND `design_src/edu/feed.jsx` (P1) + `design_src/edu/messaging.jsx`: flow
  "Báo cáo" (dialog) từ post/comment/message.

**BE contract** (service `social`, US-098):
- `POST /api/v1/reports` — tạo report (targetType: post|comment|message, reason enum)
- `GET /api/v1/reports` — danh sách report (moderator, filter status)
- `POST /api/v1/reports/{reportId}/resolve` — xử lý (action: dismiss | delete-content)
- `GET /api/v1/rooms/{roomId}/moderation-audit` — audit log phòng chat
- `DELETE .../moderate-delete` — gỡ nội dung (post/message)

### Prompt

```
Trên baseline EduPortal đã đồng bộ, làm 2 việc:

VIỆC 1 — Dialog "Báo cáo nội dung" (dùng chung, thêm vào feed.jsx và messaging.jsx):
- Trigger từ menu "…" của post/comment/message.
- Dialog: tiêu đề "Báo cáo nội dung", radio group lý do (Spam / Ngôn từ không phù
  hợp / Bắt nạt / Thông tin sai / Khác + textarea khi chọn Khác), preview thu nhỏ
  nội dung bị báo cáo (quote card muted), nút "Gửi báo cáo" (primary) + "Hủy".
- Sau gửi: toast "Đã gửi báo cáo. BGH sẽ xem xét." Content KHÔNG biến mất với
  người báo cáo.

VIỆC 2 — Màn MỚI "Kiểm duyệt nội dung" (ModerationScreen, design_src/edu/moderation.jsx),
role principal/admin, route dự kiến /principal/moderation:
- Header: page-title "Kiểm duyệt nội dung" + stat row 3 StatCard (Chờ xử lý /
  Đã xử lý tuần này / Đã gỡ nội dung) theo pattern StatCard baseline.
- Filter bar: tab status (Chờ xử lý | Đã xử lý | Tất cả) + select loại nội dung
  (Bài viết / Bình luận / Tin nhắn) + search.
- Bảng report: cột = Nội dung (preview 2 dòng + icon loại), Người báo cáo, Lý do
  (badge tone warning/error theo mức), Người bị báo cáo, Thời gian, Trạng thái
  (badge), Hành động.
- Row action mở detail panel (sheet bên phải): full nội dung + context (post gốc
  của comment, 3 message lân cận của message), lịch sử báo cáo trùng, 2 nút:
  "Bỏ qua" (ghost) và "Gỡ nội dung" (destructive, có confirm dialog nêu rõ hành
  động không hoàn tác + thông báo cho người đăng).
- Tab phụ "Nhật ký kiểm duyệt": timeline audit (ai gỡ gì, lúc nào, lý do) —
  read-only, pattern giống audit-log.jsx hiện có.

STATES: empty ("Không có báo cáo nào chờ xử lý" — tone tích cực), loading skeleton
bảng, error + retry. Mobile: bảng → card list.

A11Y: destructive action phải role-gated + confirm; badge trạng thái kèm text
không chỉ màu; sheet đúng focus-trap semantics.

MOCK DATA: 5 report (2 pending post, 1 pending message, 2 resolved), lý do đa dạng.
Tokens-only, reuse StatCard/Badge/Table/Sheet pattern từ baseline.
```

---

## P3 — Parent–Student Links & Consent Management

**Target**: file MỚI `design_src/edu/parent-links.jsx` — `ParentLinksScreen`
(admin) + `ConsentSection` (parent, extend `profile.jsx` hoặc section trong màn
parent hiện có).

**BE contract** (service `core`, US-047 + US-094/095):
- `GET/POST /api/v1/parent-student-links`, `DELETE /api/v1/parent-student-links/{linkId}`
- `GET/PUT /api/v1/parent-student-links/consents` — parent grant/revoke consent
  nhận thông báo hạnh kiểm/điểm danh của con
- `GET /api/v1/members/{memberId}/linked-students` / `linked-parents`

### Prompt

```
Trên baseline EduPortal đã đồng bộ, thiết kế design_src/edu/parent-links.jsx gồm
2 phần:

PHẦN 1 — Màn admin "Liên kết Phụ huynh – Học sinh" (route dự kiến /admin/parent-links):
- Page title + nút "Tạo liên kết" (primary, mở dialog).
- Search học sinh hoặc phụ huynh + filter lớp.
- Bảng: Học sinh (avatar + tên + lớp), Phụ huynh (avatar + tên + SĐT), Quan hệ
  (badge: Bố/Mẹ/Người giám hộ), Trạng thái consent (badge: Đã đồng ý nhận TB /
  Chưa phản hồi / Đã từ chối — kèm icon, không chỉ màu), Ngày liên kết, Hành động
  (menu "…": Xem chi tiết / Gỡ liên kết — destructive confirm).
- Dialog "Tạo liên kết": 2 combobox search (chọn học sinh → chọn phụ huynh từ
  danh sách member role parent), select quan hệ, ghi chú. Validate: 1 cặp không
  link trùng (hiện lỗi inline "Liên kết đã tồn tại").
- Empty state cho lớp chưa có liên kết nào.

PHẦN 2 — Section "Quyền nhận thông báo về con" cho PHỤ HUYNH (đặt trong màn hồ
sơ/cài đặt của parent — vẽ như một Card section để sau này gắn vào profile):
- Mỗi con 1 card con: avatar + tên + lớp, dưới là các toggle consent:
  "Thông báo vi phạm/hạnh kiểm", "Thông báo vắng học", "Thông báo điểm số".
- Mỗi toggle có mô tả 1 dòng muted giải thích dữ liệu gì sẽ được gửi.
- Thay đổi toggle → confirm nhẹ (toast "Đã cập nhật quyền nhận thông báo").
- Ghi chú chân section: text nhỏ giải thích nhà trường chỉ gửi khi phụ huynh
  đồng ý (tone tôn trọng riêng tư).

STATES: loading skeleton, empty, error+retry cho cả 2 phần. Mobile: bảng admin →
card list; phần parent vốn là card nên giữ nguyên.

A11Y: toggle là switch có label liên kết + trạng thái đọc được; consent badge
kèm icon+text; destructive gỡ liên kết có confirm nêu hệ quả (phụ huynh mất
quyền xem dữ liệu con).

MOCK DATA: dùng dàn nhân vật baseline — phụ huynh Nguyễn Văn Bình link 2 con
(Nguyễn Minh Khoa 11A2, Nguyễn Thị Lan Anh 8B1) với consent khác nhau; thêm 3-4
cặp link khác. Tokens-only, reuse Table/Badge/Switch/Dialog pattern.
```

---

## P4 — Tenant Invitations & Accept Onboarding

**Target**: file MỚI `design_src/edu/invitations.jsx` — `InvitationsScreen`
(admin) + `AcceptInvitationScreen` (public, layout auth giống `login.jsx`).

**BE contract** (service `iam`):
- `GET/POST /api/v1/tenants/{id}/invitations` — tạo/list lời mời (email, role, expiry)
- `DELETE /api/v1/tenants/{id}/invitations/{invitationId}` — thu hồi
- `POST /api/v1/invitations/accept` — accept bằng token (public, user đăng ký/đăng nhập rồi join tenant)

### Prompt

```
Trên baseline EduPortal đã đồng bộ, thiết kế design_src/edu/invitations.jsx gồm
2 màn:

MÀN 1 — Admin "Mời thành viên" (route dự kiến /admin/invitations):
- Page title + nút "Gửi lời mời" (primary, mở dialog).
- Dialog gửi lời mời: input email (validate format, hỗ trợ nhập nhiều email
  dạng chip), select vai trò (Giáo viên / Học sinh / Phụ huynh / BGH / Admin —
  role badge màu --edu-role-*), select thời hạn (7/14/30 ngày), nút "Gửi".
- Bảng lời mời: Email, Vai trò (badge), Người mời, Ngày gửi, Hết hạn (đếm ngược
  "còn X ngày", tone warning khi <3 ngày, muted khi hết hạn), Trạng thái
  (Chờ chấp nhận / Đã chấp nhận / Hết hạn / Đã thu hồi — badge + icon), Hành động
  (Gửi lại — chỉ khi hết hạn; Thu hồi — confirm destructive; Copy link mời).
- Filter: tab trạng thái + search email.
- Empty state: "Chưa có lời mời nào" + CTA.

MÀN 2 — "Chấp nhận lời mời" (public, route /invitations/accept?token=..., layout
auth 2 cột giống login.jsx của baseline):
- Card giữa: logo EduPortal, tiêu đề "Bạn được mời tham gia <Tên trường>",
  role được mời (badge lớn), người mời + thời hạn.
- 2 trạng thái người dùng:
  a) Chưa có tài khoản → form đăng ký rút gọn (họ tên, mật khẩu; email khóa sẵn
     theo lời mời) + nút "Tạo tài khoản & tham gia".
  b) Đã đăng nhập → chỉ nút "Tham gia <Tên trường>" + dòng "Đang đăng nhập với
     <email> — Đổi tài khoản?".
- Trạng thái lỗi: token hết hạn ("Lời mời đã hết hạn, liên hệ nhà trường") /
  token đã dùng / token không hợp lệ — mỗi loại 1 illustration + hướng dẫn.
- Thành công: card xác nhận + nút "Vào trang chính" (redirect theo role).

A11Y: form đầy đủ label + aria-invalid + describedby; đếm ngược hết hạn không
chỉ bằng màu; chip email xóa được bằng bàn phím.

MOCK DATA: 6 lời mời đủ 4 trạng thái, email đa dạng. Tokens-only, reuse
Table/Badge/Dialog/auth-layout pattern từ baseline.
```

---

## P5 — Email Verification Flow

**Target**: EXTEND `design_src/edu/profile.jsx` (section email) + banner mức
app-shell + 1 dialog/card confirm. Không tạo file mới trừ khi profile.jsx quá tải.

**BE contract** (service `iam`):
- `POST /api/v1/users/me/email/verification` — gửi mail xác thực
- `POST /api/v1/users/me/email/verification/confirm` — confirm bằng OTP/token

### Prompt

```
Trên baseline EduPortal đã đồng bộ, bổ sung flow xác thực email (KHÔNG tạo màn
mới — extend profile.jsx + app shell):

1. BANNER app-shell (dưới header, trên content, mọi trang): khi email chưa xác
   thực — nền warning/10, icon mail-warning, text "Email của bạn chưa được xác
   thực. Xác thực để nhận thông báo quan trọng." + nút inline "Gửi mail xác thực"
   (ghost) + nút đóng X (dismiss trong session). Sau khi gửi: text đổi "Đã gửi.
   Kiểm tra hộp thư <email>." + link "Gửi lại" có cooldown đếm ngược 60s.

2. SECTION trong profile.jsx (khối Thông tin tài khoản): hàng Email hiển thị
   badge trạng thái cạnh giá trị — "Đã xác thực" (success + icon check) hoặc
   "Chưa xác thực" (warning + icon) kèm nút "Xác thực ngay".

3. DIALOG "Xác thực email": mô tả đã gửi mã 6 số tới <email>, OTP input 6 ô
   (reuse pattern OTP của baseline auth), nút "Xác nhận" + "Gửi lại mã" (cooldown),
   trạng thái lỗi mã sai/mã hết hạn (text đỏ dùng --edu-error-text + aria-invalid),
   trạng thái thành công (icon check lớn + "Email đã được xác thực").

A11Y: banner có role=status (không phải alert — không khẩn cấp); OTP input đúng
semantics 1 ô 1 ký tự có aria-label "Chữ số thứ N"; cooldown đọc được bằng SR.

Tokens-only; warning banner dùng --edu-warning-foreground cho text trên nền vàng
(không text trắng). Không thêm hex mới.
```

---

## P6 — Presence Indicator (messaging)

**Target**: EXTEND `design_src/edu/messaging.jsx`. Chạy SAU P2 (P2 cũng sửa
messaging.jsx — tránh 2 diff chồng nhau).

**BE contract** (service `notification`): `GET /api/v1/presence` (+ realtime qua
SSE `/api/v1/stream`).

### Prompt

```
Trên baseline EduPortal đã đồng bộ, extend messaging.jsx thêm presence
(online/offline) — thay đổi tối thiểu, không đổi layout:

1. Avatar trong danh sách hội thoại + header phòng chat: chấm trạng thái 10px
   góc dưới-phải avatar — online = --edu-success + ring 2px nền card; offline =
   không hiển thị chấm (không dùng chấm xám — giảm nhiễu); vừa rời đi (<5 phút)
   = chấm viền success rỗng ruột.
2. Header phòng DM: dưới tên người chat, dòng caption muted "Đang hoạt động" /
   "Hoạt động 5 phút trước" / "Hoạt động hôm qua".
3. Group room: KHÔNG hiện presence từng người ở header; trong panel danh sách
   thành viên (đã có) thêm chấm online cạnh avatar + sort online lên đầu, kèm
   count "3 đang hoạt động" ở đầu panel.
4. Typing indicator giữ nguyên như baseline (không đụng).

A11Y: chấm online phải kèm text cho SR (sr-only "đang hoạt động") — không chỉ
màu; caption thời gian dùng text đầy đủ không viết tắt khó hiểu.

Tokens-only. KHÔNG animation nhấp nháy cho chấm online (motion-safe + đỡ nhiễu).
```

---

## P7 — Switch Tenant (đa trường)

**Target**: EXTEND app shell (`design_src/edu/app.jsx` — user menu ở header)
+ 1 màn chọn trường sau đăng nhập (thêm vào `login.jsx` hoặc file mới
`design_src/edu/tenant-select.jsx` nếu login.jsx quá tải).

**BE contract** (service `iam`): `GET /api/v1/members/me/tenants`,
`POST /api/v1/members/switch-tenant`.

### Prompt

```
Trên baseline EduPortal đã đồng bộ, thiết kế flow đổi trường (multi-tenant) cho
user thuộc nhiều trường (VD giáo viên dạy 2 trường, phụ huynh có con 2 trường):

1. USER MENU (header app shell): trên cùng menu thêm khối trường hiện tại —
   logo/initial trường + tên trường + role badge của user tại trường đó; nếu
   user thuộc ≥2 trường thêm item "Đổi trường" (icon switch) mở dialog.

2. DIALOG "Chọn trường": danh sách card trường — logo/initial (56px, radius 16
   theo role-icon token), tên trường, địa chỉ ngắn muted, role badge của user
   tại trường đó, badge "Hiện tại" cho trường đang active. Card là <button> lớn
   (≥64px cao), hover lift theo shadow token, focus ring rõ. Chọn trường khác →
   loading state trên card đó → toast "Đã chuyển sang <Tên trường>" + app reload
   context.

3. MÀN CHỌN TRƯỜNG SAU LOGIN (chỉ hiện khi user thuộc ≥2 trường, layout auth
   giống login.jsx): tiêu đề "Chọn trường để tiếp tục", grid card trường (cùng
   card style như dialog), ghi chú nhỏ "Bạn có thể đổi trường bất kỳ lúc nào từ
   menu tài khoản".

4. User chỉ thuộc 1 trường: KHÔNG render gì thêm (không item Đổi trường, không
   màn chọn) — zero-noise.

A11Y: card trường là button thật, tên trường + role đọc được một mạch; trạng
thái "Hiện tại" kèm text không chỉ style; dialog focus-trap chuẩn.

MOCK DATA: user mẫu thuộc 2 trường (THPT Chu Văn An — teacher; THCS Nguyễn Du —
teacher). Tokens-only, reuse card/badge/dialog pattern baseline.
```

---

## P8 — Fix pass sau audit handoff v2 (2026-07-12)

> Kết quả audit `design_handoff_v2` (so với baseline repo `design_src/edu/`):
> P1–P7 coverage gần đủ. Prompt này gom TOÀN BỘ phần thiếu/sai còn lại — chạy
> 1 lần trên Claude Design, không cần gen lại màn nào.

**Trạng thái audit**: ✅ P1 feed / P2 moderation+report dialog / P3 parent-links /
P5 email-verify / P6 presence / P7 tenant-switch / states.jsx / reports.jsx —
đạt spec. Còn lại các mục dưới.

### Prompt

```
Trên baseline EduPortal v2 (đã có feed/moderation/parent-links/invitations/
email-verify/tenant-switch/states/reports), thực hiện MỘT lượt sửa — không đổi
layout, không gen màn mới:

1. TOKENS (tokens.js):
   - KHÔI PHỤC token đã bị rơi so với baseline gốc:
     errorText: '#C0392B'  (AA text trên nền sáng — decision 0027).
   - THÊM token mirror từ runtime tokens.css (đã tồn tại, không cần ADR):
     warningText: '#9A6A0F' (AA text/icon tone warning trên nền sáng — decision 0046).

2. THAY HẾT hex tự chế '#B98200' (8 chỗ) bằng T.warningText:
   - parent-links.jsx: consent badge "Chưa phản hồi".
   - invitations.jsx: badge "Chờ chấp nhận", đếm ngược hết hạn <3 ngày,
     illustration token hết hạn.
   - email-verify.jsx: badge "Chưa xác thực".

3. Literal lẻ:
   - invitations.jsx gradient accept-screen: '#13DEB988' → `${T.success}88`.
   - email-verify.jsx OTP cell: background '#fff' → T.card.
   - email-verify.jsx text lỗi mã sai/hết hạn: dùng T.errorText (sau khi khôi
     phục ở mục 1) thay cho T.errorDark.

4. INVITATIONS — bổ sung 2 state còn thiếu cho màn admin (màn duy nhất chưa đủ
   4 state): loading skeleton bảng + error có nút "Thử lại" — dùng đúng bộ
   EduSkeleton / EduError trong states.jsx (pattern failedOnce như reports.jsx).

5. A11Y REGRESSION trong ui.jsx (so với baseline gốc — khôi phục):
   - Nút đổi vai trò trong user menu: role="menuitemradio" + aria-checked.
   - Dropdown đổi vai trò: aria-label "Đổi vai trò" trên role="menu".
   - Nút thu gọn sidebar: aria-label theo trạng thái ("Thu gọn thanh điều hướng"
     khi đang mở / "Mở rộng thanh điều hướng" khi đang gọn).

6. NHẤT QUÁN (không đổi visual):
   - feed.jsx + moderation.jsx: thay bộ skeleton/empty/error tự vẽ
     (FeedSkeleton/FeedEmpty/FeedError, ModSkeleton/ModEmpty/ModError) bằng
     EduSkeleton/EduEmpty/EduError của states.jsx — states.jsx là bộ bắt buộc.
     Gỡ class '.feed-skel' bị define trùng ở 2 file.
   - messaging.jsx panel thành viên group: count "N đang hoạt động" + sort
     online-first dùng msgPresence() thay boolean online cũ (để presence
     'recent' không bị đếm là offline).

RÀNG BUỘC: tokens-only, không thêm hex nào ngoài 2 token khai báo ở mục 1;
không đụng typing indicator, không đổi layout/spacing màn nào.
```

---

## Ghi chú chung cho mọi prompt

- **Không tạo token mới trong lúc gen.** Nếu mockup thực sự cần màu/token mới →
  dừng, flag về `uiux-design-system-builder` để đi đường ADR trước
  (rule `design-system.md`).
- Copy UI trong mockup viết **tiếng Việt** (sẽ được `uiux-ux-writer` chuyển thành
  i18n keys vi/en ở bước /uiux — mock data tên người/trường KHÔNG i18n).
- Mỗi màn phải đủ 4 state: loading / empty / error / success (rule chung baseline).
- Path API trong file này lấy từ `edu-api/services/*/docs/openapi.yaml` tại thời
  điểm 2026-07-11 — khi implement, `/ba` đối chiếu lại contract mới nhất.
- Post pinning (P1) phụ thuộc BE US-101 (`in_progress`) — vẽ UI trước được,
  wiring chờ BE đóng.
