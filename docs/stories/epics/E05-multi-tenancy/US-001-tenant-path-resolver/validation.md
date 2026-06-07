# Validation — US-E05.1 Tenant Path Resolver

## Proof Strategy

Story xong khi: (1) `resolveTenant` resolve đúng theo path và trả `null` đúng
lúc; (2) user không thể vào tenant ngoài membership; (3) link nội bộ luôn mang
tenant; (4) `next build` xanh.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | `resolveTenant`: path hợp lệ → tenant; path thiếu → null; host luôn null (phase 1); `tenantUrl` sinh đúng path-form |
| Integration | middleware: request có/không tenant → rewrite/redirect đúng; guard: user có role trong tenant → pass, không có → 403/redirect |
| E2E | login (1 role) → vào đúng `/{tenant}/{role}`; truy cập tenant lạ qua URL → bị chặn |
| Platform | `next build` xanh; next-intl matcher không vỡ |
| Performance | resolver chạy trong middleware, không thêm round-trip BE thừa mỗi request |
| Logs/Audit | middleware log `tenantId` + `requestId` cho cross-tenant attempt |

## Fixtures

- User A: membership `teacher@tenant-acme`.
- User B (multi): `teacher@tenant-acme` + `parent@tenant-beta`.
- Tenant `acme` (active), `beta` (active), `ghost` (không tồn tại).

## Commands

```text
TBD — bun vitest run (unit/integration), bun build (platform)
```

## Acceptance Evidence

Status: **in_progress** — unblocked primitives done; enforcing guard deferred
(BE membership blocker, hard gate Authorization).

Done:
- `bootstrap/tenant/resolve-tenant.ts` (`resolveTenant`, shape B), `tenant-url.ts`
  (`tenantUrl`), `membership.ts` (`hasTenantMembership`/`rolesInTenant`).
- `bootstrap/i18n/locales.ts` extracted (so resolver/middleware avoid pulling
  next/navigation); `routing.ts` reuses it.
- `middleware.ts`: next-intl → `resolveTenant` → `x-tenant-slug` header + dev
  trace `slug/mode/requestId` (RESOLVE + observe; no enforcement).
- Unit: 13 cases (`tenant.test.ts`) — path resolve / missing-`/t/` → null /
  unknown locale → null / missing slug → null / host → null (phase 1);
  `tenantUrl` path-form; membership pass/block + `rolesInTenant`.
- Platform: **74 vitest pass**, `tsc --noEmit` clean, `next build` green,
  next-intl matcher intact.

Deferred (BE dependency — decision `0007` follow-up):
- Integration guard (slug→tenantId map + `AuthUser.roles` check → 403/redirect)
  and route-move under `app/[locale]/t/[tenant]/`. Blocked: IAM exposes no
  membership endpoint and `UserTenantRole` lacks `slug`. Re-open when BE ships
  memberships; flip middleware from observe → enforce, add integration + e2e.
