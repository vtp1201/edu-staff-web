# US-E18.59 Invitation redeem/lookup — browser-direct fetch (rate-limit IP fidelity)

## Status

in-progress

## Lane

high-risk

> Hard-gate flags: token/session handling + a deliberate, ADR-recorded
> deviation from this repo's server-only HTTP boundary — the FIRST BE call
> issued directly from a Client Component in this codebase. See
> `docs/decisions/0072-invitation-browser-direct-fetch.md` (already drafted,
> registered).

## Dependencies

- Depends on: none (independent feature module — may run in any order relative to US-E18.56/57/58)
- Blocks: none
- Feature module(s) chạm: `src/features/auth/` (invitation-redeem slice only — accept-flow, login, register, all untouched), `src/bootstrap/di/invitation-redeem.di.ts` (removed), `src/app/[locale]/(auth)/invitations/redeem/`
- Shared contract/file: `bootstrap/lib/http.ts` (reuse its `API_URL` — export it, do not duplicate), `bootstrap/lib/api-envelope.ts` (`ApiError`, reused unchanged), `bootstrap/lib/auth-token.server.ts#setAuthCookies` (reused, unchanged signature)

## Ground truth (BE response 2026-08-08 §5, ADR 0072)

Read `docs/decisions/0072-invitation-browser-direct-fetch.md` in full first —
it is the authoritative decision record for this story; this packet is the
implementing scope, not a second copy of the rationale.

Summary: `POST /iam/api/v1/invitations/{lookup,redeem}` are both PUBLIC,
per-IP rate-limited (10/min) at IAM, and every call currently goes through
this Next server (RSC `page.tsx` for lookup, `redeemAction` Server Action for
redeem) — Kong sees ONE IP (the Next server's) for every visitor, so one
abusive invitee 429-locks everyone else out of account creation. BE's fix:
call both routes directly from the browser. Additionally, BE found and fixed a
**gateway bug** while verifying this: these two routes were unreachable
through Kong at all before the fix (`edu-edge-auth` matched them against the
ADMIN-only `/invitations` prefix route) — this is a **deploy-order
dependency** (Kong reload with the new `kong.yml`), not something FE can work
around; the old Server Action path was ALSO broken through the real gateway
before that fix (worked only via mocks or a direct-to-service debug URL).

## Current state (read before touching anything)

- `page.tsx` (`(auth)/invitations/redeem/page.tsx`) is an RSC that calls
  `makeLookupInvitationUseCase()` (server-side DI) to build the initial VM,
  then passes `redeemAction` (a `'use server'` function) as the `onRedeem`
  prop into `<InviteRedeemScreen>`.
- `InviteRedeemScreen` (`presentation/invite-redeem/invite-redeem-screen.tsx`)
  is a pure presentational client component: takes `vm: InviteRedeemVM`,
  `onRedeem`, renders the form, calls `onRedeem(token, password, fullName)` on
  submit, and switches on the result (`errorKey`/`issues`, or nothing on
  success since `redeemAction` redirects internally via `next/navigation`).
- `redeemAction` (`(auth)/invitations/redeem/actions.ts`) calls
  `makeRedeemInvitationUseCase()`, on success calls `setAuthCookies(tokens)`
  then computes the app-role redirect target and calls `redirect()`.
- `bootstrap/di/invitation-redeem.di.ts` composes `InvitationRedeemRepository`
  (real, `server-only`, `createHttpClient()` with NO token) or
  `MockInvitationRedeemRepository` (`server-only`, in-memory replay-detection
  mock using `Buffer`-based fake-JWT minting — Node-only, NOT browser-safe as
  written).
- `LookupInvitationUseCase` / `RedeemInvitationUseCase`
  (`domain/use-cases/`) are PURE TypeScript — no `'server-only'`, depend only
  on the `IInvitationRedeemRepository` interface. **These are reusable
  as-is** with a new, browser-safe repository implementation — do not rewrite
  their logic (password/fullName client-side guard rules, blank-token
  short-circuit, failure normalization) client-side; just construct them with
  a different repo.
- `mapInvitationRedeemFailure` (`infrastructure/mappers/invitation-redeem.mapper.ts`)
  branches on `errorCodeOf(err)`/`statusOf(err)` from `bootstrap/lib/api-envelope.ts`,
  which special-case `err instanceof ApiError` (reading `.code`/`.status`/
  `.retryAfterSeconds` directly off the class) before falling back to an
  Axios-shaped `err.response`. **This means a hand-thrown `ApiError` from a
  plain `fetch()` call is already fully supported** — no new failure-mapping
  code is needed, only a fetch→ApiError adapter in the new repository.
- `bootstrap/lib/http.ts`'s `API_URL` constant (`NEXT_PUBLIC_API_URL ??
  "http://localhost:8000"`) is a MODULE-PRIVATE `const`, not exported, and the
  file itself has NO `'server-only'` guard (confirmed) — it is already
  technically client-importable, it just doesn't export the one thing needed.
- `(auth)` route group has no `layout.tsx` (falls through to the root
  `[locale]/layout.tsx`, which does not wrap `ReactQueryProvider` —
  `ReactQueryProvider` is only present in `(app)/layout.tsx`, per the
  `(app)`-shell precedent). `useState`/`useEffect` for remote data is
  disallowed by `.claude/CLAUDE.md` (TanStack Query mandated) — this story
  must NOT modify the shared `(app)` shell or root layout for a single public
  screen; scope the `QueryClientProvider` LOCALLY to this screen instead (see
  Scope §5).

## Scope

1. **Export `API_URL`** from `bootstrap/lib/http.ts` (rename export, keep the
   same fallback logic) so the new browser repository reads the identical base
   URL as every other client — no second source of truth for the Kong origin.

2. **New browser-safe real repository** —
   `src/features/auth/infrastructure/repositories/invitation-redeem.browser.repository.ts`.
   NO `'server-only'` import (this is the ADR's whole point — flag this
   absence in the file's own doc comment so a future grep for "infra without
   server-only" finds an intentional, documented exception, not a mistake).
   Implements `IInvitationRedeemRepository` with `fetch()`:
   - `lookup(token)`: `fetch(`${API_URL}${IAM_MEMBER_EP.lookupInvitation}`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({token}) })`, **no** `credentials` option (equivalent to `credentials: "omit"` — the default already omits cookies for cross-origin, but set it explicitly per the ADR for same-origin-dev-proxy safety too).
   - `redeem(command)`: same shape, body `{token, password, fullName}` (fields listed explicitly, mirroring the deleted repo's discipline — never spread `...command`), plus header `"X-Client-Id": OAUTH_CLIENT_ID`.
   - Parse the JSON body; if `!body.success` OR the HTTP status is not 2xx,
     throw `new ApiError({ code: body?.error?.code ?? "UNKNOWN_ERROR", message: body?.error?.message ?? "Request failed", retryable: body?.error?.retryable ?? false, fields: body?.error?.fields, requestId: body?.meta?.requestId, status: response.status, retryAfterSeconds: <parse the `Retry-After` header the same delta-seconds-only way `parseRetryAfter` does in `api-envelope.ts` — do not import that private function; either export it too or re-implement the same 3-line numeric parse locally> })`.
   - A `fetch` that rejects (network down, CORS failure, DNS) → catch and throw
     `new ApiError({ code: "NETWORK_ERROR", message: "...", retryable: true, status: 0 })` — mirrors `NETWORK_ERROR_CODE` from `api-envelope.ts` (import the constant, don't retype the string).
   - Success: parse `body.data` and map through the EXISTING
     `mapInvitationPreview`/`mapRedeemedInvitation` (`infrastructure/mappers/invitation-redeem.mapper.ts`) — reuse them unchanged; they only look at the DTO shape, not at how the byte stream arrived.

3. **New browser-safe mock repository** —
   `src/features/auth/infrastructure/repositories/mocks/invitation-redeem.browser-mock.repository.ts`.
   Same behavior contract as `MockInvitationRedeemRepository` (failure markers
   in the token, single-use/replay detection via a static `Set`, 3-day
   `expiresAt`) but:
   - NO `'server-only'` import.
   - NO `Buffer` (Node-only, unavailable in the browser) — mint the fake JWT
     with browser-safe base64url (`btoa(...).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")`
     or equivalent) instead of `Buffer.from(...).toString("base64url")`.
   - Keep `mockDelay`-equivalent latency IF `bootstrap/lib/mock.ts#mockDelay`
     is not client-importable (it has no `'server-only'` guard either per a
     quick check — confirm before deciding whether to reuse it directly or
     inline an equivalent `setTimeout` wait).
   - The OLD `MockInvitationRedeemRepository` (server-only) becomes dead once
     nothing constructs it — DELETE it and its test, don't leave two mocks.

4. **Client-safe factory** (small, colocated with the new browser repos or in
   `presentation/invite-redeem/`) — reads
   `process.env.NEXT_PUBLIC_USE_MOCK === "true"` DIRECTLY (do not import
   `bootstrap/lib/mock.ts`'s `USE_MOCK` — that module is `'server-only'`) and
   returns the mock or real browser repository. This is the client-side
   equivalent of a DI factory but deliberately NOT placed under
   `bootstrap/di/` (that directory's whole contract is `'server-only'`
   composition — putting a client factory there would be a lie about the
   layer). Name it something explicit, e.g. `makeBrowserInvitationRedeemRepository()`.

5. **Rework the screen's data flow** — the lookup becomes a client-side fetch,
   not an RSC prop:
   - `page.tsx` no longer calls `makeLookupInvitationUseCase()`. It becomes a
     THIN RSC that only reads `searchParams.token`, validates it's non-blank
     (same zero-network short-circuit for a manifestly empty token — this
     check needs no BE call either way, keep it), and renders a new client
     container passing just `token` + the two `Href` strings it already
     builds. A blank token still renders the `invalid` VM state directly (no
     fetch attempted) — preserve that optimization.
   - New client container (e.g. `invite-redeem-container.tsx`,
     `'use client'`) owns: a LOCAL `QueryClient` (instantiate via
     `useState(() => new QueryClient())`, wrap children in its own
     `<QueryClientProvider>` — scoped to this screen only, do NOT touch the
     shared root/`(app)` layout), a `useQuery` for the lookup (`queryKey:
     ["invitation-lookup", token]`, calls `LookupInvitationUseCase` built from
     the client-safe repo factory), and a `useMutation` for redeem (calls
     `RedeemInvitationUseCase`, same repo).
   - Loading state: the lookup `useQuery`'s pending state needs a VM variant
     the current `InviteRedeemVM` union does not have (it was designed for a
     one-shot RSC render that never showed loading) — add `{ kind: "loading"
     }` and a skeleton/spinner render in `InviteRedeemScreen` for it. This is
     new, unavoidable UI (see design-review note below).
   - On successful redeem: call the NEW narrow Server Action
     `finalizeRedeemAction(member, tokens)` (below) — do NOT call
     `setAuthCookies` from the client (it needs `next/headers`, server-only)
     and do NOT redirect client-side with a client-computed target (ADR 0072
     §Decision 3 — the redirect target must stay server-derived from the
     SAME data the old `redeemAction` used, `member.tenantId`+`roles[0]`, to
     keep the "never accept a next/returnTo from the client" security
     property).
   - On failure: render inline exactly like today (`errorKey`/`issues` from
     the mutation's error, mapped through the untouched
     `mapInvitationRedeemFailure`).

6. **New narrow Server Action** — `finalizeRedeemAction` (replacing
   `redeemAction`'s body, in the same `actions.ts` file or a differently named
   one; keep `actions.test.ts` coverage). Signature: takes the ALREADY-
   REDEEMED `member`/`tokens` (the client already has them — the browser did
   the actual `POST /redeem`), and does ONLY:
   - `setAuthCookies(tokens)`,
   - compute the redirect target exactly as the old `redeemAction` did
     (`appRoleOf`/lowercase fallback, `tenantUrl`),
   - `redirect(...)`.
   It must **NOT** call `makeRedeemInvitationUseCase()` or re-hit IAM — that
   would silently reintroduce the one-IP problem this whole story exists to
   remove. `fe-tech-lead-reviewer` must verify this explicitly (grep the
   function body for any IAM/DI import).

7. **Delete** `bootstrap/di/invitation-redeem.di.ts` and the two server
   repositories (`invitation-redeem.repository.ts`,
   `mocks/invitation-redeem.mock.repository.ts`) + their tests, once nothing
   references them (grep-confirm). `redeemAction`'s OLD body is replaced, not
   kept as a second, now-unused, code path.

8. **Rewrite/replace tests** that exercised the OLD server-action path
   (`redeem/actions.test.ts`, `redeem/page.test.ts`) — these are explicitly
   called out in the ask as tests that "pass via mock or bypass gateway" and
   must be retired/replaced with tests of the NEW browser-direct flow +
   the new narrow `finalizeRedeemAction`. Do not leave the old test files
   green-but-testing-a-deleted-path.

## NOT in scope

- The accept-flow (`(auth)/invitations/accept/`) — completely separate,
  authenticated, untouched (ADR 0059, still binding for that flow).
- Login, register, or any other public auth screen — this is the ONLY screen
  this ADR's exception covers; do not generalize the browser-fetch pattern
  elsewhere without its own ADR (per ADR 0072 Consequences).
- The Kong `kong.yml` change itself — BE-owned, already shipped; this US only
  depends on it being DEPLOYED (see EPIC-OVERVIEW.md deploy notes) to work
  against a real stack. Local/CI testing against mocks is unaffected either
  way.
- Building a general `bootstrap/lib/http.browser.ts` — the ADR's Follow-Up
  explicitly defers that until a SECOND consumer needs the same pattern; keep
  this story's new files narrowly scoped to the invitation-redeem slice.

## Acceptance Criteria

- Real mode: `lookup` and `redeem` are issued by `fetch()` FROM THE BROWSER
  (verifiable in a network trace / integration test asserting the call
  originates client-side, not via a Server Action or RSC data fetch) —
  Kong therefore sees each visitor's real IP.
- The token never appears in a query string, a header (other than the fixed
  `X-Client-Id` audit header on `redeem`, which never carries the token), or
  a log line, on either call — regression-tested (ADR 0071's guarantee must
  survive this move unchanged).
- No `credentials`/cookie is sent with either browser call.
- On successful redeem, the session is established via httpOnly cookies
  exactly as before (`setAuthCookies`, same cookie names/options/maxAge) and
  the visitor lands on the same tenant-scoped route as before — behavior
  identical to the pre-US-E18.59 Server Action flow from the USER's
  perspective, except for the (new, brief) loading state during lookup.
- `finalizeRedeemAction` makes NO IAM call — verified by a test, not just a
  code read.
- `USE_MOCK=true` still exercises every VM state (`invalid`/`expired`/
  `rate-limited`/`tenant-inactive`/`error`/`form`/the new `loading`) end to
  end in the browser, with no `Buffer`/Node-only API in the code path that
  now runs client-side.
- Zero regression to the accept-flow or any other auth screen.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | browser repository test (fetch mocked — success maps through existing mappers unchanged; non-2xx/`success:false`/network-reject all produce the correct `ApiError` shape consumed correctly by the UNCHANGED `mapInvitationRedeemFailure`); browser mock repository test (failure markers, replay detection, browser-safe token minting, no `Buffer`) |
| Integration | new `finalizeRedeemAction` test proving it calls `setAuthCookies` + `redirect`, and does NOT construct any IAM use-case/DI factory; container/hook test proving the lookup fires from a client `useQuery`, not a server prop |
| E2E | Storybook interaction for the container covering `loading` → `form`/`invalid`/`expired`/`rate-limited`/`tenant-inactive`/`error`, plus a submit → success path (mock mutation) and submit → `account-exists`/`invalid-input` inline-error paths |
| Platform | `bun vitest run` zero-regression, `bunx tsc --noEmit`, `bun lint`, `bun run build` (mock AND real) |
| Release | merged to main, branch deleted |

## Harness Delta

- `harness-cli story update --id US-E18.59 --status implemented --unit 1 --integration 1 --e2e 1 --platform 1` once proof exists.
- ADR `0072` already registered — mark any amendment if implementation forces a decision change (e.g. if `Retry-After` parsing genuinely needs its own exported helper rather than a re-implementation, note it as a `Consequences` addendum, don't silently diverge from the ADR text).
- Mark ask #49 answered/closed (plus the gateway-bug finding acknowledged) in the batch consumption report.
- `docs/product/screens.md` note if the redeem screen's loading state is a materially new visible state (likely yes — flag to the design-review gate).

## Evidence

(fe-nextjs-engineer / fe-tech-lead-reviewer / fe-accessibility-auditor / fe-qa-playwright fill in below as work proceeds.)
