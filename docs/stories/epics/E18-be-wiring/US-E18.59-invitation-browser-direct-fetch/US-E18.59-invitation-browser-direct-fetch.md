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

### fe-nextjs-engineer — implementation (2026-08-08)

**What was built** (TDD red → green throughout; every test file below was written
before the module it covers, and the red run was observed).

| Layer | File | Note |
| --- | --- | --- |
| bootstrap/lib | `http.ts` | `API_URL` promoted from module-private const to a named export. No other change; every axios client still reads the same constant. |
| infrastructure (NO `server-only`, ADR 0072 exception) | `invitation-redeem.browser.repository.ts` | `fetch`-based `IInvitationRedeemRepository`. `credentials: "omit"`, `Content-Type` only on lookup, `+X-Client-Id` on redeem. Exports `apiErrorFromResponse()` — the fetch→`ApiError` adapter, which is why `mapInvitationRedeemFailure` needed **zero** changes. Success maps through the EXISTING `mapInvitationPreview`/`mapRedeemedInvitation`. |
| infrastructure (mock) | `mocks/invitation-redeem.browser-mock.repository.ts` | Behaviour-identical to the deleted server mock (failure markers, single-use replay → `link-invalid`, 3-day expiry) but `Buffer`-free (`btoa` base64url) and `server-only`-free. Latency is an injected constructor arg (0 in tests, 400ms from the factory) instead of `mock.ts#mockDelay`, which is `server-only`. |
| infrastructure (client composition) | `make-browser-invitation-redeem-repository.ts` | Reads `process.env.NEXT_PUBLIC_USE_MOCK` directly per call. Deliberately NOT under `bootstrap/di/` (that directory's contract is `server-only`). |
| presentation | `invite-redeem-flow.ts` | Framework-free core: `lookupVm()` (query state → VM incl. the new `loading`), `toActionResult()`, `runRedeem()` (browser redeem → narrow finalize; rethrows the finalize/redirect throw). |
| presentation | `invite-redeem-container.tsx` (`'use client'`) | Local `QueryClient` (`retry: false` everywhere — an automatic retry would spend the visitor's own rate-limit slots), `useQuery` lookup (`enabled` only for a non-blank token), `useMutation` redeem, both built on the reused pure use-cases. `repository?` prop is a story/test seam the RSC never passes. |
| presentation | `invite-redeem.i-vm.ts`, `invite-redeem-screen.tsx` | New `{ kind: "loading" }` variant + skeleton render (`role="status"`, `aria-live="polite"`, `aria-busy`, sr-only copy). `onRedeem` is now optional (the formless states have nothing to submit). |
| app | `redeem/page.tsx` | Thin RSC: reads the param, builds the hrefs, renders the container. Blank token renders the `invalid` card directly — no container mounted at all, so the zero-network guarantee is structural. |
| app | `redeem/actions.ts` | `redeemAction` → `finalizeRedeemAction(member, tokens)`: `setAuthCookies` + redirect ONLY. |
| deleted | `bootstrap/di/invitation-redeem.di.ts` (+test), `invitation-redeem.repository.ts` (+test), `invitation-redeem.http.test.ts`, `mocks/invitation-redeem.mock.repository.ts` (+test) | Plus the `export *` line in `bootstrap/di/index.ts`. Grep-confirmed zero remaining references. |

**Proof (all commands run on this branch, output observed):**

- `bun vitest run` → **518 files / 4110 tests passed**, 0 failed (full suite, zero regression; accept-flow, login and every other auth screen untouched and green).
- `bun run vitest:storybook run src/features/auth/presentation/invite-redeem` → **2 files / 29 tests passed** (17 screen + 12 container interaction stories).
- `bunx tsc --noEmit` → clean (no output).
- `bun lint` → 0 errors (1 warning + 1 info, both pre-existing in `message-context-menu.tsx`; verified identical on a stashed baseline).
- `bun run build` → success in real mode AND with `NEXT_PUBLIC_USE_MOCK=true` (`✓ Compiled successfully`, `/[locale]/invitations/redeem` present in both route trees). The mock-mode build is the meaningful proof that no `server-only` module reaches the client bundle.

**AC-specific proofs:**

- *Token never in a query string/header:* `invitation-redeem.browser.repository.test.ts` asserts, for BOTH calls, that the requested URL contains no `?` and no token substring, that `Object.keys(headers)` is exactly `["Content-Type"]` on lookup, and that no header VALUE contains the token on redeem (where `X-Client-Id` is the fixed client id). This replaces the deleted real-axios `invitation-redeem.http.test.ts` at the new boundary.
- *No credentials:* asserted `credentials === "omit"` on the outbound init.
- *`finalizeRedeemAction` makes no IAM call:* two tests — a runtime one spying `globalThis.fetch` (never called) and a static one reading `actions.ts` and asserting it matches no `bootstrap/di`, `infrastructure/repositories`, `bootstrap/lib/http` or `UseCase`. The same static guard is applied to `page.tsx`.
- *Lookup fires client-side, not from a server prop:* `page.test.ts` asserts the returned element's `type` IS `InviteRedeemContainer` and that the RSC issues no fetch while rendering; the container stories drive the real `useQuery` through an injected repository.
- *Every VM state reachable in mock mode:* the failure markers (`expired`/`used`/`exists`/`limited`/`inactive`/`offline`) survive unchanged in the browser mock, and `loading` is now genuinely visible thanks to the injected 400ms mock latency.

**Deviations / decisions taken (flagged for adjudication):**

1. **`finalizeRedeemAction` prefers the access token's `tenantId` claim over the submitted `member.tenantId`** (falling back to `member.tenantId` when the claim is unreadable, which preserves the old behaviour for opaque tokens). The packet said "compute the redirect target exactly as the old `redeemAction` did". The reason for the delta: the old action derived that target from a response IT had just received from IAM, whereas both halves now arrive across the client boundary, so `member` is no longer server-attested. Using the claim off the very token that becomes the session means an incoherent payload can only land the visitor in a workspace their session actually authorizes. The role segment is deliberately left on `member.roles[0]` so the landing route is otherwise byte-identical to the pre-US-E18.59 behaviour. **This is an accepted-consequence area of ADR 0072 §Decision 3 that the ADR does not spell out; if `fe-lead` prefers strict packet parity, deleting the `decodeTenantId` line restores it.** Either way the broader consequence should probably be recorded as an ADR 0072 addendum: *the redeem response is now client-supplied when it reaches the server; Next's Server-Action origin check is the only thing standing between a cross-site caller and `setAuthCookies`, and no server-side re-verification is possible without reintroducing the IAM call the story removed.*
2. **`onRedeem` on `InviteRedeemScreen` became optional.** Needed so the RSC can render the blank-token `invalid` card without mounting the container (the literal "renders `invalid` directly, no fetch" instruction). The form path always supplies it; `submit()` early-returns if absent.
3. **`Retry-After` parsing is re-implemented locally** (3 lines over a `Headers` object) rather than exporting `api-envelope.ts#parseRetryAfter`, which takes a plain header bag and not a `Headers` instance. This is the option the packet explicitly allowed; no ADR amendment needed.
4. **The container exposes a `repository?` prop** as a story/test seam. The RSC never passes it, so production composition stays solely in `makeBrowserInvitationRedeemRepository()`. Without it the interaction stories could not drive the real `useQuery`/`useMutation` code path.
5. **The lookup query key contains the raw token** (`["invitation-lookup", token]`). It is client-memory only (same value already in the page URL); it is not logged and not sent anywhere. Noting it because React Query devtools would display it.

**Not done / follow-ups:**

- `docs/TEST_MATRIX.md` has **no US-E18.59 row** (the packet's own rule is that fe-lead adds it as `planned` before coding). It needs the row plus a correction to the US-E18.53 row, which still describes the RSC lookup + `redeemAction` and cites the four deleted test files.
- `docs/product/screens.md` line for the redeem screen was updated here with the browser-direct note + the new `loading` state (flagged for the design-review gate as a materially new visible state).
- The flow works against a real stack only once Kong is reloaded with BE's fixed `kong.yml` (deploy-order dependency, already recorded in the ADR and EPIC-OVERVIEW).

### A11y audit — fe-accessibility-auditor (2026-08-08)

**Verdict: PASS with 1 non-blocking (Major) finding.** Scope: the new `loading`
VM variant + its skeleton render (`invite-redeem-screen.tsx`), the container
driving the transition (`invite-redeem-container.tsx`), and a regression check
on the five pre-existing terminal states + the form (all via `InvitationNotice`,
untouched).

#### 1. Audit Summary

- Checked: contrast/tokens of the new skeleton, motion-safe gating, keyboard/
  focus during and across the loading transition, status-message announcement
  (WCAG 4.1.3), copy quality of the new loading string, and a diff-based
  regression check on the five terminal states + the form.
- Findings: 1 Major (status-message asymmetry on the success transition), 1
  Minor (copy could be marginally more reassuring for a first-time visitor).
  Zero Blocking/Critical.
- Overall: no regression to the already-audited (US-E18.53) terminal states or
  form — `git diff main...HEAD -- .../invite-redeem-screen.tsx` shows the only
  changes outside the new `loading` branch are the `onRedeem?` optionality
  guard and the `Skeleton` import; every terminal/form JSX branch is
  byte-identical.

#### 2. WCAG 2.1 AA Coverage

| Criterion | Description | PASS/FAIL | Finding ID |
| --- | --- | --- | --- |
| 1.4.3 Contrast (Minimum) | Skeleton uses `bg-accent` token, no raw color | PASS | — |
| 1.4.1 Use of Color | Loading conveyed via text + `aria-busy`, not color alone | PASS | — |
| 2.1.1 Keyboard | No focusable/tabbable element inside the skeleton | PASS | — |
| 2.1.2 No Keyboard Trap | N/A — nothing captures focus during loading | PASS | — |
| 2.2.2 Pause, Stop, Hide | `motion-safe:animate-pulse` (`Skeleton` primitive) — gated per `.claude/rules/accessibility.md` | PASS | — |
| 2.4.3 Focus Order | Diff-confirmed: form/terminal tab order unchanged | PASS | — |
| 4.1.2 Name, Role, Value | `role="status"` on loading region is correctly paired with content describing what's loading | PASS | — |
| 4.1.3 Status Messages | Failure transition (`loading → invalid/expired/rate-limited/tenant-inactive/error`) announces via `InvitationNotice`'s `role="alert"`; **success transition (`loading → form`) has no live region, so it is silent** | FAIL | A11Y-001 |
| 3.3.2 Labels or Instructions | Form fields unchanged, still correctly labelled (regression-checked, not in scope of new code) | PASS | — |

#### 3. Findings Catalogue

```
A11Y-001
Severity: Major (WCAG 4.1.3 Status Messages)
Component: src/features/auth/presentation/invite-redeem/invite-redeem-screen.tsx
            (the `vm.kind === "form"` branch, line ~298)
            src/features/auth/presentation/invite-redeem/invite-redeem-container.tsx
            (drives the loading→form transition)
Issue: When the browser lookup succeeds, the `loading` skeleton (which sits
  inside `role="status" aria-live="polite"`) unmounts and is replaced by the
  `form` branch, which has NO live region of its own. Removal of a live region
  is not announced by screen readers, and the newly-inserted heading/dl/form
  is a silent DOM insertion elsewhere on the page — a screen-reader user who
  is not actively re-reading that spot gets no signal that the invitation
  resolved. This is asymmetric with the FAILURE transitions
  (`loading → invalid/expired/rate-limited/tenant-inactive/error`), which DO
  announce correctly because `InvitationNotice` uses `role="alert"` (an
  implicit, always-announcing live region on insertion). For this screen's
  audience — a first-time, possibly non-technical invitee — the practical
  effect is: "the page did something after a pause, but nothing told me what."
Evidence:
  - `invite-redeem-screen.tsx:177-197` — loading branch: `role="status"
    aria-live="polite" aria-busy="true"` wrapping the skeleton + sr-only
    `{t("states.loading")}`.
  - `invite-redeem-screen.tsx:298-491` — form branch: plain `<div>`, `<h1>`,
    no `role`/`aria-live` anywhere in the subtree.
  - Contrast check confirmed via `invitation-notice.tsx:61` — `role="alert"`
    already present for every failure branch, so only the success path is
    missing coverage.
Fix: Add a single sr-only, `aria-live="polite"` announcement that fires once
  when the VM transitions into `form` (or `invalid`/`expired`/etc. — but those
  are already covered by `role="alert"`, so this only needs to cover `form`).
  Simplest implementation — a small `useEffect` keyed on `vm.kind` that sets a
  transient announcement string, rendered in a persistent live region at the
  top of the `<Card>` (outside the `vm.kind === "..."` branches so it survives
  the swap):
  ```tsx
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (vm.kind === "form") setAnnouncement(t("states.loaded"));
  }, [vm.kind, t]);
  // ...
  <Card className="p-8">
    <span className="sr-only" role="status" aria-live="polite">
      {announcement}
    </span>
    {vm.kind === "loading" && ( /* unchanged */ )}
    ...
  ```
  Add `invitations.redeem.states.loaded` to `messages/{vi,en}.json`, e.g.
  vi: `"Đã tải xong lời mời. Vui lòng điền thông tin bên dưới."` / en:
  `"Invitation loaded. Please fill in your details below."` — names what
  happened AND what to do next, matching the audience note in the story.
Reference: WCAG 2.1 §4.1.3 Status Messages
  (https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html);
  ARIA Authoring Practices §Live Regions.
```

```
A11Y-002
Severity: Minor (UX writing, no WCAG criterion — quality bar in this team's
  remit per `.claude/CLAUDE.md` §Agent Teams / a11y auditor scope)
Component: src/bootstrap/i18n/messages/{vi,en}.json →
  `invitations.redeem.states.loading`
Issue: Current copy ("Đang tải lời mời…" / "Loading invitation…") correctly
  names WHAT is loading (better than a bare "Đang tải…"), satisfying the
  audit's minimum bar. For this audience (a first-time, non-technical invitee
  who has never seen this product), a touch more reassurance costs nothing and
  reduces anxiety during the pause.
Evidence: `src/bootstrap/i18n/messages/vi.json` /
  `src/bootstrap/i18n/messages/en.json` → `invitations.redeem.states.loading`.
Fix (optional, non-blocking): vi: `"Đang kiểm tra lời mời của bạn…"` / en:
  `"Checking your invitation…"` — same length class, slightly warmer framing.
  Not required to close this story; note for `uiux-ux-writer` if a copy pass
  ever touches this screen.
Reference: `.claude/rules/i18n.md` (microcopy quality), general WCAG 3.3
  best-practice guidance (clear, task-oriented microcopy).
```

#### 4. Keyboard Navigation Map

| State | Tab order | Notes |
| --- | --- | --- |
| `loading` | (nothing focusable) | Skeleton has no interactive elements; a keyboard user who tabs during this window simply moves past the card to whatever follows (none, on this page) — no trap. |
| `form` | back-link (bottom) is the ONLY link before the fields in DOM order — actually: full name → password → confirm → submit button → "back to login" link, all in visual/reading order (unchanged from US-E18.53) | Regression-checked via diff; identical to pre-story. |
| `invalid`/`expired`/`rate-limited`/`tenant-inactive`/`error` | optional CTA (if any) → "back to login" link | Unchanged (`InvitationNotice`, untouched by this diff). |

#### 5. Screen Reader Script

**Before this story** (RSC render, no loading state existed): page loads with
the form (or a terminal notice) already resolved; SR hears the heading, then
the dl/labels/form fields in order, or the `role="alert"` notice.

**After this story:**
- *Happy path:* SR briefly hears "status: Đang tải lời mời…" (announced only
  if the DOM swap happens after AT has attached and the region already existed
  — true here since it's a post-hydration query transition), THEN — with
  A11Y-001 unfixed — **silence**, followed by whatever the SR user's virtual
  cursor happens to land on if they navigate forward (the resolved heading and
  form, un-announced). With A11Y-001's fix applied: "status: Đã tải xong lời
  mời. Vui lòng điền thông tin bên dưới." announces the resolution, then normal
  form navigation proceeds.
- *Failure path:* SR hears "status: Đang tải lời mời…", then — correctly,
  already — "alert: [terminal title], [terminal body]" when the swap lands on
  a `role="alert"` branch. No fix needed here.

#### 6. Quick Wins (< 30 min, sorted by severity)

1. **A11Y-001** (Major) — add the persistent sr-only `role="status"`
   announcement + `states.loaded` i18n key (~15 min: 1 `useState`/`useEffect`,
   2 JSON keys, 1 new story assertion).
2. **A11Y-002** (Minor) — swap the `states.loading` copy in both locale files
   (~2 min; optional/non-blocking).

No Blocking or Critical findings. Recommend fe-lead route A11Y-001 back to
`fe-nextjs-engineer` before closing the design-review gate (it is a real,
user-facing gap on a first-impression public screen, even though it does not
block merge on its own); A11Y-002 can be deferred to a future copy pass.

### Tech-lead review (2026-08-08) — REVISION REQUIRED

**1. Review Summary.** This moves the two PUBLIC, per-IP-rate-limited IAM calls
(`invitations/lookup`, `invitations/redeem`) out of the Next server and into the
browser, per ADR 0072, and keeps session issuance server-side behind a new,
deliberately narrow `finalizeRedeemAction`. The implementation is of a high
standard: the exception to the server-only HTTP rule is documented in the file
that takes it (not just in the ADR), the pure domain use-cases and the whole
failure-mapping path are reused **unchanged** via a hand-built `ApiError`
adapter, the deleted server path is genuinely gone (grep-clean), and the call
shape is regression-tested at exactly the properties that matter. Verdict is
Revision Required for three items, **none of which is a defect in the shipped
code**: one un-analysed protocol consequence of moving to the browser (CORS
preflight vs BE's `methods:[POST]`-only Kong carve-out) that will break this
flow at go-live if not confirmed, a `docs/TEST_MATRIX.md` gap that `tdd.md`
makes blocking for `implemented`, and one demonstrated hole in the
"no-IAM-call" guard.

**2. Architecture Compliance — PASS.** Layer directives are exactly right for
the exception being taken:

- `invitation-redeem.browser.repository.ts:1-23` and
  `mocks/invitation-redeem.browser-mock.repository.ts:1-17` each carry a header
  comment stating the *absence* of `server-only` is intentional and pointing at
  ADR 0072 — this is the requested "a grep for infra-without-server-only lands
  on an intentional exception" property, satisfied per-file, not merely implied.
- `make-browser-invitation-redeem-repository.ts` is correctly OUTSIDE
  `bootstrap/di/` and reads `process.env.NEXT_PUBLIC_USE_MOCK` directly rather
  than importing `bootstrap/lib/mock.ts` (verified `server-only` at
  `src/bootstrap/lib/mock.ts:1`).
- `page.tsx` is a thin RSC importing only presentation + `./actions`; the
  blank-token short-circuit is structural (the container is never mounted),
  which is stronger than a flag inside the container.
- `bootstrap/di/invitation-redeem.di.ts`, both server repositories and their
  tests are deleted, and the `export *` line is gone from `bootstrap/di/index.ts`.
  Independently grep-confirmed: zero remaining references to
  `invitation-redeem.di`, `InvitationRedeemRepository` (non-Browser) or
  `MockInvitationRedeemRepository` anywhere in `src/`.
- Component placement: nothing new under `components/`; the only primitive used
  is the existing `components/ui/skeleton`. No duplication introduced.

**3. Code Quality — Excellent.** Strict types throughout, no `any` outside test
transport stubs (each `biome-ignore`d with a reason), no unexplained `!`.
`postJson` correctly treats a 2xx `success:false` envelope as a failure
(`invitation-redeem.browser.repository.ts:122`) and degrades an unparseable
gateway body instead of crashing (`:119`). `invite-redeem-flow.ts` extracting
the state derivation + submit orchestration as pure functions is the right call
in a `node`-environment test setup and keeps the container a thin binding.
`invite-redeem-container.tsx:56-66` disabling retry everywhere, with the reason
(a retry storm manufactures the 429 it is trying to survive), is exactly the
kind of judgment this lane needs.

**4. Data & Contract Review — PASS.**

- Payload consumed directly (`envelope.data`), never a `.data` re-read on the
  repository side; failures branch on `error.code`/status via the untouched
  `mapInvitationRedeemFailure`, never on `message`.
- `retryAfterFrom` (`:55-60`) restates `parseRetryAfter`'s delta-seconds-only
  rule for a `Headers` object — the option the packet explicitly permitted;
  non-numeric (HTTP-date) is ignored rather than guessed, and tested (`:218`).
- No pagination surface here; no `{raw:true}` needed.
- `credentials: "omit"` on both calls (`:103`), asserted in test (`:126`).
- Mock/real parity empirically verified, not just reasoned: I grepped the
  existing `.next/static/chunks` build output — **no** `AxiosHeaders` in any
  client chunk (so exporting `API_URL` from `http.ts` did not drag axios into
  the browser bundle; only the constant survives tree-shaking) and **no** mock
  fixture string (`lan.pham@nguyendu.edu.vn`) in any client chunk, i.e. the
  `NEXT_PUBLIC_USE_MOCK` branch was dead-code-eliminated in the real build. The
  build-time-inlining reasoning holds. This is the first client-side
  `NEXT_PUBLIC_*` gate in `src/` (every other `USE_MOCK` read is a server DI
  factory) — worth knowing, correctly relied upon.

**5. Design System & i18n — PASS.** No raw color anywhere in the diff (scanned
the whole `src/` hunk set for `#hex`/`bg-[#`/`text-gray-`/`slate-`/`zinc-`:
none). The skeleton uses the existing `Skeleton` primitive plus `border-border`.
One key added, `invitations.redeem.states.loading`, at the identical path and
position in both `vi.json` and `en.json` — parity clean; translated at
presentation only; the actions/use-cases still return stable failure keys.

**6. Security Review — PASS (with one deploy-time verification required, see
[MUST FIX] R-1).**

- *Token discipline:* both `fetch` calls build the URL as
  `` `${API_URL}${path}` `` with no query construction anywhere; the token is a
  body field only. Tested at both endpoints, both directions: URL contains no
  `?` and no token substring; on lookup `Object.keys(headers)` is asserted to be
  exactly `["Content-Type"]`; on redeem no header *value* contains the token and
  `X-Client-Id` is asserted equal to the fixed `OAUTH_CLIENT_ID`
  (`invitation-redeem.browser.repository.test.ts:129-138`, `:182-189`). The
  redeem body is field-listed, never `...command`, with a test that a future
  field cannot leak (`:167`).
- *`finalizeRedeemAction` narrowness:* the whole function body is
  `setAuthCookies` → locale → role/tenant segment → `redirect`. No DI import, no
  repository import, no use-case, no HTTP. I did not take the test's word for it
  — I mutated `actions.ts` locally to insert `await fetch(...)` before
  `setAuthCookies` and re-ran the suite: **9 of 10 tests failed**, the runtime
  `globalThis.fetch` spy included. Guard is real. See R-3 for the one bypass it
  does not catch.
- *No caller-controlled redirect:* no `next`/`returnTo` is accepted; the path is
  always assembled through `tenantUrl` with a locale prefix, and there is a test
  proving a hostile `tenantId` cannot produce an absolute URL (`:157-164`).
- *Local QueryClient / no session leakage:* the `QueryClient` is created inside
  `InviteRedeemContainer` via `useState(() => new QueryClient())` and provided
  only to its own subtree; `git diff main...HEAD -- 'src/app/**/layout.tsx'
  'src/bootstrap/lib/react-query-provider.tsx'` is **empty** — the shared
  root/`(app)` provider is untouched, as required. The lookup query key holds
  the raw token, which is the same value already visible in the page URL, held
  in tab memory only, never persisted and never logged (no persister, no
  devtools mounted on this route). Acceptable; noted as [CONSIDER] R-4 for the
  mutation-variables analogue.
- *Accept-flow:* `git diff main...HEAD -- '**/invitations/accept/**'` is
  **empty**. Zero regression, confirmed.

**7. Test Coverage — PASS.** TDD proof is meaningful, not ceremonial: the
browser repository test covers call shape, credential omission, token
non-leakage, the full status/code→failure matrix, `Retry-After` (numeric and
date), a 2xx-`success:false` envelope, a rejected fetch and an HTML 502; the
mock repository test covers markers/replay/`btoa` minting; `invite-redeem-flow`
covers every VM branch; `actions.test.ts` covers ordering, role normalisation
and the new tenant-claim precedence; 12 container interaction stories drive the
real `useQuery`/`useMutation` through an injected repository, including
`LookupLoading` and `BlankTokenNeverCalls`. Only gap is documentation, not
coverage — R-2.

**Commands I ran on this branch (output observed):**

| Command | Result |
| --- | --- |
| `bun vitest run` (redeem route + auth repositories + invite-redeem presentation) | 9 files / **137 tests passed** |
| `bun run vitest:storybook run src/features/auth/presentation/invite-redeem` | 2 files / **29 tests passed** |
| `bunx tsc --noEmit` | clean (exit 0) |
| `bun lint` | 0 errors; 1 warning + 1 info, both in `message-context-menu.tsx` (pre-existing, untouched by this branch) |
| mutation probe A — inserted `await fetch(...)` into `finalizeRedeemAction`, re-ran `actions.test.ts` | **9 failed / 1 passed** → guard verified, file restored |
| mutation probe B — inserted `import axios` + `axios.post(...)` into `finalizeRedeemAction`, re-ran `actions.test.ts` | **10 passed** → guard bypassable, see R-3; file restored |
| grep of existing `.next/static/chunks` | no `AxiosHeaders`, no mock fixture string → real-mode client bundle is clean |

(I did not re-run the full 4110-test suite or `bun run build`; the pre-push gate
covers both and the engineer's run is consistent with everything I did observe.)

**On the `decodeTenantId` deviation — ACCEPTABLE AS DOCUMENTED, no change
required.** I judged this independently of the addendum's framing:

- `decodeTenantId` (`src/bootstrap/lib/jwt.ts`) is a **pure decode** — split on
  `.`, base64url-decode the payload, read `tenantId`. There is **no signature
  verification** anywhere in that module (its own header comment says so:
  "signature verification is BE's job").
- That is nonetheless fine *here*, and the addendum's reasoning holds, for the
  reason the reviewer prompt anticipates: the same `tokens.accessToken` is
  written verbatim into the httpOnly session cookie one line earlier and is the
  bearer for every subsequent call. A forged/incoherent token is already fully
  determinative of what the session can do; reading a claim off it adds **zero**
  new trust. The risk surface is unchanged by this choice — only the coherence
  of the *redirect target* changes, and it changes in the safer direction: the
  visitor can only land in the workspace the session they just received actually
  authorizes, instead of one named by a separately-transmitted `member` object
  that no longer has server attestation. A mismatch lands them somewhere the
  route guards will bounce them out of anyway; this avoids that confusing state.
- Fallback to `member.tenantId` when the claim is unreadable preserves the exact
  pre-US-E18.59 behaviour for opaque tokens — tested (`actions.test.ts:149`).
- Role-segment logic is **byte-identical** to the deleted `redeemAction`:
  `member.roles[0] ?? ""` → `appRoleOf(roleEnum) ?? roleEnum.toLowerCase()` →
  `tenantUrl(..., appRole ? "/"+appRole : "/")`. Diffed against
  `git show main:…/actions.ts`; only the `tenantId` line differs. The ENUM
  matrix, the unknown-role lowercase fallback and the empty-`roles[]` tenant-root
  case are all covered (`:104-130`).

So: stricter than the packet text, not weaker; correctly recorded in the ADR
addendum; no rework.

**Design-review recommendation — a SHORT `/impeccable` pass IS warranted, not a
skip.** Reasoning both ways, stated as asked: the skeleton is built purely from
the existing `Skeleton` primitive with token-only classes and deliberately
mirrors the resolved card's rhythm (icon block → title → subtitle → detail box →
CTA) so the layout does not jump — by the letter of the gate that is
"reuses existing patterns closely enough". But this is (a) genuinely NEW visible
UI, (b) on a PUBLIC, unauthenticated, first-impression screen for a brand-new
user, (c) whose duration is now a real network round-trip through Kong rather
than 400ms of mock latency, and (d) it already has one open Major a11y finding
(A11Y-001) in the same state. Those four together make it worth ~10 minutes of
`/impeccable audit` on the `loading` story specifically — skeleton proportions
vs the resolved card, and whether the empty detail-box outline reads as an error
at first glance. A full `critique`/`polish` of the whole screen is not needed;
the resolved/failure states are unchanged from the already-gated US-E18.53 pass.

#### Required changes

- **[MUST FIX] R-1 — CORS preflight vs BE's `methods:[POST]`-only Kong route.**
  `invitation-redeem.browser.repository.ts:98-106`. Moving to the browser makes
  these **cross-origin** requests, and both carry
  `Content-Type: application/json` (not a CORS-safelisted value), so **both will
  emit an `OPTIONS` preflight** — and redeem additionally sends `X-Client-Id`,
  which must appear in `Access-Control-Allow-Headers`. BE's response §5.1 only
  confirms "methods có POST, headers có `Content-Type`", and §5.2's fix is
  explicitly an *anchored regex + `methods:[POST]`* carve-out whose own
  verification table shows a non-POST verb on the same path returning **401 at
  the edge** (`GET /iam/api/v1/invitations/lookup → 401`). If the preflight
  `OPTIONS` does not match the public route (or the CORS plugin is route-scoped
  rather than service/global-scoped), every visitor's browser will block both
  calls and the screen will show the generic `network-error` card — a silent
  100% go-live failure of the flow this story exists to fix, which the old
  server-side path could not have exhibited. This is not an FE code defect and I
  am not asking for a code change: **`fe-lead` must (a) raise a BE ask
  confirming `OPTIONS` on both paths is served with `Access-Control-Allow-Origin`,
  `Allow-Methods: POST` and `Allow-Headers: Content-Type, X-Client-Id`, and
  (b) record the preflight dependency in ADR 0072 §Consequences next to the
  existing Kong-reload deploy-order note** so it is verified during the same
  reload rather than discovered by invitees. (Contingency if BE cannot allow the
  header: `X-Client-Id` is audit metadata only — dropping it from the browser
  call is a one-line change, but that is BE's call, not a unilateral FE one.)
- **[MUST FIX] R-2 — `docs/TEST_MATRIX.md` is stale and has no row for this
  story.** `.claude/rules/tdd.md` forbids marking a story `implemented` without
  a matrix row, and the existing **US-E18.53 row (line 22)** now describes a
  flow that no longer exists ("RSC calls `POST /invitations/lookup`",
  `setAuthCookies` inside the redeem action) and cites **four deleted test
  files** (`invitation-redeem.mock.repository.test.ts`,
  `invitation-redeem.di.test.ts`, `invitation-redeem.http.test.ts`,
  `invitation-redeem.repository.test.ts`). Add the US-E18.59 row and amend the
  US-E18.53 row to point at the surviving proof
  (`invitation-redeem.browser.repository.test.ts` replaces the `http` test at
  the new boundary). The engineer flagged this himself; it is `fe-lead`'s
  packet-hygiene action, but it blocks `--status implemented`.
- **[SHOULD FIX] R-3 — the "no IAM call" static guard has a demonstrated
  bypass.** `actions.test.ts:67-76` matches four import-path patterns and the
  runtime spy watches `globalThis.fetch`. Axios does **not** use `fetch` in
  node, and `import axios from "axios"` matches none of the four patterns — I
  verified by mutation: adding a real `axios.post(...)` call to
  `finalizeRedeemAction` leaves the file **10/10 green**. Given this guard is
  the story's stated primary invariant, tighten it from a denylist to an
  **exact-match allowlist of import specifiers** (parse the `import … from "x"`
  specifiers out of the source and `expect(specifiers).toEqual([...])` with the
  six current ones), the way the exact-match guards elsewhere in this batch
  work. ~10 lines, no production change.
- **[CONSIDER] R-4 — mutation variables retain the plaintext password in the
  query cache.** `invite-redeem-container.tsx:104-110`: TanStack keeps
  `mutation.variables` (which include `password`) in the mutation cache for the
  default `gcTime` after settling. On the success path the redirect tears the
  client down; on a failure path (e.g. `account-exists`) it lingers in tab
  memory. This is **not** an incremental exposure — `InviteRedeemScreen` already
  holds the password in React state for the same lifetime, nothing is persisted,
  and no devtools are mounted on this route — so I am not requiring a change.
  If you want belt-and-braces, `gcTime: 0` on the mutation defaults costs
  nothing here (there is no reuse of the mutation result).
- **[CONSIDER] R-5 — ADR 0072 §Follow-Up trigger is correctly not pulled
  forward.** Confirming for the record: I checked that no other route copies
  this pattern (only `invitation-redeem.browser.repository.ts` imports
  `@/bootstrap/lib/http`'s `API_URL` outside its own test), so the ADR's "second
  consumer promotes it to `bootstrap/lib/http.browser.ts`" clause has not been
  triggered and should stay deferred.

#### Final decision

**REVISION REQUIRED** — for R-1 (BE ask + ADR deploy note; a go-live-blocking
protocol consequence of the browser move that no artifact yet covers) and R-2
(TEST_MATRIX rows, blocking per `tdd.md`), plus R-3 as a strongly-recommended
test hardening. **No change is required to the shipped production code**, and
the `decodeTenantId` choice is explicitly accepted as documented in the ADR
addendum. Once R-1's answer is in hand and R-2/R-3 land, this is an approve —
the implementation itself is the strongest work in this batch.

### fe-nextjs-engineer — fix round (2026-08-08)

Scope: exactly two items — **R-3** (tech-lead, SHOULD FIX) and **A11Y-001**
(a11y auditor, Major). R-1 (BE ask + ADR preflight note) and R-2 (TEST_MATRIX)
are `fe-lead`'s; R-4/R-5 (CONSIDER) deliberately not taken; the `decodeTenantId`
trust-boundary choice was left untouched, as accepted by the reviewer.

**R-3 — the no-IAM-call guard is now an exact-match import ALLOWLIST.**
`actions.test.ts` keeps both existing guards (the runtime `globalThis.fetch` spy
and the four denylist patterns) and adds a third: `importSpecifiersOf()` parses
every module specifier out of `actions.ts` — static `from "x"` (value or type),
bare `import "x"`, dynamic `import("x")` and `require("x")` — sorts/dedupes them
and asserts `toEqual` against the eight current specifiers. Any new import, HTTP
client or not, now fails until someone edits the allowlist, which is the moment
to re-ask whether the action still calls zero IAM endpoints.

Mutation proof (same probe the reviewer ran, re-run before/after):

| Probe on `finalizeRedeemAction` | Old guard (reviewer) | New guard (this branch) |
| --- | --- | --- |
| `import axios` + `await axios.post(...)` | **10 passed** (bypass) | **9 failed / 2 passed** — allowlist test among the failures |
| `import axios` + `try { await axios.post(...) } catch {}` (silent variant — isolates the guard from the runtime crash) | n/a | **1 failed / 10 passed** — the allowlist test is the ONLY thing that catches it; the 10 pre-existing tests, including the fetch spy and the denylist, all still pass |

The silent variant is the exact hole the reviewer demonstrated: under the old
guard it was 10/10 green. `actions.ts` was restored byte-identical after each
probe (`git diff` clean) and the file is 11/11 green.

**A11Y-001 — the `loading → form` transition now announces.**
`invite-redeem-screen.tsx` gained a persistent, initially-empty sr-only
`role="status" aria-live="polite"` span rendered OUTSIDE the `vm.kind` branch
switch (top of the `<Card>`), populated by a `useEffect` keyed on
`vm.kind === "form"` with the new `invitations.redeem.states.loaded` key. It is
never re-mounted, so the resolution is a text change inside a region the AT is
already observing — the shape screen readers reliably announce (inserting a
region together with its text is not). The failure branches are untouched:
`InvitationNotice`'s `role="alert"` still carries them, and the new region stays
empty on those paths (asserted). The loading skeleton's own `role="status"`
region is unchanged, so two status regions coexist while pending (one busy, one
silent) — the stories select the busy one explicitly.

i18n (vi source + en mirror, added together):
`invitations.redeem.states.loaded` = "Đã tải xong lời mời. Vui lòng điền thông
tin bên dưới." / "Invitation loaded. Please fill in your details below." — the
auditor's suggested key name and copy verbatim. Key-path parity verified
programmatically: 3623 keys in each file, identical sorted path sets.
A11Y-002 (Minor, `states.loading` copy warmth) deliberately NOT taken — the
auditor marked it optional and deferred it to a future copy pass.

New/changed proof (red observed before each fix, green after):

- `invite-redeem-screen.stories.tsx` → new `LoadedAnnouncesToScreenReaders`: a
  render harness that flips `vm` `loading → form` after mount and asserts the
  live region (a) exists, is `sr-only`, `role="status"`, `aria-live="polite"`
  and EMPTY before resolution, (b) is the SAME node afterwards (`toBe`), and
  (c) then carries the loaded copy. `LookupLoading` updated for the two status
  regions + asserts the announcement is still silent while pending.
- `invite-redeem-container.stories.tsx` → `LookupResolvesToForm` now drives the
  same assertion through the REAL `useQuery` transition (not a hand-set VM), and
  new `LookupFailureAnnouncesOnlyTheAlert` proves a terminal lookup failure
  raises the `role="alert"` and leaves the success region empty (no false
  "invitation loaded" claim).

**Proof commands (run on this branch, output observed):**

| Command | Result |
| --- | --- |
| `bun vitest run` | 518 files / **4111 tests passed**, 0 failed (was 4110 — +1 allowlist test; zero regression) |
| `bun run vitest:storybook run src/features/auth/presentation/invite-redeem` | 2 files / **31 tests passed** (was 29; +2 new stories) |
| red run of the same, before the screen change | **5 failed** / 26 passed |
| mutation probes on `actions.ts` | table above; file restored, `git diff` clean |
| `bunx tsc --noEmit` | clean (exit 0) |
| `bun lint` | 0 errors; 1 warning + 1 info, both pre-existing in `message-context-menu.tsx` |
| `bun run build` | success; `NEXT_PUBLIC_USE_MOCK=true bun run build` → `✓ Compiled successfully`, `/[locale]/invitations/redeem` present in both |

Still open for `fe-lead` (unchanged by this round): R-1 (BE ask on the CORS
preflight for `OPTIONS` on both public paths + ADR 0072 §Consequences note) and
R-2 (`docs/TEST_MATRIX.md` — add the US-E18.59 row, amend the stale US-E18.53
row). The design-review gate's short `/impeccable audit` on the `loading` story
is also still outstanding.
