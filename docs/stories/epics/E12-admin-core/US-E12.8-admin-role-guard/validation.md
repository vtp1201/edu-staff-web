# Validation — US-E12.8 Admin Route Role Guard

## Proof Strategy

The guard has two pure logic units (testable in Vitest node env without framework):
1. `decodeRoleClaim` — JWT decode + known-role validation + mock branch.
2. `evaluateAdminAccess` — verdict mapping for admin/non-admin/no-token inputs.

The RSC layout wires these together; platform proof (`bun build` + `tsc`) confirms
the layout compiles and the `server-only` + `'use server'` boundary is intact.

No E2E Playwright tests are required for this story (the guard has no visual UI;
redirect behavior is covered by unit tests on the pure logic, and the `bun build`
static analysis confirms no client bundle leakage).

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | `decodeRoleClaim`: valid admin token → "admin"; valid teacher token → "teacher"; unknown role → null; malformed token → null; empty string → null; mock=true + any non-empty token → "admin". |
| Unit | `evaluateAdminAccess`: role="admin" → allowed + empty redirectUrl; role="teacher" → redirect-to-default + correct tenantUrl; role=null → redirect-to-auth + select-tenant path; each known non-admin role → redirect-to-default. |
| Integration | none (no API call in guard; mock repo already covered by US-E12.1/US-E12.2) |
| E2E | none (redirect is server-side; pure logic unit tests sufficient) |
| Platform | `tsc --noEmit` 0 errors; `bun build` green; `bun vitest run` all tests pass |

## Fixtures

Unit test fixtures in `role-guard.test.ts`:
- `ADMIN_TOKEN` = minimal valid HS256 JWT with payload `{ role: "admin", tenantId: "t-1", exp: 9999999999 }` (base64url encoded, no real signature needed — `decodeRoleClaim` does not verify signature).
- `TEACHER_TOKEN` = same structure with `role: "teacher"`.
- `UNKNOWN_ROLE_TOKEN` = payload `{ role: "superhero" }`.
- `MALFORMED_TOKEN` = `"not.a.jwt"` / `""`.

## Commands

```bash
bun vitest run src/bootstrap/tenant/role-guard.test.ts
bun vitest run src/bootstrap/lib/jwt.test.ts
bun vitest run
bunx tsc --noEmit
bun build
```

## Acceptance Evidence

### Test results (2026-06-13)

```
bun vitest run src/bootstrap/lib/jwt.test.ts
  17 tests passed (1 file)

bun vitest run src/bootstrap/tenant/role-guard.test.ts
  7 tests passed (1 file)

bun vitest run (full suite)
  145 tests passed (26 files)

bunx tsc --noEmit
  exit 0 — 0 errors

bun run build
  exit 0 — all admin routes present:
    ƒ /[locale]/t/[tenant]/admin/calendar
    ƒ /[locale]/t/[tenant]/admin/school-setup
```

### Review verdicts

- fe-tech-lead-reviewer: **APPROVED** (two SHOULD-FIX items resolved: mock bypass hardened with `NODE_ENV !== "production"` guard; layer-direction smell documented as tracked follow-up)
- fe-accessibility-auditor: **PASS** — no a11y findings; layout renders no visible UI

### Open tracked items (non-blocking)

- **Tech debt**: `role-guard.ts` imports `DEFAULT_ROUTE` from `components/layout/app-shell/sidebar/nav-config` — layer direction inverted (`bootstrap/tenant/` → `components/`). Works correctly because `nav-config.ts` has no `'use client'` and is pure data. Follow-up: relocate `DEFAULT_ROUTE` + `Role` to a shared routing module under `bootstrap/` (requires ADR decision for scope). Tracked in backlog.
- **E2E gap**: No Playwright test for redirect of non-admin user hitting `/admin/*`. Follow-up story.
