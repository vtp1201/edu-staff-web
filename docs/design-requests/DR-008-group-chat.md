# DR-008 — Group Chat (Mở rộng từ messaging.jsx — thêm Groups tab đầy đủ)

Status: [x] delivered (2026-06-20)
US: **US-E10.4** — "Messaging Enhancements: group lifecycle + message interactions" (`planned`)
  Note: DR header originally said US-E10.1 (base messaging, already implemented). The group-chat
  enhancement (group create/manage/leave + message reply/pin/delete) maps to US-E10.4, which is
  genuinely net-new and `planned`. Handoff feeds US-E10.4 → /ba → /fe.
Route: `/messages` (shared, all roles)
Roles: tất cả
Design file: `design_src/edu/messaging.jsx` — ALREADY CONTAINS full DR-008 implementation (1953 lines)

## Reconcile finding (2026-06-20)

Pattern: RECONCILE (messaging.jsx fully built, not net-new authoring needed for the JSX).
- `design_src/edu/messaging.jsx` (1953 lines): ALL group-chat flows already present:
  - Group list rows (avatar + member count + last-activity + unread badge) ✓
  - CreateGroupModal (2-step: info → members) ✓
  - GroupInfoPanel (320px slide-in: members, admin badges, pinned, leave/delete) ✓
  - MessageContextMenu (reply, pin, copy, delete with permission rules) ✓
  - ReplyStrip + quote bubble in ChatBubble ✓
  - Per-role group seeding (teacher/principal/student/parent) ✓
  - Empty groups state, skeleton loading, offline member state ✓
- Gaps closed by this DR:
  1. `docs/product/design-spec.jsonc` — added `messaging.groupChat` sub-section (spec for FE)
  2. `src/bootstrap/i18n/messages/{vi,en}.json` — added new group-chat keys under
     `messaging.group`, `messaging.groupInfo`, `messaging.contextMenu`, `messaging.reply`,
     `messaging.deleteDialog` (genuinely net-new for US-E10.4; did not duplicate existing keys)

---

## Mục tiêu

`messaging.jsx` đã có layout 2-pane (conversation list + chat window) với Direct
Messages. Cần mở rộng tab **Groups** với các flow còn thiếu: tạo nhóm, quản lý
thành viên, roles trong nhóm (admin nhóm), thông tin nhóm, ghim tin nhắn.

---

## Những gì đã có trong messaging.jsx (không thay đổi)

- 2-pane layout: conversation list trái (Direct / Groups tabs) + chat window phải.
- Direct Messages: tìm kiếm, unread badges, online indicator, typing dots.
- Chat window: bubbles, sender avatar + name (groups), date dividers, system messages.
- Input bar: textarea + Enter-to-send + attach + emoji + send button.
- "New Message" modal với user search.

---

## Những gì cần thiết kế thêm (extend)

### 1. Group list (tab Groups — bên trái)

Hiện tại: danh sách nhóm chỉ show tên + unread. Cần thêm:
- Group avatar (chữ cái đầu tên nhóm, màu random từ palette) hoặc custom ảnh.
- Member count badge (nhỏ, muted): "12 thành viên".
- Last activity: "Nguyễn Hương: Chào buổi sáng..." (truncate 1 dòng).
- Unread count badge (đỏ, right side).

### 2. "Tạo nhóm mới" flow

Button "+ Tạo nhóm" trong header của Groups tab → modal 2-bước:

**Bước 1 — Thông tin nhóm**:
- Tên nhóm * (input)
- Mô tả (optional textarea)
- Loại nhóm: Lớp học / Bộ môn / Câu lạc bộ / Khác (radio)
- Group avatar: color picker (8 màu từ design token palette)

**Bước 2 — Thêm thành viên**:
- Search input + user list (checkbox selection).
- Selected members chips (dismissible).
- "Tạo nhóm" button.

### 3. Group info panel (slide-in từ phải, 320px)

Khi click tên group ở header chat window → hiện panel:

```
[Group avatar 80×80 + edit icon nếu admin]
Tên nhóm (editable nếu admin)
Mô tả (editable nếu admin)
━━━━━━━━━━━━━━━━━━━━━━━━
THÀNH VIÊN (12)
[Avatar] Nguyễn Thị Hương    Admin  [Xóa]
[Avatar] Trần Văn Minh               [Xóa]
...
[+ Thêm thành viên]
━━━━━━━━━━━━━━━━━━━━━━━━
TIN NHẮN ĐÃ GHIM (2)
[message preview]
━━━━━━━━━━━━━━━━━━━━━━━━
[Rời nhóm] [Xóa nhóm (admin)]
```

### 4. Message context menu (right-click hoặc long-press bubble)

Popup nhỏ (4 options):
- Trả lời (Reply) → hiển thị quoted message trong input
- Ghim tin nhắn → xuất hiện trong "Tin nhắn đã ghim" của group info
- Copy text
- Xóa (chỉ tin của mình, trong 1 giờ)

### 5. Reply / Quote UI

Khi reply:
```
┌─ Đang trả lời Nguyễn Thị Hương ─────[x]
│  Chào buổi sáng! Hôm nay họp lúc mấy giờ?
└──────────────────────────────────────────
[  Nhập tin nhắn...                      ] [Send]
```

Bubble hiển thị quoted message nhỏ hơn, màu nhạt hơn, phía trên nội dung reply.

---

## Per-role group seeding (mock data)

| Role | Groups mặc định |
|------|----------------|
| teacher | Nhóm giáo viên bộ môn Toán, Nhóm chủ nhiệm 10A1, Nhóm GV toàn trường |
| principal | Tất cả nhóm GV, Nhóm Ban giám hiệu |
| student | Nhóm lớp 10A1, Nhóm môn Toán 10A1 (GV tạo) |
| parent | Nhóm phụ huynh lớp 10A1 (GV chủ nhiệm tạo) |

---

## States

**Empty groups**: "Bạn chưa tham gia nhóm nào." + "Tạo nhóm mới" CTA.
**Loading messages**: skeleton bubbles.
**Offline member**: avatar mờ, không có online indicator.

---

## Tham chiếu màn hình tương tự

- `design_src/edu/messaging.jsx` — file gốc cần extend (KHÔNG tạo file mới,
  UPDATE file này).
- `design_src/edu/subjects-dialogs.jsx` — modal 2-step pattern.
- `design_src/edu/profile.jsx` — sessions list style (thành viên nhóm).

---

## Output cần từ designer

Update file: `design_src/edu/messaging.jsx` (existing)
Thêm: group list items, "tạo nhóm" modal flow, group info panel, message context
menu, reply/quote UI, group seeding mock data cho cả 4 roles.
