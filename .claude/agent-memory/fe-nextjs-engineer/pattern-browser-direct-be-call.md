---
name: pattern-browser-direct-be-call
description: E18.59 — moving a public rate-limited endpoint off the server onto a browser fetch (ADR 0072); fetch→ApiError adapter reuses the mapper, narrow finalize action, local QueryClient
metadata:
  type: project
---

US-E18.59 (ADR 0072) made the FIRST BE call issued from a Client Component:
`POST /invitations/{lookup,redeem}` are per-IP rate limited, and calling them from the
Next server meant Kong saw ONE IP for every visitor (one abuser 429-locks everyone).

**Why:** the same reasoning applies to any PUBLIC endpoint whose limit/quota is keyed on
the caller's IP. Anything authenticated stays server-side (httpOnly cookies).

**How to apply:** when a packet says "call it from the browser".

### The move is cheap because of ONE adapter
Do NOT rewrite failure mapping. `errorCodeOf`/`statusOf`/`retryAfterSecondsOf` special-case
`err instanceof ApiError` BEFORE the axios `err.response` fallback, so a hand-built
`ApiError` from `fetch` flows through the existing mapper untouched. Export one
`apiErrorFromResponse(status, body, headers)` and unit-test it directly (that also avoids
inventing a test-only repo method). Network reject → `ApiError{code: NETWORK_ERROR_CODE,
status: 0, retryable: true}`. `await response.json().catch(() => undefined)` — a gateway
502 returns HTML and must degrade, not throw a parse error.

### What actually has to change
- `bootstrap/lib/http.ts#API_URL` was module-private → export it (no 2nd origin source).
- The browser repo/mock/factory carry NO `'server-only'`; put a loud "absent ON PURPOSE"
  header comment so the grep for missing guards finds an ADR reference.
- The mock cannot use `bootstrap/lib/mock.ts` at all (`USE_MOCK` *and* `mockDelay` are in a
  `server-only` module) and cannot use `Buffer` → `btoa` base64url. Prove browser-safety by
  `delete globalThis.Buffer` inside the test, not by reading the source. Latency = injected
  constructor arg (0 in tests, ~400ms from the factory) so the new loading state is visible
  in dev without flaky tests.
- Client factory goes NEXT TO the repos, never in `bootstrap/di/` (that dir's contract is
  server-only composition), and reads `process.env.NEXT_PUBLIC_USE_MOCK` per CALL.
- `bun run build` with `NEXT_PUBLIC_USE_MOCK=true` is the real proof no `server-only`
  module reached the client bundle.

### Screen shape
Thin RSC (params + hrefs + passes the server action as a prop) → `'use client'` container
owning a LOCAL `QueryClient` via `useState(() => new QueryClient({...}))` — `(auth)` has no
provider and widening a shared layout for one public page is wrong. **`retry: false`
everywhere**: an automatic retry spends the visitor's own rate-limit slots. Container takes
a `repository?` prop as the story/test seam (RSC never passes it) — that is how interaction
stories drive the real `useQuery`/`useMutation`. A blank param renders the terminal card
straight from the RSC (container never mounts ⇒ zero-network is structural), which needs
the screen's action prop to become optional.

### The security delta nobody states up front
Session issuance can't move: the client posts the ALREADY-ISSUED `{member, tokens}` to a
narrow `finalizeAction` = `setAuthCookies` + redirect, NOTHING else. Prove "no IAM call"
twice: spy `globalThis.fetch`, AND `readFileSync` the action source asserting it matches no
`bootstrap/di`/`infrastructure/repositories`/`UseCase`. But note the real consequence: the
redirect target is no longer server-attested. Derive the tenant segment from the ACCESS
TOKEN claim (`decodeTenantId`) with the member as fallback, and flag the residual
(Next's Server-Action origin check is now the only guard) to fe-lead as an ADR addendum.

Related: [[pattern-public-unauth-flow]], [[pattern-tenant-switch-e23-1]],
[[pattern-raw-flag-interceptor-guard]].
