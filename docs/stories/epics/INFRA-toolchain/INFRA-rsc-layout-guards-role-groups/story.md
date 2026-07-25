# INFRA-rsc-layout-guards-role-groups: RSC layout guard for every role namespace, not just admin

## Status

implemented

## Lane

high-risk (closes an authorization/RBAC gap flagged by ADR `0063` — route-level
guard is a hard-gate concern per `docs/FEATURE_INTAKE.md`, even though the fix
itself is additive/mechanical and does not change any role definition or
redirect rule)

## Dependencies

- Depends on: ADR `0063` (server-derived-auth-context-explicit-param) — the
  gap this story closes was documented there.
- Blocks: none
- Feature module(s) touched: none (route-layer only — no `src/features/**`
  domain/infrastructure/presentation code touched)
- Shared contract/file: `src/bootstrap/tenant/role-guard.ts` +
  `src/bootstrap/tenant/index.ts` (generalized, backward-compatible export)

## Gap closed (ground truth)

ADR `0063` documented that only `(app)/admin/**` had an RSC layout-level role
guard (`admin/layout.tsx` → `evaluateAdminAccess`). `(app)/principal/**` and
`(app)/teacher/**` had **no** layout guard — the per-record `authCtx` repository
check (the ADR's actual subject) was the *only* server-side authorization for
those two route groups; a route reachable at all only via `requireRole()`
inside individual Server Actions, with no layout-level backstop.

**Full inventory** (grepped every `(app)/*` route group, not just the two named
in the ADR): five role-scoped route groups exist —
`admin`, `principal`, `teacher`, `student`, `parent` — plus one intentionally
multi-role group, `(shared)` (`profile`, `feed`, `messages`, `notifications`).
Before this story, only `admin` had a layout guard. `student` and `parent` had
the *same* gap as `principal`/`teacher` (not named in the ADR, but structurally
identical — found during this story's inventory pass, in scope per this
story's brief). `(shared)` is NOT a gap: it's deliberately open to every
authenticated role (`docs/product/roles-permissions.md`) and stays covered by
the outer `(app)/layout.tsx` auth+tenant check only — adding a role-restrictive
guard there would be a behavior change, out of scope.

## Fix — reused/extended, not duplicated

- `evaluateAdminAccess` (`src/bootstrap/tenant/role-guard.ts`) hardcoded
  `role === "admin"`. Generalized into
  `evaluateNamespaceAccess(role, locale, tenantId, requiredRole)` — identical
  verdict shape/behavior (`allowed` / `redirect-to-default` /
  `redirect-to-auth`), same redirect targets (`DEFAULT_ROUTE[role]` via
  `tenantUrl()`, `/select-tenant` when unauthenticated).
  `evaluateAdminAccess` kept as a thin wrapper
  (`evaluateNamespaceAccess(role, locale, tenantId, "admin")`) — no existing
  call site (`admin/layout.tsx`, `admin/parent-links/page.tsx`) or its test
  file changed shape.
- Added four new layout guards, each a byte-for-byte structural mirror of
  `admin/layout.tsx` with only the required role swapped:
  `principal/layout.tsx`, `teacher/layout.tsx`, `student/layout.tsx`,
  `parent/layout.tsx`.
- No new rule invented: same unauthenticated→`/select-tenant` redirect, same
  wrong-role→own-default-route redirect (`DEFAULT_ROUTE` map in
  `nav-config.ts`), same multi-role `/select-role` flow untouched (this guard
  only runs after a role/tenant is already selected — it doesn't gate
  `/select-role` itself).

## Proof

- TDD: `src/bootstrap/tenant/role-guard.test.ts` — new `describe.each` sweep
  over `evaluateNamespaceAccess` covering all 5 roles as `requiredRole` ×
  every forged (wrong) role × unauthenticated, asserting (a) the correct role
  passes with no redirect, (b) every forged role is denied and redirected to
  **its own** default route (never dead-ends inside the namespace it tried to
  force), (c) an absent role always redirects to `/select-tenant`
  (deny-by-default). 23/23 tests pass in this file; existing
  `evaluateAdminAccess` tests untouched and still pass.
- `bunx tsc --noEmit` — clean.
- `bun vitest run` — 419/419 files, 2817/2817 tests pass.
- `bunx vitest run --config vitest.storybook.mts` — 149/149 files, 1045/1045
  tests pass.
- `NEXT_PUBLIC_USE_MOCK= bun run build` — succeeds; every existing route under
  the newly-gated groups (principal/teacher/student/parent, ~45 pages total)
  still builds.
- No design-review gate needed — zero UI/presentation change, no new
  component, no visual surface (route-layer server logic only).

## Docs synced

- ADR `0063` — added a "Status update" note under Consequences + struck through
  the Follow-Up item, both pointing at this story.
- `docs/product/roles-permissions.md` — added a rule bullet describing the
  per-namespace RSC guard now covering all 5 roles, and that `(shared)` is
  intentionally ungated by role (not a residual gap).
