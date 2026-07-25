# Roles & Permissions — EduPortal

Hợp đồng phân quyền (RBAC). Auth *là ai* nằm ở `docs/product/auth.md`; file này
mô tả *được làm gì*.

## Năm role

> Cập nhật (2026-07-12, batch DR-012..019 BA intake): tài liệu này trước đây
> chỉ liệt kê 4 role nhưng decision `0022` (admin-role-separation) đã thêm
> role thứ 5 `admin` cho các màn admin-core (school-setup, calendar, subjects,
> roster, và giờ thêm parent-links/invitations/moderation — xem bảng dưới).
> `nav-config.ts` (`Role` union) là nguồn chân lý runtime, khớp danh sách này.

```text
UserRole = "teacher" | "principal" | "student" | "parent" | "admin"
```

## Model: role gắn tenant

Quyền không gắn phẳng vào user mà gắn theo **cặp (role, tenant)**:

```text
AuthUser.roles: UserTenantRole[]
UserTenantRole = { role, tenantId, tenantName }
```

Hệ quả nghiệp vụ:

- Một người có thể là `teacher` ở trường A và `parent` ở trường B cùng lúc.
- Quyền luôn được hiểu trong phạm vi một tenant — không có quyền "toàn cục".
- Sau đăng nhập:
  - đúng **1** role → vào thẳng `/{role}`.
  - **nhiều** role → màn chọn role `/select-role` trước khi vào workspace.

## Ranh giới truy cập theo role (hiện tại)

| Khu vực | Route group | Role được vào |
| --- | --- | --- |
| Workspace giáo viên | `(app)/teacher/**` | `teacher` |
| Điểm danh | `(app)/teacher/attendance` | `teacher` |
| Lịch dạy cá nhân (read-only) | `(app)/teacher/schedule` | `teacher` |
| Dashboard hiệu trưởng | `(app)/principal/**` | `principal` |
| Cổng học sinh | `(app)/student/**` | `student` |
| Cổng phụ huynh | `(app)/parent/**` | `parent` |
| Hồ sơ cá nhân | `(app)/(shared)/profile` | mọi role đã đăng nhập |
| Admin core (school-setup, calendar, subjects, roster, parent-links US-E20.1, invitations US-E21.1) | `(app)/admin/**` | `admin` (decision `0022`/`0024`; mock-role bypass khi `NEXT_PUBLIC_USE_MOCK=true`) |
| Kiểm duyệt nội dung (report queue + audit log, US-E19.2) | `(app)/principal/moderation` | `principal` |
| Báo cáo toàn trường (US-E03.1) | `(app)/principal/reports` | `principal` |
| Bảng tin (đăng/bình luận/báo cáo nội dung, US-E19.1) | `(app)/(shared)/feed` | mọi role đã đăng nhập (composer role-gated theo scope trường/lớp — xem spec) |

## Quy tắc

- Route chưa đăng nhập (no `auth_token` hợp lệ) → chuyển về `/login`.
- Role A **không** được truy cập workspace của role B; vi phạm → từ chối /
  redirect về workspace hợp lệ của chính họ.
- Authorization là **hard gate** trong intake — mọi thay đổi quy tắc truy cập
  theo role/tenant là high-risk và cần decision.
- **RSC layout guard cho MỌI namespace theo role** (cập nhật 2026-07-25, INFRA
  rsc-layout-guards-role-groups, đóng gap ghi trong ADR `0063`): không chỉ
  `(app)/admin/**` — `(app)/principal/**`, `(app)/teacher/**`,
  `(app)/student/**`, `(app)/parent/**` mỗi group đều có `layout.tsx` riêng gọi
  `evaluateNamespaceAccess(role, locale, tenant, requiredRole)`
  (`src/bootstrap/tenant/role-guard.ts`) — deny-by-default, redirect về
  default route của role gọi sai, hoặc `/select-tenant` nếu chưa đăng nhập.
  `(app)/(shared)/**` (profile, feed, messages, notifications) KHÔNG có guard
  theo role vì cố ý cho mọi role đã đăng nhập — vẫn được bọc bởi auth+tenant
  check ở `(app)/layout.tsx` ngoài cùng.

## Chưa chốt

- **Tenant scope ở tầng routing/middleware**: đã chốt path-first, hybrid-ready
  (decision `0007`). Enforce "quyền trong phạm vi tenant" sẽ gắn vào
  `resolveTenant()` + auth guard ở middleware (story E05.1). Cookie đa miền cho
  subdomain để giai đoạn 2.
- Quyền chi tiết trong từng workspace (vd hiệu trưởng có sửa điểm danh của giáo
  viên không) — định nghĩa khi epic tương ứng vào story.
