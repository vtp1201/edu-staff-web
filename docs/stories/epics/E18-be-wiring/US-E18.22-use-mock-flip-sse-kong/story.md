# US-E18.22 Kong 5-service routing live-verify + SSE proxy re-architecture

## Status

implemented

## Lane

high-risk

## Dependencies

- Depends on: US-E18.18 (notification/SSE wiring, ADR `0061`) — this US executes
  ADR 0061's deferred Follow-Up item once its blocker (cross-repo ask #1/#36)
  resolved.
- Blocks: none (this closes the epic's last documented FE transport blocker;
  no other planned US in `EPIC-OVERVIEW.md` depends on it).
- Feature module(s) chạm: `src/app/[locale]/api/stream/` (SSE proxy route),
  `src/bootstrap/endpoint/noti.endpoint.ts`. No feature-domain code, no UI.
- Shared contract/file: `.env.example` (removes `NOTI_SERVICE_URL`, documents
  the Kong-routed replacement); `docs/decisions/0065-*.md` (new ADR).

## Product Contract

No user-visible behavior changes. This US removes a transport-layer blocker:
the notification/realtime SSE proxy's real (non-mock) branch, previously a
direct-bypass call to a bare `NOTI_SERVICE_URL` (ADR `0009`/`0030`), now routes
through Kong exactly like every other feature's HTTP call in this codebase
(`NEXT_PUBLIC_API_URL`). This is what edu-api's ADR `0047` (kong auth trust
model) requires — `notification`'s server trusts ONLY Kong-injected
`X-Edu-Claims`/`X-Edu-Claims-Sig` headers, so a direct-bypass call structurally
401s regardless of any Bearer token.

## Relevant Product Docs

- `docs/reports/2026-07-26-fe-to-be-verification-report.md` §4 — names this as
  "the last remaining FE task."
- `docs/reports/2026-08-01-fe-to-be-asks.md` Phần 1 — confirms ask #1/#36
  (Kong routing) resolved on `edu-api origin/main`.
- `docs/decisions/0061-notification-sse-contract-remap.md` — Follow-Up item
  this US executes.
- `docs/decisions/0047-kong-auth-trust-model-review.md` (edu-api repo,
  read-only reference) — the auth-trust-model constraint this US satisfies.
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — cross-repo asks
  #1/#33/#36, Wave 4c row for this US.

## Acceptance Criteria

- **AC-1 (Kong routing confirmed)**: `../edu-api/gateway/kong/kong.yml` on
  `origin/main` routes all 5 services (`iam`, `core`, `lms`, `notification`,
  `social`) with public-health + `edu-edge-auth`-protected business routes;
  `docker-compose.yml` defines containers for all 5 (previously `social`/`lms`
  were absent). Verified by direct file read, not assumption.
- **AC-2 (live gateway proof)**: running a real `make stack-up` (edu-api repo)
  brings up all services healthy including `edu-kong`; `GET /noti/api/v1/stream`
  through Kong with a valid Bearer token authenticates (`200` at
  `notification`'s own access log); the identical call with no `Authorization`
  header is rejected at Kong (`401`) before reaching the service.
- **AC-3 (SSE proxy re-architected)**: `app/[locale]/api/stream/route.ts`'s
  real (non-mock) branch fetches `${NEXT_PUBLIC_API_URL}${NOTI_EP.stream}`
  (Kong) instead of `${NOTI_SERVICE_URL}${NOTI_EP.stream}` (direct-bypass);
  `NOTI_EP.stream` changes from `/api/v1/stream` to the Kong-prefixed
  `/noti/api/v1/stream`; the `USE_MOCK || !NOTI_URL` compound condition
  collapses to plain `USE_MOCK` (Kong URL always has a default, matching
  every other repository's DI pattern).
- **AC-4 (env cleanup)**: `NOTI_SERVICE_URL` removed from `.env.example`
  (retired — no longer read anywhere in `src/`); replaced with a comment
  pointing at `NEXT_PUBLIC_API_URL` + this US/ADR.
- **AC-5 (zero regression)**: mock-mode behavior unchanged (still serves
  `createMockUpstream`, never calls `fetch`); tenant-mismatch 403 gate
  (`resolveStreamTenant`) unchanged; unauthenticated 401 gate unchanged;
  upstream-failure → 502 unchanged.
- **AC-6 (ADR)**: a new ADR (`0065`) documents the supersession of the
  direct-bypass architecture, citing the live evidence (network segmentation
  + Kong-routed auth success) gathered under AC-2.
- **Non-goal**: this US does NOT flip any committed `NEXT_PUBLIC_USE_MOCK`
  default, and does NOT re-verify every other Wave 1-4b US's individual
  real-mode behavior against the live stack — those stay each US's own
  documented proof. It also does NOT touch any permanently-force-mocked DI
  factory (feed, moderation, staff-leave, teaching-plan, academic-records
  viewer/unseal, principal-classes, etc.) — those are unaffected by this
  transport-layer fix by design.

## Design Notes

- Commands: none (no domain/use-case change — infra/bootstrap-only).
- Queries: none.
- API: `NOTI_EP.stream` path changes (`bootstrap/endpoint/noti.endpoint.ts`);
  no new endpoint, no DTO/mapper change.
- Tables: n/a.
- Domain rules: n/a — zero domain/entity/use-case touched.
- UI surfaces: **none**. This story does not touch any component, page, or
  design-spec entry — the design-review gate (`docs/DESIGN_REVIEW.md`) and
  `fe-accessibility-auditor` are **N/A** for this US (infra/transport-only,
  same class as US-E18.19's tiny-lane raw-flag sweep, though this one is
  high-risk lane because it touches the auth/realtime bootstrap surface, per
  the intake gate's hard-gate flags — auth/session-adjacent + gateway trust
  model).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `src/app/[locale]/api/stream/route.test.ts` — Kong-routed real branch (URL + Bearer header), default-Kong-URL fallback, mock-mode no-fetch, 502 passthrough. `stream-tenant.test.ts` unchanged (no logic touched). |
| Integration | Live `make stack-up` gateway proof (AC-2) — register→signin→SSE-through-Kong with/without Bearer token, captured in Evidence below. |
| E2E | n/a (no UI/flow change; SSE consumer components untouched). |
| Platform | `tsc --noEmit`, `bun run build` (with `NEXT_PUBLIC_USE_MOCK` unset, per the build-guard precedent from US-INFRA.2) green; full `bun vitest run` zero-regression. |
| Release | pre-push gate green, auto-merge to `main`, `edu-api` stack torn down after verification (no lingering state owned by this US). |

## Evidence

- **Kong routing ground-truth**: `../edu-api/gateway/kong/kong.yml` read
  directly — services `iam-public`/`iam-users`/`iam-tenants`/`iam-members`/
  `iam-invitations`/`iam-signout` (+internal-deny), `core-health`/
  `core-protected`, `lms-health`/`lms-protected`, `notification-health`/
  `notification-stream`/`notification-protected`, `social-health`/
  `social-protected` — all 5 services present, `notification-stream` carries
  `response_buffering: false`/`read_timeout: 3600000`. `docker-compose.yml`
  confirmed to define `social`+`social-worker`+`lms`+`lms-worker` containers
  (previously absent per the 2026-07-26 audit).
- **Live stack**: `make -C ../edu-api stack-up` → `docker compose ps` shows 11
  containers, all healthy/started, including `edu-kong` (healthy),
  `edu-lms`/`edu-lms-worker` (started), `edu-social`/`edu-social-worker`
  (healthy/started, already running from a prior session).
- **Kong health routes** (`curl :8000/{iam,noti,social,lms}/health`) → all
  `200`.
- **Auth flow through Kong**: `POST /iam/api/v1/auth/register` → `201`;
  `POST /iam/api/v1/auth/signin` with `clientId: "edu-web"` (IAM's seeded
  first-party OAuth client, `internal/oauth/core/application/usecase/
  seed_clients.go`) → `200` + `accessToken`/`refreshToken`/`sessionId`.
- **SSE through Kong**: `GET /noti/api/v1/stream` with
  `Authorization: Bearer <token>` → Kong forwards to `notification`, whose OWN
  access log records `200 | GET | /api/v1/stream` (`05:01:34`, `05:01:52` —
  matching the two live test requests). The identical call with NO
  `Authorization` header → Kong returns `401` directly (never reaches
  `notification`, confirmed via `docker logs edu-kong` showing
  `"GET /noti/api/v1/stream HTTP/1.1" 401` with no corresponding
  `edu-notification` log line for that timestamp).
- **Network segmentation confirmation**: `docker port edu-notification` → no
  published host port; `docker inspect edu-notification` shows only the
  `docker_internal` network — confirming the OLD `NOTI_SERVICE_URL`
  direct-bypass design has no reachable target in this topology at all
  (beyond the auth incompatibility ADR 0047 already documented).
- **Unit**: `bun vitest run "src/app/[locale]/api/stream/*.test.ts"` →
  9/9 pass (4 in `route.test.ts` incl. 2 new: default-Kong-URL fallback +
  502-passthrough; 5 in `stream-tenant.test.ts`, untouched).
- Full suite / `tsc` / `bun run build` — see final commit's CI run (this
  packet's Harness Delta records the exact counts at merge time).

## Harness Delta

- `harness-cli story add --id US-E18.22 --lane high-risk` (this packet).
- `harness-cli decision add --id 0065 --title "SSE proxy routes through Kong (retires direct-bypass architecture)"` — registers `docs/decisions/0065-sse-proxy-through-kong.md`.
- `harness-cli story update --id US-E18.22 --status implemented --unit 1 --integration 1 --e2e 0 --platform 1` after the full suite + build are confirmed green (integration proof = the live-gateway verification above, not an automated test file — recorded as Evidence).
- `docs/TEST_MATRIX.md` — add a row for US-E18.22 (unit: SSE proxy Kong-routing test; integration: live-gateway manual verification, documented not automated).
