# DR-006 — Notifications Center (Trung tâm thông báo)

Status: pending
US: US-E10.2 (cần tạo story packet)
Route: `/notifications`
Roles: tất cả (`teacher`, `principal`, `admin`, `student`, `parent`)
Design file to create: `design_src/edu/notifications.jsx`

---

## Mục tiêu màn hình

Danh sách tất cả thông báo của người dùng: thông báo từ hệ thống (điểm danh,
điểm số, kỷ luật), thông báo từ BGH (announcement), thông báo realtime qua SSE
(decision `0009`). Hỗ trợ filter theo loại + đánh dấu đã đọc.

---

## Layout chính

**Header**: "Thông báo" title + subtitle "{N} chưa đọc" + "Đánh dấu tất cả đã đọc" button (text button, right-aligned).

**Filter tabs** (pill tabs, dạng ngang):
- Tất cả | Chưa đọc | Điểm số | Điểm danh | Kỷ luật | Thông báo trường

**Notification list** (full-width, border separator):

**Item structure:**
```
┌────────────────────────────────────────────────────────────────────┐
│ [28×28 icon box màu theo loại]  Tiêu đề thông báo               │ ← unread: fw-700 + dot
│                                  Nội dung rút gọn (2 dòng)        │ ← read: muted
│                                  5 phút trước · [Điểm số] badge   │
└────────────────────────────────────────────────────────────────────┘
```

- **Unread**: bg `primaryLight`, left border `3px solid primary`, title fw-700, blue dot indicator.
- **Read**: bg white, no border, title fw-500, muted color.
- Click item → mark as read + (optional) navigate đến context (VD: click thông
  báo điểm → `/teacher/grades`).

**Icon color theo loại**:
- Điểm số: `success` (chart icon)
- Điểm danh: `primary` (calendar icon)
- Kỷ luật: `warning` (alert icon)
- Thông báo trường: `info` (megaphone icon)
- Hệ thống: `muted` (bell icon)

**Load more** / infinite scroll (không phân trang).

**Realtime**: new notification → toast (sonner) + prepend to list (SSE event
`notification.new`, per decision `0009` + US-E06.2).

---

## States

**Empty** (không có thông báo): bell icon lớn (muted) + "Chưa có thông báo nào."

**All read**: subtitle "Tất cả đã đọc" (success color).

**Loading**: skeleton rows (3-4 rows).

---

## Dữ liệu mock

```js
[
  { id:'n1', type:'grade', title:'Điểm Toán lớp 10A1 đã được công bố',
    body:'Giáo viên Nguyễn Thị Hương vừa công bố điểm Học kỳ 1.', read:false, time:'5 phút trước' },
  { id:'n2', type:'attendance', title:'Vắng không phép — Trần Văn Bình',
    body:'Học sinh Trần Văn Bình vắng không phép tiết 2 ngày 12/06/2026.', read:false, time:'1 giờ trước' },
  { id:'n3', type:'announcement', title:'Thông báo: Họp phụ huynh cuối kỳ',
    body:'BGH thông báo họp phụ huynh ngày 20/06/2026 lúc 8:00.', read:true, time:'Hôm qua' },
  { id:'n4', type:'discipline', title:'Ghi nhận vi phạm — Lê Thị Cẩm',
    body:'Học sinh Lê Thị Cẩm bị ghi nhận vi phạm nội quy (mức Nhẹ).', read:true, time:'3 ngày trước' },
]
```

---

## Tham chiếu màn hình tương tự

- `design_src/edu/teacher.jsx` — NotificationsPanel (sidebar right) — icon row style.
- `design_src/edu/messaging.jsx` — conversation list style (unread badge, read/unread state).
- `design_src/edu/ui.jsx` — Badge, Icon components.
- `design_src/edu/tokens.js` — màu sắc.

---

## Output cần từ designer

File: `design_src/edu/notifications.jsx`
Component: `NotificationsCenterScreen`
