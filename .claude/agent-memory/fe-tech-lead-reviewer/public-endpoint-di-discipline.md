---
name: public-endpoint-di-discipline
description: Public/unauthenticated endpoints need their own DI file with a bare createHttpClient() — plus the FE-server-IP rate-limit caveat
metadata:
  type: project
---

For an endpoint that is genuinely **public / pre-session** (invitation lookup+redeem, and any
future public surface), the composition root must be its OWN `bootstrap/di/<x>.di.ts` that builds
`createHttpClient()` with **no token** — never `createServerHttpClient()` and never
`ensureFreshSession()`.

**Why:** on a shared device a stale `auth_token` cookie belonging to a DIFFERENT signed-in person
would otherwise ride along on an account-creation call (confused deputy), and pre-refreshing a
bystander's session is a pointless rotation. Established + proven by US-E18.53
(`invitation-redeem.di.ts` + `invitation-redeem.di.test.ts`, which asserts `["http:no-token"]` and
that `ensureFreshSession` is never called). Reuse that test shape.

**Companion caveat — BE per-IP rate limits are mis-bucketed.** Both RSC loads and Server Actions
call the BE *from the Next.js server*, and this repo forwards **no** `X-Forwarded-For` /
`X-Real-IP` anywhere (`bootstrap/lib/http.ts` sets none). So any BE limiter documented as
"N/min per client IP" actually buckets the entire app's traffic under one origin IP: legitimate
users starve each other, and a single abuser 429s everyone. Do not unilaterally add an XFF header
(BE trusting a client-settable header is its own spoofing hole) — raise it as an FE→BE ask/ADR.

**How to apply:** on any story touching a public endpoint, check (a) the separate DI + bare client,
(b) token/credential in the POST **body**, never a query string (assert the serialised URL in a
real-axios-pipeline test), (c) whether the story leans on a per-IP BE limit — if so, flag the
bucketing gap.
