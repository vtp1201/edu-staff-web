# 0065 SSE Proxy Routes Through Kong (retires direct-bypass architecture)

Date: 2026-08-01

## Status

Accepted

Supersedes: `docs/decisions/0009-realtime-transport-sse.md` §proxy-architecture
(direct-bypass-to-`NOTI_SERVICE_URL`), as amended by `docs/decisions/0030-*.md`
(Kong gateway adoption) and `docs/decisions/0061-notification-sse-contract-remap.md`
(path fix, deferred re-architecture — this ADR executes that deferred Follow-Up
item).

## Context

US-E18.22 picked up the epic's last documented FE blocker (`docs/reports/
2026-07-26-fe-to-be-verification-report.md` §4, `docs/reports/2026-08-01-fe-to-be-asks.md`
Phần 1): cross-repo ask #1/#36 (Kong routing for `social`/`notification`/`lms`)
is now resolved on `edu-api origin/main` — ground-truthed directly in
`../edu-api/gateway/kong/kong.yml`: all 5 services (`iam`, `core`, `lms`,
`notification`, `social`) have public-health + protected routes behind
`edu-edge-auth`, including a dedicated long-lived `notification-stream` route
(`/noti/api/v1/stream`, `response_buffering: false`, 1h read/write timeout).
`docker-compose.yml` now also defines `social`/`lms` containers (previously
absent — cross-repo ask #36(b)).

This closes ask #1/#36 but NOT ask #33 (also `docs/decisions/0061-*.md`
Follow-Up): `edu-api`'s ADR `0047` (kong auth trust model, accepted 2026-06-13 —
AFTER this repo's original SSE-proxy design in ADR `0009`/`0030`) retired
per-service Bearer-JWT verification. `notification`'s `cmd/server` now trusts
ONLY the Kong-injected `X-Edu-Claims`/`X-Edu-Claims-Sig` headers
(`RequireGatewayClaims`); a direct call carrying a Bearer token but bypassing
Kong "carries no HMAC-signed `X-Edu-Claims` header, so the service returns 401
regardless of the bearer token" (ADR 0047's own words). This repo's SSE proxy
(`src/app/[locale]/api/stream/route.ts`) has, since ADR 0009, called
`NOTI_SERVICE_URL` directly — a design that predates ADR 0047 and is now
structurally incompatible with it.

Two independent pieces of live evidence confirm this is not just a theoretical
concern, ground-truthed against a real `make stack-up` gateway
(`docker/docker-compose.yml`, all 11 containers healthy including `edu-kong`,
`edu-lms`, `edu-social` for the first time):

1. **Network segmentation (ADR 0047 Prerequisite 1) makes direct-bypass
   unreachable, not just unauthenticated.** `docker inspect edu-notification`
   shows the container on the `internal`-only Docker network with NO published
   host port — `NOTI_SERVICE_URL` (an env var expecting a host-reachable
   `http://host:port`) has no valid value to point at anymore in this compose
   topology. The direct-bypass architecture is doubly dead: even ignoring
   auth, there is no longer a host-side address to dial.
2. **Kong-routed request WITH Bearer token authenticates successfully.**
   Registering a user (`POST /iam/api/v1/auth/register`) → signing in
   (`POST /iam/api/v1/auth/signin`, `clientId: "edu-web"` — the seeded IAM
   OAuth client, `services/iam/internal/oauth/core/application/usecase/
   seed_clients.go`) → `GET /noti/api/v1/stream` through Kong (`:8000`) with
   `Authorization: Bearer <token>` produced `edu-notification`'s own access log
   `200 | GET | /api/v1/stream` (twice, 05:01:34 and 05:01:52) — i.e. Kong
   verified the JWT at the edge, injected `X-Edu-Claims`/`-Sig`, and
   `RequireGatewayClaims` accepted it. The SAME request with no `Authorization`
   header returned Kong-level `401` before ever reaching the service. This is
   the exact live proof ADR 0061's Follow-Up asked for.

(Observed nuance, not a blocker: the client-side SSE body did not flush within
several seconds of idle time after the 200 — likely Fiber-level header/response
buffering on `notification`'s side rather than anything Kong or this proxy
controls. Flagged as a cross-repo observation below, not solved here — this
repo's own long-lived streaming client (`EventSource` in the browser) tolerates
this the same way it already tolerates the mock upstream's periodic-heartbeat
design; nothing in this proxy's contract changes.)

## Decision

- **The SSE proxy's real branch is re-architected to route through Kong**,
  using the exact same base-URL + full-endpoint-path convention every other
  repository in this codebase already uses (`bootstrap/lib/http.ts`'s
  `NEXT_PUBLIC_API_URL`, default `http://localhost:8000`) instead of a
  bespoke `NOTI_SERVICE_URL` direct-service env var. `NOTI_EP.stream` changes
  from the bare-service path `/api/v1/stream` to the Kong-prefixed
  `/noti/api/v1/stream` — matching the `/noti/api/v1/*` prefix convention
  `ANNOUNCEMENTS_EP` (same file) and every other `bootstrap/endpoint/*.ts`
  constant already uses for Kong routing.
- **`NOTI_SERVICE_URL` env var is retired** (removed from `.env.example`,
  no longer read anywhere). It is not merely unused — per the network
  segmentation finding above, no valid value could ever exist for it in a
  segmented deployment. The proxy's real/mock switch becomes purely
  `USE_MOCK` (identical to every DI factory's `USE_MOCK ? Mock : Real`
  pattern), dropping the old `USE_MOCK || !NOTI_URL` compound condition —
  simpler AND correct (a mis-set/empty Kong URL was never a legitimate
  "silently fall back to mock" signal for any other feature either).
- Auth/tenant handling (`getAccessToken()`, `resolveStreamTenant()`) is
  UNCHANGED — the client still authenticates same-origin via the httpOnly
  `auth_token` cookie and this proxy still forwards it as `Authorization:
  Bearer <token>` to the upstream (now Kong, previously the bare service);
  Kong's own edge verification (JWKS/ES256 + revocation denylist, ADR
  0039/0040 on the edu-api side) is what actually authenticates the request
  now, mirroring how every other real repository call in this codebase has
  worked since Kong adoption (ADR 0030) — the SSE proxy was the one
  remaining holdout still bypassing Kong.
- This unblocks setting `NEXT_PUBLIC_USE_MOCK=false` for the notification/
  realtime surface against a live gateway; combined with Kong now routing
  all 5 services (cross-repo ask #1/#36, resolved), no FE-side transport
  blocker remains for running the full app in real mode against a `make
  stack-up` stack. (Individual features that stay permanently mock/hybrid
  by BE-contract-gap design — feed, moderation, staff-leave, teaching-plan,
  academic-records viewer/unseal, principal-classes, etc., see
  `EPIC-OVERVIEW.md` — are UNCHANGED by this decision; flipping the global
  flag does not and must not make those force-mock factories call real
  endpoints.)

## Alternatives Considered

1. **Keep `NOTI_SERVICE_URL` as a documented "advanced/debug" override,
   defaulting to Kong.** Rejected: the network-segmentation finding means
   this override has no valid value in any segmented deployment (dev via
   `make stack-up` or prod) — keeping it invites exactly the mis-set 401
   this ADR closes. `NEXT_PUBLIC_API_URL` already documents "override for
   direct-service debug" for every other feature (`http.ts`'s own comment);
   the SSE proxy should use the same single override point, not a second
   parallel one.
2. **Have the web client construct/sign an `X-Edu-Claims` header itself and
   skip Kong.** Rejected for the same reason ADR 0061 rejected it:
   `GATEWAY_CLAIMS_SECRET` is a cluster-internal shared secret never exposed
   to this repo; fabricating claims client-side defeats the entire trust
   model ADR 0047 protects.

## Consequences

Positive:

- Closes the epic's last-documented FE transport blocker (`docs/reports/
  2026-07-26-fe-to-be-verification-report.md` §4) — no code-level obstacle
  remains to running `NEXT_PUBLIC_USE_MOCK=false` against a live gateway for
  every already-wired cluster (Waves 0-4b).
- SSE proxy architecture is now consistent with every other repository in
  the codebase (single Kong entrypoint, `NEXT_PUBLIC_API_URL` as the one
  override), removing a bespoke second env var and a stale architectural
  exception.
- Live-verified (not just contract-first) against a real `make stack-up`
  gateway — closes ADR 0061's Follow-Up "confirm SSE proxy re-architecture
  once Kong routes notification" item and the epic's cross-repo asks #1/#33/
  #36 for the FE side.

Tradeoffs / residual risks:

- The client-side header/body flush latency observed against the live
  `notification` service (200 logged server-side, but no bytes reached the
  client within several seconds of idle silence) is NOT investigated further
  here — it did not block correctness (auth succeeded, connection stayed
  open rather than erroring), and diagnosing Fiber-level response buffering
  is `edu-api`'s own concern. Flagged as a cross-repo observation (see
  `EPIC-OVERVIEW.md`), not a blocker for this ADR.
- Full epic-wide live-gateway regression (re-running every Wave 1-4b US's
  live smoke test against this same stack) is explicitly OUT OF SCOPE for
  this US — that would be its own cross-cutting verification pass. This US
  verified the specific blocker it was asked to unblock (SSE + the 5-service
  Kong routing precondition) plus the already-`make stack-up`-proven Wave-0
  pattern (`US-E18.0`), not every individual wired cluster.
- `docker-compose.yml`'s `notification`/`social`/`lms`/`core`/`iam` containers
  are NOT published to the host at all (internal-network-only) — any future
  FE-side live-verification pass MUST go through Kong (`:8000`), never a
  direct host port; there is no direct host port to use even for local
  debugging anymore.

## Follow-Up

- Cross-repo observation (append to `EPIC-OVERVIEW.md`, not a blocking ask):
  `notification`'s `cmd/server` appears not to flush SSE response headers/
  body immediately on connect when idle (observed via `make stack-up`,
  2026-08-01) — worth a look on the `edu-api` side if a future US needs
  tighter reconnect/backoff timing guarantees; this repo's `EventSource`
  client already tolerates arbitrary connect-to-first-byte latency the same
  way it tolerates the mock upstream's heartbeat cadence, so no FE action is
  required today.
