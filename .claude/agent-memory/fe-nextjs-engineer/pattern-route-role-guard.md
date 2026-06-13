---
name: pattern-route-role-guard
description: Server-side namespace route guard (admin/*) via RSC layout + pure evaluate fn + jwt role claim
metadata:
  type: project
---

Admin/* route authorization (US-E12.8, ADR 0024) uses a 3-piece split so the policy is unit-testable:

1. `bootstrap/lib/jwt.ts` `decodeRoleClaim(token)` — pure (no `server-only`, lives with other jwt helpers). Mock-first: `NEXT_PUBLIC_USE_MOCK==="true" && token.length>0 → "admin"`. Real: scalar `role` claim first, then `memberRoles[0]` fallback, validated against `UserRole` set.
2. `bootstrap/tenant/role-guard.ts` `evaluateAdminAccess(role, locale, tenantId)` → `{ verdict: "allowed"|"redirect-to-default"|"redirect-to-auth", redirectUrl }`. Pure; non-admin uses `tenantUrl(tenantId, DEFAULT_ROUTE[role])` with `/${locale}` prefix; null → `/${locale}/select-tenant`.
3. `app/[locale]/t/[tenant]/(app)/admin/layout.tsx` — `import "server-only"` RSC; `await params` (Next 16), `getAccessToken()`, decode, evaluate, `redirect()` from `next/navigation` on non-allowed, else `<>{children}</>`.

**Why:** httpOnly cookie token → role checkable server-side only; keeping the policy in two pure fns means the layout itself needs no unit test (covered by tsc + build).
**How to apply:** Reuse this shape for any other role-namespaced route tree. Note the per-namespace `admin/layout.tsx` is separate from the shared `(app)/layout.tsx` (which still hardcodes role for the AppShell).

Gotcha: inserting into `bootstrap/tenant/index.ts` exports triggers Biome `organizeImports` sort — run `bun lint:fix` after adding a re-export. See [[gotcha-role-record-ripple]] for the UserRole/Record ripple.
