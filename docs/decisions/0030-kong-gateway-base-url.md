# 0030 Kong Gateway Base URL — Switch from Direct IAM to Kong Aggregated Gateway

Date: 2026-06-13

## Status

Accepted

## Context

`edu-api` runs all services behind a Kong DB-less declarative gateway (ADR edu-api 0048).
Kong listens on port 8000 and routes traffic by service-prefix:

- `/iam/...` → iam upstream (port 8080), strips `/iam`, forwards remainder
- `/core/...` → core upstream (port 8081), strips `/core`, forwards remainder
- `notification` is a background worker — **no HTTP, not routed through Kong**

All protected paths (`/iam/api/v1/users`, `/iam/api/v1/tenants`, `/iam/api/v1/members`,
`/iam/api/v1/invitations`, `/iam/api/v1/auth/signout`, `/core/api/v1/*`) are gated by
the `edu-edge-auth` plugin which verifies ES256 JWT (JWKS from iam), checks the
session-revocation denylist (Redis DB 0), and injects a HMAC-signed `X-Edu-Claims`
header that downstream services trust in place of re-verifying the JWT (ADR edu-api 0047).

`edu-staff-web` currently has `NEXT_PUBLIC_API_URL` defaulting to
`http://localhost:8080/api/v1` (direct IAM, no Kong, no edge-auth). All existing
endpoint constants use a `/core/...` or `/iam/...` infix that, combined with the
`/api/v1` base, would produce malformed URLs like `localhost:8080/api/v1/core/config/school`.

The endpoint files already encode the correct per-service prefix (e.g.
`/core/config/school`, `/core/academic-years`) in anticipation of this change.
The only missing piece is aligning the base URL.

## Decision

1. **Set `NEXT_PUBLIC_API_URL=http://localhost:8000`** (Kong gateway, no `/api/v1` suffix)
   as the default for local development. Production/staging values set via environment
   variables at deploy time.

2. **Endpoint constant paths stay as-is** — they already encode the full routed path
   including service prefix and `/api/v1` segment:
   - IAM: `/iam/api/v1/auth/signin`, `/iam/api/v1/users/me`, etc.
   - core: `/core/api/v1/config/school`, `/core/api/v1/academic-years`, etc.
   - Infrastructure (raw, no envelope): `/iam/health`, `/core/health`,
     `/iam/.well-known/jwks.json`

3. **Endpoint files that currently lack the `/api/v1` segment** (calendar.endpoint.ts,
   admin-school-setup.endpoint.ts, admin-roster.endpoint.ts, subject-catalogue.endpoint.ts)
   must be corrected: paths like `/core/config/school` → `/core/api/v1/config/school`.
   These corrections are the scope of story **US-E06.3**.

4. **Auth flow** — protected paths continue to use `Authorization: Bearer <accessToken>`;
   Kong's `edu-edge-auth` plugin handles verification and injects `X-Edu-Claims`.
   The web app does not change its Bearer-token approach.

5. **notification service** — remains mock-first (no HTTP). SSE proxy (decision 0009)
   is a separate follow-up (US-E06.2). No Kong route for notification in scope here.

6. **lms / social** — not built yet; remain mock-first per decision 0014. No Kong
   routes exist for them.

## Alternatives Considered

1. **Keep `localhost:8080/api/v1` default, add per-service base URL env vars**
   — Rejected: adds multiple env vars, complicates `createHttpClient`, splits the
   single HTTP factory pattern. Kong already aggregates; one URL is simpler.

2. **Keep `/api/v1` in the base URL, strip it from all endpoint paths**
   — Rejected: the service prefix (`/iam`, `/core`) must follow `/api/v1` in the
   direct-URL model but precede it in the Kong model. Retaining `/api/v1` in the
   base forces a non-uniform prefix scheme. The endpoint-first approach (prefix in
   the constant) is cleaner.

## Consequences

Positive:
- Single `NEXT_PUBLIC_API_URL` env var; `createHttpClient` stays unchanged.
- Kong edge-auth handles JWT verification for all protected core endpoints automatically.
- Rate-limit, CORS, and compression policies applied uniformly at the edge.
- Endpoint constants remain the source of truth; path typos caught at compile time.

Tradeoffs:
- `http.ts` base URL env var default value must change (US-E06.3 corrects this).
- All existing endpoint path constants that omit `/api/v1` must be updated (US-E06.3).
- Local dev now depends on Kong running (docker-compose up gateway); direct-service
  dev remains possible by overriding `NEXT_PUBLIC_API_URL=http://localhost:808x`
  (per-service) but bypasses edge-auth (debug only).
- `auth_token` cookie strategy (httpOnly, server-only) is unchanged; Kong only
  reads the `Authorization` header that the server-side DI layer sends.

## Follow-Up

- US-E06.3 — correct `NEXT_PUBLIC_API_URL` default + fix all endpoint path constants
  (add `/api/v1` segment to core endpoint files; confirm IAM paths correct).
- US-E06.4 — wire IAM tenant + member endpoints to real BE (invitations, switch-tenant).
- US-E06.5 — wire core school-config + calendar to real BE (lift mock-first).
- US-E06.6 — wire core subject catalogue to real BE.
- US-E06.7 — wire core student roster to real BE.
- US-E06.8 — wire core staffing (departments, position titles, position assignments).
