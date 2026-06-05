# Product Overview — EduPortal

## Là gì

**EduPortal** là hệ thống quản lý giáo dục cho trường học, phục vụ bốn nhóm
người dùng với các luồng công việc khác nhau, định hướng vận hành **đa tenant**
(mỗi tenant ≈ một trường / tổ chức giáo dục).

## Người dùng & giá trị

| Role | Người dùng | Giá trị chính |
| --- | --- | --- |
| `teacher` | Giáo viên | Điểm danh lớp, xem lịch sử điểm danh các lớp mình dạy |
| `principal` | Hiệu trưởng | Giám sát, quản lý cấp trường (dashboard) |
| `student` | Học sinh | Xem tình trạng điểm danh, thông báo của bản thân |
| `parent` | Phụ huynh | Theo dõi điểm danh / thông báo của con |

Một người dùng có thể nắm **nhiều role trên nhiều tenant** cùng lúc (model
`UserTenantRole[]`). Khi đăng nhập mà có >1 role, hệ thống đưa tới màn chọn role
(`/select-role`); chỉ 1 role thì vào thẳng workspace của role đó.

## Phạm vi hiện tại (slice đã chạy được)

- **Đăng nhập** (E01): login bằng email/mật khẩu, session cookie httpOnly.
- **Điểm danh giáo viên** (E02): chọn lớp → tải roster → đánh trạng thái
  (`present` / `excused` / `absent`) → lưu; xem lịch sử buổi đã điểm danh.

Các role principal / student / parent đã có route khung nhưng nội dung nghiệp vụ
chưa cắt story.

## Surface

Browser web app (Next.js 16). Đa ngôn ngữ `vi` (mặc định) / `en`. Chưa có
mobile / desktop / CLI.

## Ranh giới sản phẩm

- Web **không** sở hữu dữ liệu — mọi state đi qua REST API riêng (cùng team sở
  hữu). Feature chưa có backend chạy bằng mock repository.
- Multi-tenancy: domain đã model role gắn `tenantId`/`tenantName`, nhưng **cơ
  chế resolve tenant ở tầng routing chưa chốt** (open decision — xem
  `docs/ARCHITECTURE.md`).

## Liên quan

- Kiến trúc & boundary: `docs/ARCHITECTURE.md`
- Roles & quyền: `docs/product/roles-permissions.md`
- Auth: `docs/product/auth.md`
- Điểm danh: `docs/product/attendance.md`
- Quy ước API: `docs/product/api-conventions.md`
