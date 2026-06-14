---
name: project-e01-auth
description: E01 Auth & RBAC epic state — which US are done, key patterns, ADRs
metadata:
  type: project
---

## US-E01.1 — Email login + token flow
Status: implemented. Cookie pattern: httpOnly auth_token + refresh_token + session_id + auth_token_exp (proactive refresh). AUTH_EP aligned to IAM. See auth.di.ts + auth-token.server.ts.

## US-E01.2 — SSO (Google + VNeID) + multi-role select
Status: implemented (2026-06-14). 304 tests, tsc clean, build green, WCAG AA passed.

Key patterns established:
- `UserTenantRole.roleEnum` (BE raw enum like "TEACHER") preserved alongside `role` (appRole for routing like "teacher") — ADR 0036. The mapper now maps both. Never discard the raw enum.
- Multi-role routing: after auth (email or SSO), if `user.roles.length >= 2` → store `pending_roles` httpOnly cookie (10-min TTL, name+roles only, no tokens) → redirect `/select-role`. Single role → `/select-tenant` (existing flow).
- `/select-role` RSC: reads `pending_roles` cookie → builds RoleCardVM[] by iterating `user.roles` (one card per role-tenant entry) → renders RoleSelectContainer client component.
- `selectRoleAction` re-verifies `(roleEnum, tenantId)` against `pending_roles` via `RoleSelectUseCase` before routing. No privilege escalation possible.
- VNeID button: `aria-disabled="true"` + `aria-describedby` + coming-soon badge. No server action wired. Google is fully wired via `@react-oauth/google` (implicit flow → access_token → socialSigninAction). ADR 0035.
- `GoogleAuthWrapper` (thin client boundary) provides `GoogleOAuthProvider`; `NEXT_PUBLIC_GOOGLE_CLIENT_ID` env var.

ADRs:
- 0035: VNeID SSO client-only / coming-soon (BE provider enum missing)
- 0036: preserve BE roleEnum on UserTenantRole

**Why:** multi-tenant users (same appRole at 2+ schools) need one card per role-tenant entry. Discarding roleEnum collapsed MANAGER/STAFF badges and dropped cards.
**How to apply:** always iterate `user.roles` array for card construction; never de-dup by appRole. Always preserve `roleEnum` in mapper.
