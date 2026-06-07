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

Status: **in_progress** — enforcement live; route-move of dashboards under the
tenant segment + URL slug migration remain.

URL shape: **B `/{locale}/t/{tenantId}`**. ⚠️ INTERIM tenant **UUID** in URL (BE
has no slug yet); migrate to slug when IAM exposes it — guard already keys on
`tenantId` so only `resolveFromPath`/`tenantUrl` change.

Done — primitives + guard:
- `bootstrap/tenant/`: `resolveTenant` (host→null phase 1; path reads tenantId
  after `/t/`), `tenantUrl(tenantId,path)`, `evaluateTenantAccess` (allowed /
  no-active-tenant / tenant-mismatch), `hasTenantMembership`/`rolesInTenant`.
- `bootstrap/lib/jwt.ts`: `decodeJwtClaims` + `decodeTenantId` edge-safe (`atob`
  fallback) so middleware can read the claim in the edge runtime.
- `bootstrap/i18n/locales.ts` extracted (resolver/middleware avoid next/navigation).
- `middleware.ts`: next-intl → `resolveTenant` → **enforce** claim match on
  `/t/{tenantId}`; mismatch/no-scope → redirect `/{locale}/select-tenant?from=…`;
  sets `x-tenant-id`. Round-trip-free (token claim, not a per-request BE call).

Done — BE integration (US-020) + UI:
- `features/tenant/`: entity `TenantMembership` (+`isSwitchable`), `i-tenant.repository`,
  DTOs/mapper, real `TenantRepository` (`GET /members/me/tenants`,
  `POST /members/switch-tenant` with `clientId`), `MockTenantRepository`
  (mints a fake JWT carrying the `tenantId` claim so the dev flow works), DI
  (mock-first), use-cases `ListMyMemberships` + `SwitchTenant`.
- `(auth)/select-tenant` page + `switchTenantAction` (switch → `setAuthCookies`
  → redirect into tenant) + tenant home `t/[tenant]` (guarded landing).
- i18n `tenant.*` (vi + en).

Proof:
- Unit/integration: `tenant.test.ts` (15 — resolve/url/guard/membership),
  `jwt.test.ts` (+3 decodeTenantId), `tenant.use-cases.test.ts` (3).
- Platform: **85 vitest pass**, `tsc --noEmit` clean, `next build` green
  (routes `/select-tenant`, `/t/[tenant]`); next-intl matcher intact.

Remaining (follow-up):
- Route-move the role dashboards under `/t/{tenantId}/{role}` + wire the in-shell
  role/tenant switcher to call `switch-tenant`; migrate URL tenantId→slug when BE
  exposes a slug. E2E (login → switch → land in tenant; cross-tenant URL blocked)
  after the route-move.
