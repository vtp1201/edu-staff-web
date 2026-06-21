# Design Requests

Thư mục này chứa các design prompt gửi cho designer, cho các màn hình chưa có
file `.jsx` trong `design_src/edu/`.

Mỗi file là một design request đầy đủ, sẵn sàng gửi cho designer.

## Convention

- File: `DR-NNN-<slug>.md` (NNN = số thứ tự 3 chữ số).
- Khi designer hoàn thành: cập nhật story packet tương ứng với path
  `design_src/edu/<file>.jsx` mới.
- Đánh dấu status `[x] delivered` trong file DR khi nhận được design.

## Active Requests

| DR | Màn hình | US | Status |
| --- | --- | --- | --- |
| DR-001 | Assessment Scheme Config | US-E12.6 | [x] delivered (2026-06-20) |
| DR-002 | Grade Book Detail (nhập điểm cuối kỳ + báo cáo) | US-E13.1 | [x] delivered (2026-06-20) |
| DR-003 | Teaching Plan / PPCT | US-E11.4 (was stale US-E13.2) | [x] delivered (2026-06-20) |
| DR-004 | Lesson Bank | US-E11.2 (stale: DR said US-E13.3 = Class Log) | [x] delivered (2026-06-20) |
| DR-005 | Exam Bank + Builder | US-E11.3 (stale: DR said US-E13.4) | [x] delivered (2026-06-20) |
| DR-006 | Notifications Center | US-E10.2 | [x] delivered (2026-06-20) |
| DR-007 | Announcements (BGH gửi thông báo) | US-E10.3 | [x] delivered (2026-06-20) |
| DR-008 | Group Chat (mở rộng từ messaging.jsx) | US-E10.4 (not US-E10.1; group-lifecycle net-new) | [x] delivered (2026-06-20) |
| DR-009 | Impeccable anti-pattern fixes (side-stripe ban, error contrast, a11y, GPU transition, bounce easing) | US-E16.1–E16.5 | [x] delivered (2026-06-21) |
| DR-010 | Responsive grid + empty states (UX-03 mobile breakpoints + UX-01 empty-state pattern) | UX-03 + UX-01 | [x] delivered (2026-06-21) |
| DR-011 | UX Polish: Confirmations, Navigation, Loading & Feedback (UX-02/04/05/06/07/08) | UX-02 + UX-04 + UX-05 + UX-06 + UX-07 + UX-08 | [ ] delivered |
