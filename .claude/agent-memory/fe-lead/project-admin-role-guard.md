---
name: project-admin-role-guard
description: Pattern and outcome for US-E12.8 admin namespace RBAC guard — RSC layout, decodeRoleClaim, evaluateAdminAccess
metadata:
  type: project
---

Implemented in US-E12.8 (2026-06-13, HIGH-RISK, decision 0022/0024).

Pattern: RSC layout guard for namespace-level role enforcement.

- `src/bootstrap/lib/jwt.ts` — `decodeRoleClaim(token)`: reads `role` scalar (or `memberRoles[0]` fallback) from JWT payload. Mock bypass: `NODE_ENV !== "production" && NEXT_PUBLIC_USE_MOCK === "true"` returns `"admin"` for any non-empty token.
- `src/bootstrap/tenant/role-guard.ts` — `evaluateAdminAccess(role, locale, tenantId)`: pure 3-state verdict (`allowed` / `redirect-to-default` / `redirect-to-auth`).
- `src/app/[locale]/t/[tenant]/(app)/admin/layout.tsx` — RSC, `import "server-only"`, reads cookie → decode role → guard → redirect or render children.

**Why:** `redirect()` in Next.js RSC throws NEXT_REDIRECT and short-circuits before any children render — no partial-render leak.

**Layer smell:** `role-guard.ts` imports `DEFAULT_ROUTE` from `components/layout/app-shell/sidebar/nav-config` (layer-direction inverted). Works because `nav-config.ts` has no `'use client'`. Follow-up: relocate `DEFAULT_ROUTE`/`Role` to `bootstrap/` shared module. Tracked as backlog #1.

**Mock bypass hardening:** must add `NODE_ENV !== "production"` alongside `NEXT_PUBLIC_USE_MOCK` check in `decodeRoleClaim` — otherwise a misconfigured prod build could grant admin to all authenticated users.

**How to apply:** Use the same pattern for future namespace guards (`/principal/*`, `/teacher/*`) — create a role-specific guard function in `role-guard.ts`, add a layout at the namespace level, call `evaluateAdminAccess`-equivalent. Do NOT use middleware for role guards (edge runtime + httpOnly cookie friction).
