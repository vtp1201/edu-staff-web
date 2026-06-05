# Roles & Permissions — EduPortal

Hợp đồng phân quyền (RBAC). Auth *là ai* nằm ở `docs/product/auth.md`; file này
mô tả *được làm gì*.

## Bốn role

```text
UserRole = "teacher" | "principal" | "student" | "parent"
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
| Dashboard hiệu trưởng | `(app)/principal/**` | `principal` |
| Cổng học sinh | `(app)/student/**` | `student` |
| Cổng phụ huynh | `(app)/parent/**` | `parent` |
| Hồ sơ cá nhân | `(app)/(shared)/profile` | mọi role đã đăng nhập |

## Quy tắc

- Route chưa đăng nhập (no `auth_token` hợp lệ) → chuyển về `/login`.
- Role A **không** được truy cập workspace của role B; vi phạm → từ chối /
  redirect về workspace hợp lệ của chính họ.
- Authorization là **hard gate** trong intake — mọi thay đổi quy tắc truy cập
  theo role/tenant là high-risk và cần decision.

## Chưa chốt

- **Tenant scope ở tầng routing/middleware**: đã chốt path-first, hybrid-ready
  (decision `0007`). Enforce "quyền trong phạm vi tenant" sẽ gắn vào
  `resolveTenant()` + auth guard ở middleware (story E05.1). Cookie đa miền cho
  subdomain để giai đoạn 2.
- Quyền chi tiết trong từng workspace (vd hiệu trưởng có sửa điểm danh của giáo
  viên không) — định nghĩa khi epic tương ứng vào story.
