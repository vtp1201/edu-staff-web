# Overview — US-E05.1 Tenant Path Resolver

## Current Behavior

- `src/middleware.ts` chỉ chạy `next-intl` middleware (locale routing). Không có
  khái niệm tenant ở runtime.
- Segment `src/app/[tenant]/` tồn tại nhưng chưa wiring; routes thật nằm dưới
  `app/[locale]/(app)/<role>/`.
- Domain đã model tenant-scoped role (`UserTenantRole = { role, tenantId,
  tenantName }`) nhưng chưa có gì resolve tenant từ request hay scope quyền theo
  tenant.

## Target Behavior

- Mỗi request được resolve về một tenant theo **path-first** (decision `0007`):
  `/{tenant}/{locale}/...` (hoặc `/t/{slug}/...` — chốt ở design).
- Một hàm `resolveTenant(request)` duy nhất, thử **host → path → fallback**, trả
  `{ tenantId, slug, mode } | null`. Giai đoạn này nhánh host trả `null` (chừa
  chỗ hybrid).
- Middleware compose: `resolveTenant` → gắn tenant vào request → next-intl. Route
  không hợp lệ / tenant không tồn tại → 404 hoặc redirect về chọn tenant.
- Auth guard theo tenant scope: user chỉ vào được tenant mà họ có membership
  (`AuthUser.roles`); sai tenant → từ chối.
- Mọi link nội bộ đi qua helper `tenantUrl(tenant, path)` (chuẩn bị hybrid).

## Affected Users

- Mọi role đã đăng nhập (`teacher`, `principal`, `student`, `parent`) — vì mọi
  workspace route giờ nằm trong phạm vi tenant.

## Affected Product Docs

- `docs/product/roles-permissions.md` (tenant scope enforcement)
- `docs/product/overview.md` (multi-tenant surface)
- `docs/decisions/0007-multi-tenancy-resolution.md`

## Non-Goals

- Subdomain / custom-domain resolution (giai đoạn 2 — cookie đa miền, tenant
  registry).
- Màn `/select-role` và `/select-tenant` UI hoàn chỉnh (chỉ cần đủ để guard
  hoạt động).
- Provisioning tenant (BE-side, SUPER_ADMIN — ngoài phạm vi web).
