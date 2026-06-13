# US-E06.3 Kong Gateway — Correct Base URL & Endpoint Path Constants

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none (prerequisite for all real-BE wiring stories below)
- Blocks: US-E06.4, US-E06.5, US-E06.6, US-E06.7, US-E06.8
- Feature module(s) chạm: `src/bootstrap/lib/`, `src/bootstrap/endpoint/`
- Shared contract/file: `bootstrap/lib/http.ts` (base URL), all `*.endpoint.ts` files

## Product Contract

Align the web app's HTTP base URL and all endpoint path constants so that API calls
correctly route through the Kong gateway (`localhost:8000`) rather than the previous
direct-IAM default (`localhost:8080/api/v1`).

Kong strips the service prefix from incoming paths (ADR 0030, edu-api ADR 0048):
- External call: `POST http://localhost:8000/iam/api/v1/auth/signin`
  → Kong strips `/iam` → iam receives `POST /api/v1/auth/signin`
- External call: `GET http://localhost:8000/core/api/v1/config/school`
  → Kong strips `/core` → core receives `GET /api/v1/config/school`

This means `NEXT_PUBLIC_API_URL` must be `http://localhost:8000` (no `/api/v1`
suffix) and every endpoint constant must encode the full external path including
both the service prefix and `/api/v1`.

## Relevant Product Docs

- `docs/decisions/0030-kong-gateway-base-url.md` — ADR (base URL + endpoint alignment)
- `.claude/rules/api-integration.md` — service map, envelope, camelCase contract
- `edu-api/gateway/kong/kong.yml` — Kong declarative config (authoritative route table)
- `edu-api/services/iam/docs/INTEGRATION.md` — IAM base URL guidance
- `edu-api/services/core/docs/INTEGRATION.md` — core base URL guidance

## Acceptance Criteria

### TR-001 — Base URL default
- `src/bootstrap/lib/http.ts`: `NEXT_PUBLIC_API_URL` default changed from
  `http://localhost:8080/api/v1` to `http://localhost:8000`.
- No other change to `createHttpClient` or the Axios factory.

### TR-002 — IAM endpoint paths (auth.endpoint.ts)
- Existing paths already correct for Kong routing. Verify each path has `/iam/api/v1/`
  prefix when combined with the new base URL. Current `AUTH_EP` paths:
  `/auth/register`, `/auth/signin`, etc. must become `/iam/api/v1/auth/register`,
  `/iam/api/v1/auth/signin`, `/iam/api/v1/users/me`, etc.

### TR-003 — IAM tenant/member endpoint paths (tenant.endpoint.ts)
- All tenant/member/invitation/switch-tenant paths get `/iam/api/v1/` prefix.

### TR-004 — core school-config endpoint paths (admin-school-setup.endpoint.ts)
- `/core/config/school` → `/core/api/v1/config/school`
- `/core/config/school/setup-status` → `/core/api/v1/config/school/setup-status`
- `/core/config/school/grade-levels` → `/core/api/v1/config/school/grade-levels`
- `/core/config/school/operational-settings` → `/core/api/v1/config/school/operational-settings`

### TR-005 — core academic-calendar endpoint paths (calendar.endpoint.ts)
- `/core/academic-years` → `/core/api/v1/academic-years`
- All derived paths updated accordingly.

### TR-006 — core subject-catalogue endpoint paths (subject-catalogue.endpoint.ts)
- `/core/subject-parents` → `/core/api/v1/subject-parents`
- `/core/subjects` → `/core/api/v1/subjects`
- All derived paths updated accordingly.

### TR-007 — core student-roster endpoint paths (admin-roster.endpoint.ts)
- `/core/classes` → `/core/api/v1/classes`
- `/core/classes/:classId/students` → `/core/api/v1/classes/:classId/students`
- All derived paths updated accordingly.

### TR-008 — notification SSE endpoint (noti.endpoint.ts)
- Verify / update to correct path. notification has no HTTP in Kong (worker only);
  SSE proxy is a separate story (US-E06.2). Confirm the noti endpoint points to the
  correct downstream or remains mock-first.

### TR-009 — Infrastructure endpoints (raw, no envelope)
- `/iam/health`, `/core/health`, `/iam/.well-known/jwks.json` remain raw (not
  wrapped in envelope). Confirm the `raw: true` Axios config or equivalent is applied
  on any caller, per `api-integration.md`.

### TR-010 — Build + type clean
- `tsc --noEmit` clean after path changes.
- `bun build` green.
- `bun vitest run` — all existing tests pass (path changes are pure constants;
  mock repos do not use real URLs).

### TR-011 — `.env.local.example` (or `README.md`) documents Kong dev setup
- Add a note: `NEXT_PUBLIC_API_URL=http://localhost:8000` for local dev with Kong
  running; `NEXT_PUBLIC_API_URL=http://localhost:8080` for direct IAM bypass (debug).

## Design Notes

- Commands: none (constants only, no business logic)
- Queries: none
- API: base URL + endpoint path constant changes only
- Domain rules: none changed
- UI surfaces: none changed (mock data still returned via mock repos)
- This story is a pure infrastructure alignment — no screen changes, no new use-cases.
  All existing mock-first screens continue to work unchanged because mock repositories
  never call `http`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | No domain logic — no new unit tests required. Existing tests pass unchanged. |
| Integration | `bun vitest run` all green (path constant changes don't break mock repos) |
| E2E | — |
| Platform | `tsc --noEmit` clean; `bun build` green |
| Release | Manual smoke: `curl http://localhost:8000/iam/health` → `{"status":"ok"}` with Kong running |

## Harness Delta

- ADR 0030 registered (Kong gateway base URL — done).
- This story is a prerequisite gate for US-E06.4 through US-E06.8.
- TEST_MATRIX row: planned → implemented when TR-010 passes.

## Evidence

- Branch: `feat/us-e06.3-kong-base-url-endpoint-paths` — claimed 2026-06-13, merged to main.
- Commit: `feat(bootstrap): align Kong gateway base URL + all endpoint path constants (US-E06.3)`
- Files changed (11):
  - `src/bootstrap/lib/http.ts` — base URL default → `http://localhost:8000`
  - `src/bootstrap/endpoint/auth.endpoint.ts` — `/iam/api/v1/` prefix on all 8 IAM auth paths
  - `src/bootstrap/endpoint/tenant.endpoint.ts` — `/iam/api/v1/` prefix on myTenants + switchTenant
  - `src/bootstrap/endpoint/admin-school-setup.endpoint.ts` — `/core/api/v1/config/*`
  - `src/bootstrap/endpoint/calendar.endpoint.ts` — `/core/api/v1/academic-years*`
  - `src/bootstrap/endpoint/subject-catalogue.endpoint.ts` — `/core/api/v1/subject-*`
  - `src/bootstrap/endpoint/admin-roster.endpoint.ts` — `/core/api/v1/classes|students*`
  - `src/bootstrap/endpoint/noti.endpoint.ts` — comment clarified (no Kong route)
  - `README.md` — Kong dev setup note (TR-011)
  - `src/features/auth/infrastructure/repositories/auth.repository.test.ts` — description updated
  - `src/features/admin-roster/infrastructure/repositories/roster.repository.test.ts` — hardcoded path assertions updated

### TR-010 Proof
- `bun vitest run`: 194 tests across 37 files — all pass
- `bunx tsc --noEmit`: clean (0 errors)
- `bun run build`: green — 19 routes compiled successfully
- Biome: 2 files auto-fixed (formatting), 0 violations
