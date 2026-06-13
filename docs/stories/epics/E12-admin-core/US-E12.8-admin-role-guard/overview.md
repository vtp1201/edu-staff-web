# Overview — US-E12.8 Admin Route Role Guard

## Current Behavior

`src/app/[locale]/t/[tenant]/(app)/layout.tsx` hardcodes `role = "teacher"`.
Any authenticated user who knows the URL `/[locale]/t/[tenant]/admin/*` can
navigate there regardless of their actual role — the app shell renders the
admin namespace and any admin page is accessible.

The tenant boundary (US-E05.1, `src/proxy.ts`) only verifies that the JWT's
`tenantId` claim matches the URL tenant. It does NOT check role.

## Target Behavior

Server-side: when a request targets a path inside `(app)/admin/*`, the RSC
layout reads the authenticated user's role claim from the JWT in the
`auth_token` httpOnly cookie and:

1. Allows the request through if `role === "admin"`.
2. Redirects non-admin authenticated users to their default route
   (`DEFAULT_ROUTE[role]`) — no admin content is ever rendered.
3. Redirects unauthenticated users (no token / unreadable claim) to
   `/[locale]/select-tenant` for re-auth.

The guard lives in a dedicated `admin` route group layout
(`src/app/[locale]/t/[tenant]/(app)/admin/layout.tsx`) so it is
isolated from the shared `(app)/layout.tsx` and not applied to
teacher/principal/student/parent namespaces.

The role is decoded from the JWT payload's `memberRoles` or `role` claim
(mock-first per decision 0014 — see ADR 0024). A deterministic mock path
(`NEXT_PUBLIC_USE_MOCK=true`) returns `"admin"` for any present token, to
unblock local development until IAM issues real admin-role claims.

## Affected Users

- `admin` — gains enforced access to `/admin/*`.
- `teacher`, `principal`, `student`, `parent` — redirected away from `/admin/*`.
- Unauthenticated — redirected to select-tenant / login.

## Affected Product Docs

- `docs/product/screens.md` — Admin namespace guard note
- `docs/TEST_MATRIX.md` — new row for US-E12.8
- `docs/stories/epics/E12-admin-core/US-E12.1-school-setup.md` — cross-ref guard story

## Non-Goals

- Implementing a UI "Access Denied" page (redirect is sufficient; a dedicated
  403 page is a follow-up if UX demands it).
- Guarding other role namespaces (`/teacher/*`, `/principal/*`, etc.) — those
  are separate follow-ups.
- Single-flight reactive 401 refresh (deferred, decision 0019).
- Issuing real `role: "admin"` JWT claims (BE IAM dependency — IAM US-049).
