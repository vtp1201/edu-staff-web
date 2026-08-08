# 0072 Invitation lookup/redeem call IAM directly from the browser (amends 0071)

Date: 2026-08-08

## Status

Accepted

## Context

Every authenticated (and most public) BE call in this repo goes through a
**server-only** HTTP boundary — `bootstrap/lib/http.server.ts`
(`createServerHttpClient()`, reads the httpOnly cookie) for authenticated
calls, or a server-composed `createHttpClient()` for the few public calls that
exist today (`bootstrap/di/invitation-redeem.di.ts`), always invoked from an
RSC (`page.tsx`) or a Server Action (`'use server'`). This keeps the client
bundle free of any HTTP-calling code and centralizes token handling — see
`.claude/CLAUDE.md` §HTTP / Data Fetching and the Clean-Architecture layer
table (`presentation/` "không được import … không gọi http").

Ask `#49` (FE→BE report `docs/reports/2026-08-08-fe-to-be-asks.md` #20) flagged
that `POST /iam/api/v1/invitations/{lookup,redeem}` — both PUBLIC, unauthenticated,
rate-limited **per-IP at 10/min in IAM** (BE US-191) — are always called from
this Next server (the RSC `page.tsx` does the `lookup`, the `redeemAction`
Server Action does the `redeem`). Kong's `edu-edge-auth`/rate-limit layer sees
the **peer IP of the caller of Kong**, which for both calls is the Next
server's own egress IP, identical for every visitor. BE confirmed
(`docs/reports/2026-08-08-be-to-fe-response.md` §5.1, US-207): US-197
(`X-Real-IP` fidelity) does **not** fix this — Kong overwrites `X-Real-IP` with
the peer's address regardless of any `X-Forwarded-For` the Next server might
forward, so a trust-chain fix would need to be platform-wide (Kong `real_ip`
config, ADR-0133-adjacent) and BE declined to build it since nothing else needs
the server-action path. **Every visitor currently shares one IP-keyed quota**:
one abusive invitee can 429-lock out every other invitee mid-flow, on the
account-creation path — the highest-consequence flow in the app to have this
defect.

BE's fix is on the client side: call both routes **directly from the browser**
so Kong sees the real per-visitor IP. This is safe specifically for these two
endpoints because:

- both are PUBLIC (no bearer token, no httpOnly cookie needed);
- the invitation token travels in the **POST body only** (ADR 0071, never a
  query string, never a header) — nothing new is exposed by moving the caller;
- Kong CORS for these two routes is already `origins: "*"`, methods include
  `POST`, headers include `Content-Type` — sufficient for a same-shape
  `fetch()` with no `credentials`.

This is a **deliberate, narrow exception** to the server-only HTTP rule, not a
precedent for calling BE from the client in general.

## Decision

1. `lookup` and `redeem` (`src/features/auth/…/invitation-redeem` slice) call
   IAM **directly from the browser** via `fetch`, not through
   `bootstrap/di/invitation-redeem.di.ts` / `createHttpClient()` / an RSC or
   Server Action. A new browser-safe collaborator
   (`src/features/auth/infrastructure/repositories/invitation-redeem.browser.ts`
   or equivalent under `presentation/`) issues the two `fetch()` calls,
   `credentials: "omit"`, `Content-Type: application/json`, target
   `NEXT_PUBLIC_API_URL` (the same public Kong base URL
   `bootstrap/lib/http.ts` already reads — no new env var).
2. The invitation-redeem **screen becomes the fetcher**: `page.tsx` no longer
   calls `makeLookupInvitationUseCase()` server-side; it renders a client
   component that performs the lookup itself on mount (loading state is new —
   see AC below) and the redeem submit likewise calls `fetch` directly instead
   of invoking `redeemAction`.
3. **Session issuance stays server-side.** `redeem` returns
   `{ member, tokens }`; `tokens` must still become httpOnly cookies, which a
   client component cannot set. So the flow is: browser `fetch` → redeem
   succeeds → client posts the returned tokens to a **narrow** Server Action
   (e.g. `finalizeRedeemAction(tokens, member)`) that does ONLY
   `setAuthCookies()` + compute the redirect target + `redirect()` — it must
   NOT re-call IAM. This keeps token-cookie writing on the one path
   (`setAuthCookies`, decision `0018`) while satisfying #49's IP-fidelity
   requirement for the rate-limited call itself.
4. `bootstrap/di/invitation-redeem.di.ts`'s server-side factories
   (`makeLookupInvitationUseCase`/`makeRedeemInvitationUseCase`) and the
   existing `InvitationRedeemRepository`/use-cases are **removed**, not kept
   as dead code — the whole point is that the rate-limited call must not
   originate server-side. If the mock (`USE_MOCK=true`) path needs an
   equivalent local mock server-side, wire it through the same browser fetch
   layer pointed at a mock base (see the story packet for the exact mock
   strategy) rather than reviving the server DI path.
5. Token-in-body / no-query-string / no-log discipline (ADR 0071, decision
   `0018`) is unchanged — a browser `fetch` body is exactly as safe as an
   Axios POST body here; nothing about this move adds a new place the token
   can leak (no `GET`, no URL param, no header).
6. Failure-code mapping (`InvitationRedeemFailure`) stays as a pure function
   over an HTTP status + BE error code — it now runs client-side, translating
   a `fetch` `Response`'s parsed envelope instead of an Axios-normalised
   `ApiError`. The mapping rules themselves do not change.

## Alternatives Considered

1. **Have Kong trust `X-Forwarded-For` from the Next server** (extend ADR
   0133's `real_ip` trust chain). Rejected by BE: platform-wide blast radius
   (every route behind Kong would then trust a header from ONE trusted
   upstream), and no other route needs the server-action path removed — not
   worth the exposure for two endpoints.
2. **Keep the Server Action, accept the shared-IP quota.** Rejected — an
   account-creation flow silently DoS-able by any single invitee is a data-
   integrity/availability risk on the highest-value new-user path in the app.
3. **Proxy through a Next.js Route Handler that forwards the real client IP
   itself** (Next has access to the true peer via `x-forwarded-for` set by
   the platform in front of it). Not chosen: still centralizes on ONE Next
   server whose own scaling/networking than could still collapse to a small
   IP pool depending on deployment topology, and it does not remove a hop —
   BE's ask was specifically "call Kong directly from the browser."

## Consequences

Positive:

- The per-IP rate limit does what it is meant to do: bound one invitee's
  abuse to their own IP, not the whole invitee population.
- No new attack surface: the token still never appears in a URL/header/log,
  and the public routes' CORS posture already covers this (BE-verified on the
  real stack, US-207 §5.2).

Tradeoffs:

- This is the **first** BE call issued directly from a Client Component in
  the app — a deliberate, narrow, ADR-recorded exception. `fe-tech-lead-reviewer`
  must confirm no other route copies this pattern without its own ADR.
- The lookup step, previously a zero-JS RSC render, now needs a client-side
  loading state (skeleton) it didn't have before — a small UX/complexity cost
  paid once for the fix.
- `finalizeRedeemAction` is a second Server Action surface that must be kept
  narrow (cookie-write + redirect ONLY) — a reviewer must check it does not
  quietly grow a second IAM call.
- The BE stack itself had a **latent gateway bug**, discovered while verifying
  this ask (US-207 §5.2): `/iam/api/v1/invitations/{redeem,lookup}` were never
  actually reachable through Kong before this fix (both 401'd at the edge —
  `edu-edge-auth` matched the ADMIN-only `/invitations` prefix route before
  the intended public ones). BE's Kong fix (anchored regex + `methods:[POST]`
  route) is a **deploy-order dependency**: FE's browser-direct call only works
  once Kong is reloaded with the new `kong.yml` — see EPIC-OVERVIEW.md §Deploy
  notes. Before that reload, the OLD Server Action path was *also* broken
  through the real gateway (only worked against a direct-to-service debug
  URL or mocks) — this was not a regression this US introduces.

## Follow-Up

- If a second public, rate-limited, account-affecting endpoint ever needs the
  same treatment, promote the browser-fetch collaborator + failure-mapping
  pattern to a shared `bootstrap/lib/http.browser.ts` instead of duplicating a
  second bespoke `fetch()` wrapper.

## Liên quan

- Amends `0071` (invitation redeem is public registration) — the WHAT (public
  redeem exists) is unchanged; this ADR only changes WHO calls it (browser vs
  Next server).
- `0059` (accept-flow, unaffected), `0018` (token hybrid / `setAuthCookies`),
  `0025`/`0033` (branch workflow).
- US-E18.53 (original wiring), US-E18.59 (this ADR's implementing story).
- `docs/reports/2026-08-08-be-to-fe-response.md` §5, `docs/reports/2026-08-08-fe-to-be-asks.md` #20.
