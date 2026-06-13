# Design — US-E12.8 Admin Route Role Guard

## Domain Model

No new domain entities. Reuses:
- `UserRole` from `auth-user.entity.ts` (`"teacher" | "principal" | "student" | "parent" | "admin"`).
- `DEFAULT_ROUTE: Record<Role, string>` from `nav-config.ts`.

New pure logic:
- `decodeRoleClaim(token: string): UserRole | null` — reads `role` (or
  `memberRole`) scalar claim from JWT payload. Returns `null` if token is
  unreadable or claim is not a known UserRole value. No `server-only` guard
  (pure, testable in node, mirrors `decodeJwtExp` / `decodeTenantId`).
- `evaluateAdminAccess(role: UserRole | null, locale: string, tenantId: string)`
  returns `{ verdict: "allowed" | "redirect-to-default" | "redirect-to-auth", redirectUrl: string }`.

## Application Flow

```
request → proxy.ts (tenant guard, US-E05.1)
       → (app)/admin/layout.tsx (NEW — RSC, server-only)
             ├─ getAccessToken()            // auth-token.server.ts
             ├─ decodeRoleClaim(token)      // jwt.ts
             ├─ evaluateAdminAccess(role, locale, tenantId)
             ├─ verdict="allowed"           → render children
             ├─ verdict="redirect-to-default" → redirect(tenantUrl(tenantId, DEFAULT_ROUTE[role]))
             └─ verdict="redirect-to-auth"  → redirect(`/${locale}/select-tenant`)
```

The guard is stateless and round-trip-free: the claim is already in the
cookie JWT — no API call needed (same pattern as tenant guard in `proxy.ts`).

## Interface Contract

`role-guard.ts` (pure, exported from `bootstrap/tenant/`):
```ts
export type AdminAccessVerdict =
  | "allowed"
  | "redirect-to-default"   // authenticated, wrong role
  | "redirect-to-auth";     // no token / unreadable claim

export interface AdminAccessResult {
  verdict: AdminAccessVerdict;
  redirectUrl: string;       // canonical redirect target (empty string for "allowed")
}

export function evaluateAdminAccess(
  role: UserRole | null,
  locale: string,
  tenantId: string,
): AdminAccessResult
```

`jwt.ts` extension (pure, no server-only):
```ts
export function decodeRoleClaim(token: string): UserRole | null
```

## Data Model

No schema or migration changes. JWT is read-only from cookie.

## UI / Platform Impact

- New file: `src/app/[locale]/t/[tenant]/(app)/admin/layout.tsx` (RSC, `import 'server-only'`).
  This wraps all existing `/admin/*` pages without changing them.
- No new UI component — redirect is server-side via `next/navigation` `redirect()`.
- No design-review gate needed (this layout renders no UI — it either passes
  children through or issues a redirect).

## Mock-First Strategy (decision 0014)

When `NEXT_PUBLIC_USE_MOCK=true`, `decodeRoleClaim` returns `"admin"` for any
non-null, non-empty token (even a fake JWT). This lets all current dev/test
flows for school-setup and calendar continue to work without a real IAM
admin-role claim. The mock branch is clearly gated and documented in ADR 0024.

When mock=false and IAM issues real tokens, `decodeRoleClaim` reads the `role`
scalar claim (IAM decision 0022 / US-049 dependency). If IAM instead issues
`memberRoles: string[]`, the implementation maps `memberRoles[0]` to the scalar
— the unit test fixtures cover both shapes.

## Observability

`admin/layout.tsx` logs `[admin-guard] verdict=<verdict> locale=<locale> tenant=<id>`
in non-production environments (mirrors the tenant guard log in `proxy.ts`).

## Alternatives Considered

1. **Middleware-level guard (extend `proxy.ts`)**: edge runtime — `cookies()` is
   not available in the edge (Next.js 14+); cookie is httpOnly. Would require
   reading cookie via `request.cookies` which works, but mixing tenant + role
   guard in one middleware makes it harder to test and evolves the middleware
   beyond its current single responsibility (tenant scope). RSC layout guard is
   the idiomatic Next.js 16 pattern for role-based rendering gates.

2. **Client-side guard (redirect in a `useEffect`)**: never acceptable for a
   hard-gate Authorization story — content would be rendered momentarily before
   redirect, leaking admin UI to non-admin users.

3. **Middleware + RSC dual guard**: would add defense-in-depth but the
   edge-runtime cookie read is noisier. Deferred as a follow-up hardening step.
