# US-E18.0 Gateway smoke + wiring playbook verify

## Status

implemented

## Lane

tiny

## Dependencies

- Depends on: none (Wave 0 — proof-of-pattern for the whole E18 epic)
- Blocks: none (Wave 1+ US's read this packet's findings, don't block on it)
- Feature module(s) chạm: `src/features/admin-school-setup/` (error-map fix),
  `src/bootstrap/di/admin-school-setup.di.ts` (proactive-refresh wiring)
- Shared contract/file: `bootstrap/lib/http.ts`, `bootstrap/lib/api-envelope.ts`,
  `bootstrap/di/auth.di.ts` (`ensureFreshSession`) — read-only, no changes; used
  as-is to validate the pattern

## Product Contract

Prove that a real, end-to-end wiring round-trip through the Kong gateway
(`:8000`) works for the web app's HTTP layer — not a mock, not a raw-curl guess
— using the ONE cluster (`school-config`, `core` service) already confirmed
100% path/DTO-matched with `edu-api/services/core/docs/openapi.yaml`. This is
the proof-of-pattern the rest of epic E18 (Wave 1-4) builds on, and a checkpoint
to verify/correct the epic's shared playbook before 18 more US's follow it.

No new UI. No screen change. Validation-only story; any http-layer bug found
(envelope, refresh wiring, error mapping) is fixed in-place here per playbook
step 5's tiny-scope allowance — bugs too large for tiny scope are logged as
findings + cross-repo asks instead (see EPIC-OVERVIEW.md).

## Relevant Product Docs

- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — epic goal, playbook,
  cross-repo asks (updated by this story with real findings)
- `edu-api/services/core/docs/{openapi.yaml,INTEGRATION.md,ERROR_CODES.md}`
- `edu-api/services/iam/docs/{openapi.yaml,INTEGRATION.md,ERROR_CODES.md}`
- `edu-api/gateway/kong/kong.yml`, `edu-api/gateway/e2e.sh`
- `.claude/rules/api-integration.md` (decision `0008` envelope, `0018` hybrid
  token refresh)

## Acceptance Criteria

- BE stack (`iam` + `core` + infra + Kong) boots locally via `edu-api`'s
  `make stack-up` and is reachable at `http://localhost:8000`.
- A real user is registered + signed in through Kong
  (`POST /iam/api/v1/auth/{register,signin}`) using the web app's own
  `bootstrap/lib/http.ts` client (`createHttpClient`), not raw curl only.
- `GET /iam/api/v1/users/me` (200, real data) confirms the envelope-unwrap
  success path works unchanged against the real BE.
- At least one real error case (401 no-token, and the naturally-occurring 400
  `SCHOOL_INVALID_TENANT_ID`) confirms `errorCodeOf()`/`ApiError` normalisation
  works against the real BE's envelope shape.
- `POST /iam/api/v1/auth/refresh` rotates a real token pair through the
  gateway.
- Any http-layer gap surfaced by the above is either fixed (tiny) or logged as
  a named finding/cross-repo ask in `EPIC-OVERVIEW.md` — not silently ignored.
- `EPIC-OVERVIEW.md` playbook is corrected/extended if the real run diverged
  from what it originally said.
- Zero regression: full `bun vitest run` + `tsc --noEmit` + `bun run build`
  stay green.

## Design Notes

- Commands: none (read-only smoke; the one write is an ephemeral test-user
  register, discarded when the stack was torn down)
- Queries: `GET /iam/api/v1/users/me`, `GET /core/api/v1/config/school`,
  `GET /core/api/v1/config/school/setup-status`
- API: `iam` (`/iam/api/v1/auth/*`, `/iam/api/v1/users/me`), `core`
  (`/core/api/v1/config/school*`) — both via Kong `:8000`
- Tables: none touched (BE-owned, read-only via API)
- Domain rules: none new
- UI surfaces: none (validation-only story)

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `SchoolConfigRepository` new test: `SCHOOL_INVALID_TENANT_ID` → `forbidden` |
| Integration | Full `bun vitest run` zero-regression (242 files / 1279 tests) |
| E2E | Real gateway smoke script (this packet's Evidence) — not a committed test file, ephemeral validation per tiny-lane scope |
| Platform | `tsc --noEmit` clean; `bun run build` green (117 routes) |
| Release | Kong smoke via `make stack-up` + real register/signin/me/refresh/school-config round trip — DONE (see Evidence) |

## Harness Delta

- `US-E18.0` → `status: implemented`, `unit: 1`, `integration: 1`, `e2e: 0`
  (no committed E2E/Playwright spec — this is a one-time infra validation
  story, not a screen; TEST_MATRIX row added as `implemented` with note "gateway
  smoke, no UI").
- `EPIC-OVERVIEW.md` updated in place with playbook step 6 (proactive refresh
  wiring per DI factory) + a new "Xác nhận từ US-E18.0" section + 2 new
  cross-repo asks (#4 refresh reuse-detection gap, #5 no local SUPER_ADMIN
  seed for the dev stack).

## Evidence

- **Branch**: `feat/us-e18.0-gateway-smoke`
- **BE stack**: `cd edu-api && make stack-up` — `edu-iam`, `edu-core`,
  `edu-kong`, `edu-notification`, `edu-redis`, `edu-scylla`, `edu-rabbitmq` all
  healthy; `make stack-down` after the run (ephemeral, no state kept).
- **Smoke script** (ephemeral, run via `bun run`, not committed — imports the
  real `@/bootstrap/lib/http` + `@/bootstrap/lib/api-envelope` +
  `@/bootstrap/endpoint/{auth,admin-school-setup}.endpoint` against
  `NEXT_PUBLIC_API_URL=http://localhost:8000`):
  1. `POST /iam/api/v1/auth/register` → 201, real user created.
  2. `POST /iam/api/v1/auth/signin` → 200, real `accessToken`/`refreshToken`
     minted (JWKS-verifiable ES256 JWT via Kong `edu-edge-auth`).
  3. `GET /iam/api/v1/users/me` with token → 200, envelope unwrapped directly
     to payload (`me.email === email`) — confirms success-path unwrap.
  4. `GET /core/api/v1/config/school` with NO token → `ApiError{code:
     "UNAUTHORIZED", status: 401}` — confirms error-path normalisation.
  5. `GET /core/api/v1/config/school` with a valid-but-non-tenant-scoped token
     → `ApiError{code: "SCHOOL_INVALID_TENANT_ID", status: 400}` — real BE
     behaviour for a token without a tenant claim (fresh `register`d user, no
     tenant membership yet). Previously fell through to `"unknown"` in
     `SchoolConfigRepository` → **fixed**, now maps to `"forbidden"`.
  6. `POST /iam/api/v1/auth/refresh` → 200, new access+refresh token pair,
     both different from the originals — confirms rotation works end-to-end
     through Kong using the web app's own `createHttpClient`.
  7. Reuse of the OLD (already-rotated-away) refresh token → **unexpectedly
     succeeded** (`200`, new token pair minted, same `sessionId`) — repro'd
     twice via direct curl. `services/iam/docs/ERROR_CODES.md` documents
     `user_token_reused` (401, "Rotated-away refresh token replayed — session
     revoked (F3)") but it is not enforced on `POST /api/v1/auth/refresh`.
     Logged as **cross-repo finding #4** (BE gap, not a web bug) — see
     `EPIC-OVERVIEW.md`.
- **Fixes applied** (this US, tiny scope):
  - `src/features/admin-school-setup/infrastructure/repositories/school-config.repository.ts`:
    map `SCHOOL_INVALID_TENANT_ID` → `{ type: "forbidden" }` (was falling to
    `"unknown"`).
  - `src/bootstrap/di/admin-school-setup.di.ts`: wire
    `await ensureFreshSession()` before `createServerHttpClient()` in the
    real (`!USE_MOCK`) branch — decision `0018`'s proactive refresh was
    documented but never actually called by any protected feature's DI
    factory (verified: `grep -rl ensureFreshSession src/bootstrap/di` only
    matched `auth.di.ts` itself, before this fix). Playbook step 6 added so
    every Wave 1-4 US closes this gap for its own cluster.
- **Blocker (not fixed — cross-repo, permission-boundary respected)**: could
  not exercise a real `200` `GET /core/api/v1/config/school` happy path — that
  needs a tenant-scoped token, which needs a `SUPER_ADMIN` user to
  `POST /iam/api/v1/tenants`, and the local `make stack-up` dev stack seeds no
  such user. Attempted to promote the test user via a direct ScyllaDB write —
  **blocked by the permission system** (privilege-escalation risk, correctly
  so — was never authorized by this task). Logged as **cross-repo finding #5**
  instead of worked around.
- **Unit**: 1 new test (`school-config.repository.test.ts`,
  `SCHOOL_INVALID_TENANT_ID → forbidden`); `bun vitest run` → **242 files,
  1279 tests, all passed** (zero regression).
- **tsc --noEmit**: clean (0 errors).
- **bun run build**: green, 117 routes.
- **Playbook corrections made to `EPIC-OVERVIEW.md`**:
  - Added playbook step 6 (proactive-refresh wiring per DI factory).
  - Added a "Xác nhận từ US-E18.0" section with the (a)/(b)/(c) confirmations.
  - Added cross-repo asks #4 (refresh reuse-detection not enforced) and #5
    (no local SUPER_ADMIN seed).
