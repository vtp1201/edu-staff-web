# DR-007 — Announcements (BGH gửi thông báo toàn trường)

Status: [x] delivered (2026-06-20)
US: US-E10.3 (implemented — reconcile only; design_src/edu/announcements.jsx existed from 1506 handoff)
Route: `/admin/announcements` (tạo + quản lý) · `/principal/announcements` (tạo + quản lý)
       Nhận qua Notifications Center (DR-006) cho tất cả roles
Roles: `admin`, `principal` (tạo/gửi) · tất cả roles (nhận)
Design file to create: `design_src/edu/announcements.jsx`

---

## Mục tiêu màn hình

BGH (admin hoặc principal) soạn và gửi thông báo toàn trường, theo khối lớp,
hoặc theo lớp cụ thể. Người nhận thấy thông báo trong Notifications Center.

---

## Layout chính — Create/Manage (admin/principal)

**List view** (sent announcements):
```
┌────────────────────────────────────────────────────────────────────┐
│ [megaphone icon] Họp phụ huynh cuối kỳ                           │
│                  Gửi đến: Tất cả phụ huynh · 12/06/2026 · 8:00  │
│                  Đã gửi: 312 người · Đã đọc: 280 (89%)           │
│                  [Xem chi tiết] [Xóa]                             │
└────────────────────────────────────────────────────────────────────┘
```

**"Tạo thông báo mới"** (primary button top right) → modal hoặc drawer.

**Create Announcement modal/drawer** (480px, tương tự subjects-dialogs.jsx):

**Form fields**:
- Tiêu đề * (input, max 200 ký tự)
- Nội dung * (textarea, rich-text optional hoặc plain, max 2000 ký tự)
- Gửi đến * (multi-select với preset options):
  - Tất cả (giáo viên + học sinh + phụ huynh)
  - Chỉ giáo viên
  - Chỉ phụ huynh
  - Chỉ học sinh
  - Theo khối lớp (multi-select: Lớp 10 / 11 / 12)
  - Theo lớp cụ thể (multi-select, load từ roster)
- Độ ưu tiên: Thông thường / Quan trọng / Khẩn (radio, màu tương ứng)
- Gửi ngay / Lên lịch (datetime picker)
- Đính kèm file (optional, max 3 files)

**Preview button**: "Xem trước" → hiện notification item preview.

**Actions**: "Gửi ngay" (primary) / "Lưu nháp" (outline) / "Hủy" (ghost).

---

## Detail view (sau khi click "Xem chi tiết")

- Nội dung đầy đủ announcement.
- Read receipt list: danh sách người đã đọc / chưa đọc với filter + export.
- "Gửi nhắc lại" button cho những người chưa đọc.

---

## States

**Empty**: "Chưa có thông báo nào. Gửi thông báo đầu tiên." + "Tạo thông báo" CTA.
**Draft chip**: badge "Nháp" (warning).
**Scheduled chip**: badge "Đã lên lịch" (primary) + thời gian.
**Sent chip**: badge "Đã gửi" (success).

---

## Dữ liệu mock

```js
[
  { id:'a1', title:'Họp phụ huynh cuối kỳ', priority:'important',
    audience:'Tất cả phụ huynh', sentAt:'12/06/2026', totalRecipients:312,
    readCount:280, status:'sent' },
  { id:'a2', title:'Thông báo lịch thi học kỳ 2', priority:'normal',
    audience:'Tất cả học sinh', sentAt:'10/06/2026', totalRecipients:480,
    readCount:412, status:'sent' },
  { id:'a3', title:'[Nháp] Kế hoạch hè 2026', priority:'normal',
    audience:'—', sentAt:'—', totalRecipients:0, readCount:0, status:'draft' },
]
```

---

## Tham chiếu màn hình tương tự

- `design_src/edu/subjects-dialogs.jsx` — modal/drawer pattern, form field style.
- `design_src/edu/classops.jsx` — list card pattern với status chips.
- `design_src/edu/messaging.jsx` — multi-select recipient concept.
- `design_src/edu/tokens.js` — màu sắc.

---

## Output cần từ designer

File: `design_src/edu/announcements.jsx`
Components: `AnnouncementsScreen` + `CreateAnnouncementDrawer`
