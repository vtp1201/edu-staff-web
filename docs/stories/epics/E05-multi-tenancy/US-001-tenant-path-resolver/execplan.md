# Exec Plan — US-E05.1 Tenant Path Resolver

## Goal

Bật multi-tenancy path-first: mỗi request resolve được tenant và quyền được scope
theo tenant, với kiến trúc sẵn sàng mở subdomain sau (decision `0007`).

## Scope

In scope:

- `resolveTenant(request)` (host → path → fallback; host = `null` ở phase này).
- Wiring middleware: compose tenant resolver + next-intl.
- `tenantUrl(tenant, path)` helper; thay link workspace nội bộ qua helper.
- Auth guard: chặn truy cập tenant ngoài membership của user (`AuthUser.roles`).
- Cập nhật route shape `[tenant]` để mang tenant vào layout/segment.

Out of scope:

- Subdomain / custom domain (giai đoạn 2).
- UI chọn tenant/role hoàn chỉnh.
- Tenant provisioning (BE).

## Risk Classification

Risk flags:

- Authorization (tenant scope, role-per-tenant).
- Auth (đụng luồng session/redirect sau login).
- Public contracts (URL shape đổi → mọi link nội bộ).
- Existing behavior (middleware + routing hiện có).
- Multi-domain (chạm auth + routing + roles).

Hard gates:

- Authorization.
- Auth.

## Work Phases

1. Discovery — xác nhận cách web biết membership của user (BE dependency, xem
   design "Open Questions").
2. Design — chốt URL shape (`/{tenant}/{locale}` vs `/t/{slug}`), contract
   `resolveTenant`, vị trí guard.
3. Validation planning — test matrix (unit resolver, integration guard, e2e).
4. Implementation — resolver → middleware → helper → guard → route.
5. Verification — chạy test + `next build`; thử cross-tenant access bị chặn.
6. Harness update — cập nhật product docs + `.claude/rules/api-integration.md`.

## Stop Conditions

Pause for human confirmation if:

- BE chưa cung cấp được tenant membership của user (slug → tenant + role) →
  resolver/guard không có nguồn chân lý. **Đây là dependency đang mở.**
- URL shape cuối cùng đổi (path order tenant/locale) — ảnh hưởng SEO/link.
- Cần đụng cookie/session để mang tenant (auth hard gate).
- next-intl matcher xung đột với segment tenant.
