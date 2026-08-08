# US-E01.3 HTTP client: per-request Authorization must win over default token

## Status

implemented

## Lane

normal

## Feature Intake

- **Input type**: Change request (bug fix), root cause already diagnosed +
  reproduced on the dev stack (2026-08-08).
- **Risk checklist**: Auth (hard gate — token header handling), Existing behavior
  (signin already implemented/test-covered).
- **Hard gate**: Auth trips → high-risk by default. **Scope explicitly narrowed**
  by the requester to a single deterministic fix in one file
  (`src/bootstrap/lib/http.ts` interceptor header precedence), with the exact
  before/after behavior specified and TDD cases enumerated up front — no new
  auth flow, no architecture change, no new token storage/handling. Per
  `docs/FEATURE_INTAKE.md` §Hard gates ("high-risk unless the human explicitly
  narrows scope") this is classified **normal** with stronger validation (unit
  matrix covering the exact header-precedence contract + full auth repo suite
  as regression proof).
- **Lane**: normal.

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/bootstrap/lib/http.ts` (shared HTTP client
  factory, not a feature module); consumer `src/features/auth/infrastructure/repositories/auth.repository.ts`
  (no code change, only benefits from the fix — it's the one caller that sets
  a per-request `Authorization` header).
- Shared contract/file: `src/bootstrap/lib/http.ts` — `createHttpClient(token?)`
  request interceptor. Shared by every repository in the app; only
  `auth.repository.ts` currently overrides `Authorization` per-request.

## Product Contract

`createHttpClient(token)`'s request interceptor must never clobber a
per-request `Authorization` header the caller set explicitly. The interceptor
should only fall back to the client's default `token` when the outgoing
request has no `Authorization` header of its own.

### Root cause (confirmed via reproduction on dev stack)

The interceptor set `config.headers.Authorization` **unconditionally** for
every request that used a client built with a `token`. Real victim:
`AuthRepository.signin()` — after `POST /auth/signin` succeeds with a fresh
access token, the repo calls `GET /users/me` and `GET /members/me/tenants`
with an explicit `headers: { Authorization: Bearer <fresh token> }`. If the
browser still carried a **stale** `auth_token` cookie (expired session),
`createServerHttpClient()` built the axios client with that stale token as
the default, and the interceptor overwrote the fresh, explicit header with
the stale one. IAM then rejected the stale token with 401, which
`mapAuthError` doesn't map to a specific code → `errorKey: "unknown"`.

**User impact**: anyone with a leftover expired session cookie could never
log in again (permanent deadlock) until they manually cleared cookies.
Reproduced: login with a stale cookie present → `{"errorKey":"unknown"}`;
identical request with no cookie → 303 redirect to `/select-tenant` (success).

## Relevant Product Docs

- `.claude/rules/api-integration.md` §Auth flow (IAM)
- `docs/product/auth.md`
- `docs/decisions/0018-*.md` (token refresh strategy — hybrid), `0019-*.md` (auth endpoint alignment)

## Acceptance Criteria

- Client created with default token `A`; request explicitly sets
  `Authorization: Bearer B` → outgoing request carries `Bearer B` (explicit
  wins).
- Client created with default token `A`; request sets no `Authorization`
  header → outgoing request carries `Bearer A` (unchanged fallback behavior).
- Client created with no token; request sets no `Authorization` header →
  outgoing request carries no `Authorization` header (unchanged).
- Existing `AuthRepository` unit/integration suite (signin/socialSignin with
  the `/users/me` + `/members/me/tenants` chain) stays green — this is the
  regression proof for the real-world deadlock scenario.

## Design Notes

- Commands: none (no new use-case/domain change).
- Queries: none.
- API: no contract change — this is a client-side request-construction fix,
  invisible to BE.
- Tables: none.
- Domain rules: none — pure `bootstrap/lib/http.ts` infra fix.
- UI surfaces: none — no visual/behavioral change from the user's point of
  view except that login no longer permanently deadlocks on a stale cookie.
  Design-review gate: **N/A** (no UI touched).

### Fix applied

`src/bootstrap/lib/http.ts` request interceptor:

```ts
if (token && config.headers && !config.headers.has("Authorization")) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

Per-request header (set by the caller, e.g. `auth.repository.ts`) now always
wins; the default `token` is only a fallback for requests that didn't set
their own. `.has()` (case-insensitive `AxiosHeaders#findKey`) is used instead
of dot access (case-sensitive) — `fe-tech-lead-reviewer`'s first-pass review
empirically caught that dot access would let a lowercase `authorization`
header slip past the guard and get a stale, differently-cased default token
appended alongside it, defeating the whole fix for that casing.

### Call-site audit (per-request `Authorization` override)

Grepped `Authorization:` across `src/features/*/infrastructure` and
`src/bootstrap`. Only one call-site sets a per-request `Authorization` header
that this bug could clobber:

- `src/features/auth/infrastructure/repositories/auth.repository.ts` — 3
  call-sites (`withRoles()` line ~33, `signin()` line ~64, `socialSignin()`
  line ~91), all using a **freshly-obtained** access token right after
  `signin`/`social` succeeds, before the httpOnly cookie is written. This is
  the confirmed victim and the only one.
- No other repository in `src/features/*/infrastructure` sets a per-request
  `Authorization` header — every other repository relies solely on the
  client's default `token` (built server-side per-request via
  `createServerHttpClient()`), so they were never exposed to this bug.

### Adjacent mapper change (same-root-cause-adjacent, included)

`auth-failure.mapper.ts`'s `mapAuthError` fell unmapped 401 codes (e.g.
`UNAUTHORIZED`) and any 5xx gateway status through to the generic `unknown`
failure, which is how the deadlock surfaced as an opaque error to the user.
No new i18n keys needed — `network-error` and `unknown` keys already exist
per-namespace in `messages/{vi,en}.json`. Left the 401 branch as-is (`code`
already covers `UNAUTHORIZED_ACCESS` → `unauthorized`); added a check for
gateway/upstream statuses (502/503/504) to map to `network-error` instead of
`unknown`, since those are transient infra conditions, not application errors.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `src/bootstrap/lib/http.test.ts` — interceptor header-precedence contract (3 cases above) |
| Integration | `src/features/auth/infrastructure/repositories/auth.repository.test.ts` — full existing suite green (regression proof for the real deadlock scenario) + `auth-failure.mapper.test.ts` new 502/503/504 cases |
| E2E | N/A — no UI/flow surface changed, existing Storybook coverage of login unaffected |
| Platform | `bun run build` green |
| Release | N/A |

## Harness Delta

- Registered via `harness-cli story add --id US-E01.3 --lane normal`.
- `docs/TEST_MATRIX.md` row added (was missing on `fe-tech-lead-reviewer`'s
  first pass — MUST FIX, closed by `fe-lead`).
- No new ADR — this is a bugfix restoring intended precedence, not a new
  architecture/contract decision.
- `fe-tech-lead-reviewer` verdict: **Revision Required** (missing TEST_MATRIX
  row; case-sensitive `.Authorization` guard should be `.has()`; missing a
  test pinning "code wins over status" precedence) → all three addressed →
  clean on re-review by `fe-lead`.
- Flagged as a follow-up ask (not fixed in this branch, out of scope):
  `CODE_MAP[code]` prototype-chain lookup in `auth-failure.mapper.ts` can
  return an inherited member (e.g. `"constructor"`) for an unexpected BE
  code — pre-existing, unrelated to this bug, cheap one-line fix
  (`Object.hasOwn`) for a future story.

## Evidence

Branch `fix/us-e01.3-http-auth-header-precedence`, merged `--no-ff` into
`main`. `bun vitest run`: 4117/4117 tests pass (519 files; 2 unrelated
pre-existing flaky timeouts confirmed passing in isolation); `bunx tsc --noEmit`
clean; `bun lint` clean; `bun run build` green. Test + build output recorded
by `fe-lead` after `fe-tech-lead-reviewer`'s Approved-on-re-review verdict.
