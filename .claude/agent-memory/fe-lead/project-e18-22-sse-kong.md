---
name: project-e18-22-sse-kong
description: US-E18.22 closed the epic's last FE transport blocker (SSE proxy re-architecture through Kong) with real make stack-up live verification
metadata:
  type: project
---

US-E18.22 implemented (merged 937a281). Closed cross-repo ask #1/#33/#36:
Kong now routes all 5 edu-api services (social/notification/lms added on
`origin/main`). Re-architected `app/[locale]/api/stream/route.ts`'s real
branch from direct-bypass (`NOTI_SERVICE_URL`, ADR 0009/0030) to routing
through Kong (`NEXT_PUBLIC_API_URL`, same convention as every other repo
call) — required by edu-api ADR 0047 (notification trusts ONLY Kong-injected
X-Edu-Claims). `NOTI_EP.stream` remapped `/api/v1/stream` → Kong-prefixed
`/noti/api/v1/stream`. ADR `0065` (next free number was 0065 after 0064).

**Why:** `docs/reports/2026-07-26-fe-to-be-verification-report.md` §4 named
this the literal last remaining FE task before `NEXT_PUBLIC_USE_MOCK` could
be flipped globally.

**How to apply:** when a future US needs to run a live-gateway proof against
edu-api, the recipe that worked: `docker ps` first to see what's already
running (a stack was half-up from a prior session — iam/core/notification/
social/infra, but no kong/lms), then `make -C ../edu-api stack-up` in the
background (rebuilds + starts only what's missing, ~2min). Get a real Bearer
token via `POST /iam/api/v1/auth/register` then `/auth/signin` with
`clientId: "edu-web"` (IAM's seeded first-party OAuth client — `signin`
requires a valid `clientId`, `USER_INVALID_CLIENT` otherwise; see
`services/iam/internal/oauth/core/application/usecase/seed_clients.go`).
Service containers have NO published host ports under the ADR-0047 network
segmentation — everything must go through Kong at `:8000`, there is no
direct-service host port to fall back to even for debugging. To confirm an
SSE endpoint's auth without waiting for a body flush (Fiber/Go services may
not flush headers to a curl/python client for several seconds even after
logging 200 server-side): compare `docker logs <service>`'s own access log
timestamp against your request timestamp, and diff the with-token vs
no-token request's Kong-level status code — that alone is sufficient proof,
don't chase the client-side byte-flush latency (that's a BE-side Fiber
buffering nuance, out of scope, just flag it).

Tear-down discipline: only stop what you started fresh (`docker compose stop
lms lms-worker kong`), leave whatever was already running from a prior
session/other work untouched — don't `stack-down` blindly, it may drop a
teammate's in-progress state.

See [[project-e18-be-wiring]] for the epic's overall status (now includes
Wave 4c). This closes the epic's FE-side transport-layer work; remaining
open items are all BE-side asks (denormalized display names, feed/moderation
gaps, etc.) tracked in `EPIC-OVERVIEW.md`, not FE work.
