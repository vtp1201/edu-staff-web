# 0007 Multi-Tenancy Resolution Strategy

Date: 2026-06-06

## Status

Accepted

## Context

EduPortal định hướng đa tenant (mỗi tenant ≈ một trường / tổ chức). Domain **đã
model** tenant-scoped role: `UserTenantRole = { role, tenantId, tenantName }`,
và một user có thể nắm nhiều role trên nhiều tenant (login redirect
`/select-role` khi >1 role).

Tuy nhiên **cơ chế resolve tenant ở tầng routing/middleware chưa được chọn**.
Segment `src/app/[tenant]/` đã tồn tại nhưng chưa wiring. Điều này chặn epic E05
(Multi-tenancy) và ảnh hưởng cách enforce "quyền trong phạm vi tenant" ở runtime,
cách build URL, và cách isolate dữ liệu giữa các tenant.

## Decision

**Path-first, hybrid-ready.**

- **Giai đoạn 1**: chỉ resolve tenant theo **path** (`/t/{slug}/...`), tái dùng
  segment `src/app/[tenant]/` đã có. Cookie `auth_token` giữ trên một host duy
  nhất; dev local đơn giản.
- **Kiến trúc sẵn cho hybrid**: tách một hàm `resolveTenant(request)` riêng ở
  `middleware.ts`, thử **host trước → path sau → fallback**, rồi *rewrite* về
  route canonical mang `tenantId`. Giai đoạn 1 nhánh host trả `null`; thêm
  subdomain/custom-domain sau **không đụng presentation**.
- Mọi link nội bộ đi qua helper `tenantUrl(tenant, path)` ngay từ đầu, để khi
  bật subdomain không phải sửa rải rác.

Khi mở subdomain (giai đoạn 2): cần tenant registry (`host → tenantId`), và
cookie set trên parent domain `.eduportal.com`; custom domain (vd `truonga.edu.vn`)
sẽ đăng nhập riêng — ghi decision bổ sung khi tới đó (auth = hard gate).

## Alternatives Considered

1. **Path-based** (`/{tenant}/{locale}/...` hoặc `/{locale}/{tenant}/...`).
   Tenant nằm trong URL path; resolve ở middleware/layout. Segment `[tenant]`
   hiện có nghiêng về hướng này.
2. **Subdomain-based** (`acme.eduportal.com`). Resolve tenant qua hostname ở
   middleware. Tách biệt rõ, thân thiện branding; cần wildcard DNS + cấu hình
   hạ tầng.
3. **Single-tenant hiện tại, multi-tenant sau**. Chạy 1 tenant mặc định, không
   active routing đa tenant cho tới khi có nhu cầu thật; giữ model dữ liệu sẵn
   sàng.

## Consequences

Positive:

- Chốt sớm giúp thống nhất cách build URL, middleware, và data scoping.
- Domain đã sẵn sàng (role gắn tenant) nên chi phí chủ yếu ở routing + auth
  guard.

Tradeoffs:

- Path-based: URL dài hơn, phải truyền tenant qua mọi link nội bộ.
- Subdomain: phụ thuộc hạ tầng DNS/cert, khó test local hơn.
- Single-tenant trước: nợ kỹ thuật khi bật đa tenant về sau.

## Follow-Up

- Giai đoạn 1 (story E05.1): `resolveTenant()` + middleware rewrite path-based;
  `tenantUrl()` helper; auth guard theo tenant scope
  (`docs/product/roles-permissions.md`).
- ✅ **URL shape chốt = B**: `/{locale}/t/{tenantId}/...` (locale ngoài cùng,
  next-intl matcher giữ nguyên; `/t/` tách tenant khỏi reserved route).
  ⚠️ **INTERIM tenantId-in-URL → migrate slug sau**: BE IAM định danh tenant
  bằng **UUID** (không có field `slug` trên `MembershipSummary`/`TenantResponse`,
  iam openapi). Path segment mang UUID tạm; khi BE thêm slug → đổi `resolveFromPath`
  (slug→id) + `tenantUrl`, guard đã key theo `tenantId` nên không đổi.
- ✅ **BE blocker GỠ** (BE US-020 implemented): IAM giờ có
  `GET /members/me/tenants` (memberships `{tenantId, roles[], status}`) +
  `POST /members/switch-tenant` (mint token **tenant-scoped**, claim `tenantId`,
  403 nếu non-member/suspended).
- ✅ **Enforcement implemented (US-E05.1)**: guard claim-based round-trip-free —
  URL tenantId phải khớp claim `tenantId` của access token; lệch/thiếu →
  redirect `/select-tenant`. `bootstrap/tenant/` (`resolveTenant`(tenantId),
  `tenantUrl`, `evaluateTenantAccess`, `hasTenantMembership`); `jwt.decodeTenantId`
  edge-safe (atob); middleware enforce trên `/t/{tenantId}`. Data layer
  `features/tenant/` (memberships + switch-tenant, real+mock, DI, use-cases).
  Màn `/select-tenant` (list + switch) + tenant home `/t/[tenant]`. 27 unit, build green.
- ✅ **Route-move xong (đóng story)**: workspace chuyển dưới
  `app/[locale]/t/[tenant]/(app)/`; layout tenant-aware truyền `tenantId` vào
  `AppShell`; Sidebar build href + active-match qua `tenantUrl`; role-switch
  điều hướng trong tenant. Flow: login → `/select-tenant` → switch (mint token
  tenant-scoped) → `/t/{tenantId}/{role}`; middleware chặn cross-tenant.
- ⏭ **Enhancement (không chặn)**: migrate URL tenantId→slug khi BE expose slug
  (guard key theo `tenantId`); in-shell TENANT switcher riêng (re-call
  `switch-tenant`); derive role từ claim `memberRoles` (role-guard — story riêng).
- Giai đoạn 2 (sau, khi có tenant cần custom domain): tenant registry
  `host → tenantId`, cookie parent-domain, decision bổ sung cho cookie/auth đa
  miền.
- Cập nhật `docs/ARCHITECTURE.md` (gỡ multi-tenancy khỏi Open Decisions, ghi
  path-first) và `spec-intake.md` (E05 unblocked).
- Đăng ký durable row qua `scripts/bin/harness-cli decision add`.
