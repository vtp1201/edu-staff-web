# Design — US-E05.1 Tenant Path Resolver

## Domain Model

Tái dùng entity sẵn có, không thêm field domain:

```text
UserTenantRole = { role, tenantId, tenantName }   // membership của user
AuthUser.roles : UserTenantRole[]                  // nguồn chân lý quyền-theo-tenant
```

Khái niệm mới (giá trị runtime, không phải entity domain):

```text
ResolvedTenant = { tenantId, slug, mode: "path" | "host" }
```

## Application Flow

- `resolveTenant(request): ResolvedTenant | null`
  1. **host** — phase này luôn `null` (chừa chỗ hybrid giai đoạn 2).
  2. **path** — đọc segment tenant từ URL.
  3. **fallback** — không resolve được → `null` (middleware xử lý redirect/404).
- Guard membership: với `ResolvedTenant` + `AuthUser.roles`, kiểm tra user có
  role trong `tenantId` đó không. Không có → 403/redirect.

## Interface Contract

- **URL shape — CHỐT = B**: `/{locale}/t/{slug}/...` (giữ locale ngoài cùng,
  next-intl matcher không đổi; `/t/` tách tenant khỏi reserved route). Phương án
  A (`/{tenant}/{locale}`) bị bỏ vì phải wrap lại next-intl middleware. Khớp
  decision `0007` (`/t/{slug}` phase 1).
- `tenantUrl(slug, path)` — sinh path locale-relative `/t/{slug}{path}`
  (next-intl `Link`/router tự thêm prefix locale).
- Middleware compose: `next-intl` → `resolveTenant` → set header `x-tenant-slug`
  + trace requestId. Matcher `/(vi|en)/:path*` đã cover `/t/{slug}` (nằm trong
  locale) → không cần đổi.
- ⛔ **Enforcing guard + route-move hoãn** (BE blocker, hard gate): cần
  membership `slug → { tenantId, role }` từ IAM (chưa có) để map slug→tenantId
  và check `AuthUser.roles`. Đã implement predicate `hasTenantMembership` (pure,
  tested), chỉ thiếu nguồn dữ liệu BE để wiring enforcement.

## Data Model

Không có DB phía web. Tenant membership đến từ BE (xem Open Questions).

## UI / Platform Impact

- Mọi link workspace nội bộ phải qua `tenantUrl()`.
- Redirect sau login (`/{role}` hoặc `/select-role`) phải mang tenant.
- Layout `app/[tenant]/` nhận tenant resolved.

## Observability

- Log `tenantId` + `requestId` (echo `X-Request-Id`, xem
  `.claude/rules/api-integration.md`) trong middleware để truy vết cross-tenant.

## Open Questions (BE dependency)

> **Chặn implementation cho tới khi trả lời.** Theo
> `edu-api/.../iam/docs/INTEGRATION.md`, IAM hiện expose:
> `/users/me` (profile), JWT claim `platformRole` (`SUPER_ADMIN`/`TENANT_OWNER`),
> `/tenants/{id}` (SUPER_ADMIN only). **Chưa thấy** endpoint trả tenant membership
> dạng `slug → { tenantId, role }` cho user thường.

1. Web lấy danh sách `UserTenantRole` của user từ đâu? (`/users/me` có trả
   memberships không, hay cần endpoint mới?)
2. Tenant được định danh trên URL bằng **slug** hay **id**? BE `/tenants/{id}`
   dùng id; path đẹp cần slug → cần map slug→id.
3. JWT có chứa tenant context không, hay web tự gắn theo path?

## Alternatives Considered

1. Resolve tenant trong layout RSC thay vì middleware — bỏ, vì guard cần chạy
   trước khi render và áp cho mọi route.
2. Lưu tenant hiện tại vào cookie riêng — hoãn sang giai đoạn 2 (đụng auth hard
   gate, đa miền).
