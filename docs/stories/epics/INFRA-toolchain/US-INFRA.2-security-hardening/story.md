# US-INFRA.2 Security Hardening — env.example, build guard, auth/role guard, SSE tenant validation, Server Action test baseline

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/bootstrap/auth-guard/`, `src/app/[locale]/t/[tenant]/(app)/layout.tsx`, `src/app/[locale]/api/stream/`, `src/app/[locale]/t/[tenant]/(app)/admin/grades/approval/`
- Shared contract/file: `src/bootstrap/lib/jwt.ts`, `src/bootstrap/tenant/access-guard.ts`

## Product Contract

Defense-in-depth security hardening for the web layer (pre-production), consisting of 4 sub-plans from the `/improve` audit (commit 20690db):

1. **Plan 003** — `.env.example` + production mock build-guard in `next.config.ts`
2. **Plan 001** — Server-side auth + role guard on `(app)` layout (`src/bootstrap/auth-guard/`), applied to grades/approval state-changing actions
3. **Plan 002** — Validate SSE `?tenant=` query param against token `tenantId` claim in stream route
4. **Plan 004** — Server Action test baseline (login action + pattern)

## Relevant Product Docs

- `plans/003-env-example-and-mock-build-guard.md`
- `plans/001-server-side-auth-role-guard.md`
- `plans/002-sse-tenant-validation.md`
- `plans/004-server-action-test-baseline.md`

## Acceptance Criteria

### Plan 003
- `.env.example` exists with 4 placeholder vars, no real secrets
- `next.config.ts` throws on `NODE_ENV=production && NEXT_PUBLIC_USE_MOCK=true`; normal `bun build` exits 0

### Plan 001
- `src/bootstrap/auth-guard/access-context.ts` — pure `evaluateAccess()` with 7 test cases
- `(app)/layout.tsx` no longer hardcodes role="teacher"; derives real role from token; redirects to `/select-tenant` when unauthenticated or tenant-mismatch
- `approveGradeBatchAction`, `requestGradeRevisionAction`, `bulkLockBatchesAction` call `requireRole(["admin"])` before any use-case
- `grep -rn HARDCODED_ROLE src/app` → no matches

### Plan 002
- Non-mock path returns 403 when `?tenant=` ≠ token `tenantId`
- Mock path unchanged (local SSE still serves dev frames)
- New `resolveStreamTenant` helper has ≥5 unit test cases

### Plan 004
- `loginAction` has tests: success (redirect), invalid-credentials, network-error
- `socialSigninAction` has tests: success, failure
- `logoutAction` has test: calls use-case + clear cookies + redirect
- Academic-seal action not found in app layer (no actions.ts with seal in tenant routes) — flagged finding

## Design Notes

- Auth guard is pure (no server-only) to enable unit tests: `evaluateAccess()` in `access-context.ts`
- Server Action guard is server-only: `requireRole()` in `require-role.server.ts`
- SSE tenant extraction is extracted to `stream-tenant.ts` (pure helper, testable without HTTP mocking)
- Mock-first bypass: when `NEXT_PUBLIC_USE_MOCK=true` all guards skip real JWT/tenant checks (ADR 0014/0024)
- Build guard prevents accidental mock mode in production builds

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | access-context.test.ts (7 cases), grades/approval/actions.test.ts (6 cases), stream-tenant.test.ts (5 cases), login/actions.test.ts (5 cases) |
| Integration | n/a (mocks are correct boundary for these layers) |
| E2E | n/a |
| Platform | bun build exit 0, bunx tsc --noEmit exit 0 |
| Release | bun lint exit 0 |

## Harness Delta

- Story registered: US-INFRA.2 (security-hardening)
- Branch: `feat/security-hardening`

## Evidence

To be filled after implementation completes.
