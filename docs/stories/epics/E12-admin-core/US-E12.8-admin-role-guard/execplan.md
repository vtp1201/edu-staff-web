# Exec Plan — US-E12.8 Admin Route Role Guard

## Goal

Enforce that only users with `role === "admin"` can access any route under
`/[locale]/t/[tenant]/(app)/admin/*`, server-side, before any page content
is rendered. Non-admin users are redirected to their own default route.

## Scope

In scope:

- `src/bootstrap/lib/jwt.ts` — add `decodeRoleClaim(token): UserRole | null`
  (reads `role` or `memberRole` claim from JWT payload; mock path when
  `NEXT_PUBLIC_USE_MOCK=true`).
- `src/bootstrap/tenant/role-guard.ts` — pure `evaluateAdminAccess` function:
  `(role: UserRole | null, locale: string, tenantId: string) → { verdict, redirectUrl }`.
- `src/bootstrap/tenant/index.ts` — re-export `evaluateAdminAccess`.
- `src/app/[locale]/t/[tenant]/(app)/admin/layout.tsx` — NEW admin route group
  layout; reads token → decodes role → calls guard → redirects or renders.
- `src/bootstrap/tenant/role-guard.test.ts` — unit tests for `evaluateAdminAccess`
  (red → green → refactor, TDD).
- `src/bootstrap/lib/jwt.test.ts` — extend existing JWT tests with
  `decodeRoleClaim` cases.
- `docs/decisions/0024-admin-route-guard-mock-role.md` — documents mock-first
  role claim decoding.
- `docs/TEST_MATRIX.md` — new row for US-E12.8.

Out of scope:

- Guarding `/teacher/*`, `/principal/*`, `/student/*`, `/parent/*`.
- A dedicated "Access Denied" / 403 UI page.
- Real IAM role claim (BE dependency — IAM US-049; mock-first covers dev).
- Reactive 401 refresh in the admin layout (proactive `ensureFreshSession`
  is already in DI factories; layout only reads role claim, not protected data).
- Role-switcher UI changes (already handles admin in US-E12.1).
- `(app)/layout.tsx` de-hardcoding of `HARDCODED_ROLE` (separate follow-up
  requiring full session store integration).

## Risk Classification

Risk flags:

- Authorization: `/admin/*` namespace gating — hard gate.
- Auth: server-side JWT claim reading — hard gate.
- Existing behavior: `(app)/admin/layout.tsx` does not exist yet; creating it
  does not change existing layout.tsx behavior.

Hard gates:

- Authorization.
- Auth (server-side JWT, httpOnly cookie).

## Work Phases

1. Write failing unit tests for `evaluateAdminAccess` and `decodeRoleClaim`.
2. Implement `decodeRoleClaim` in `jwt.ts` (mock branch + real branch).
3. Implement `evaluateAdminAccess` in `role-guard.ts`.
4. Create `admin/layout.tsx` RSC wiring guard + redirect.
5. Register ADR 0024; update `tenant/index.ts` exports.
6. Run `tsc --noEmit`, `bun vitest run`, `bun build`; update TEST_MATRIX.

## Stop Conditions

Pause for human confirmation if:

- The JWT claim shape from IAM changes significantly (e.g., `roles[]` array
  instead of scalar `role`) and mock / real paths diverge from current mapper.
- A dedicated 403 UI page is required before redirect.
- BE IAM publishes `openapi.yaml` update with admin role claim before this
  story is merged — align DTO shape.
