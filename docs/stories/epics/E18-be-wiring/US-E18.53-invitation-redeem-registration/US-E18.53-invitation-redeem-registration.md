# US-E18.53 Self-serve registration via invitation redeem (BE US-191, ADR 0130/0131)

## Status

in-progress → implemented (pending review gates)

## Lane

high-risk

> Hard-gate flags: NEW public unauthenticated auth flow (account creation),
> cookie/session issuance, redirect-target validation, rate-limit/abuse
> surface, token handling (must never touch a query string). This AMENDS
> ADR 0059's "no guest account-creation" conclusion — register a new ADR
> amendment, don't silently contradict 0059.

## Dependencies

- Depends on: none (independent of E18.50-52; shares `src/features/auth/` with nothing else in this batch)
- Blocks: none
- Feature module(s) chạm: `src/features/auth/` (new invitation-redeem slice), `src/app/[locale]/(auth)/` (new public route)
- Shared contract/file: `bootstrap/lib/auth-token.server.ts`'s `setAuthCookies` (reuse, don't fork)

## Ground truth (fe-lead, verified against local `edu-api` checkout, US-191, ADR 0130/0131)

`edu-api/services/iam/docs/openapi.yaml`:

- **`POST /api/v1/invitations/redeem`** (public, no auth) — creates an account
  AND an ACTIVE membership in one request, returns a TENANT-SCOPED session
  (no separate sign-in needed). Body: `{token, password, fullName}` —
  **deliberately NO `email` field** (email comes from the invitation,
  resolved server-side — a token holder can never redirect the invite to an
  address they control). Password policy identical to
  `POST /api/v1/auth/register` (reuse existing client-side validation rules
  if this repo already has them for the register flow — check
  `src/features/auth/domain/use-cases/` for a password-validation use-case
  before writing a new one).
  - **409 `INVITATION_ACCOUNT_EXISTS`** — the invited email already has an
    account. Nothing is written; the password is NEVER applied to an
    existing account. On this error, route the user to the EXISTING sign-in
    + `invitations/accept` flow (`(auth)/invitations/accept?token=...`,
    already built in US-E21.2) — don't build a parallel "existing account"
    UI, redirect into the flow that already handles it.
  - **410 (Gone)** — token expired, already used, OR replayed (a SECOND
    redeem attempt with an already-consumed token is ALSO 410, not 409 —
    confirm this distinction in your error mapping, it's easy to
    misclassify a replay as a conflict).
  - **422** — validation (password policy, fullName length, etc).
  - **429** — rate-limited, shared budget with `lookup` (10/min per client
    IP — this is enforced server-side, FE just needs to map 429 → a clear
    "try again in a minute" message, no client-side rate-limit UI needed).
  - Optional header `X-Client-Id` (≤128 chars, audit metadata only) — send it
    if this repo already has an established client-id convention for other
    auth calls; if not, it's fine to omit (optional field, not required for
    AC).
  - Response (`RedeemInvitationResponse`): `{member: MemberResponse, tokens:
    TokenResponse}` — same `TokenResponse` shape login/signin already
    produces. **Set cookies via the EXISTING `setAuthCookies()` helper**
    (`bootstrap/lib/auth-token.server.ts`) — do not write a parallel
    cookie-setting path.
- **`POST /api/v1/invitations/lookup`** (public, no auth) — PREVIEW only, so
  the redemption FORM can say "Join `<tenantName>` as `<roles>` — you'll sign
  in as `<email>`" instead of a blind password form. Body: `{token}` ONLY.
  Response (`LookupInvitationResponse`): `{email, tenantName, roles[],
  expiresAt}` — deliberately minimal (no `invitedBy`, no invitation id, no
  other-members data — data minimization for an unauthenticated caller).
  Same 410/422/429 error surface as redeem (shares its rate-limit budget).
- **⚠️ Token handling — the single most important constraint**: the token
  goes in the POST BODY for BOTH `lookup` and `redeem` API calls, **NEVER as
  a query string parameter to the BE**. The FRONTEND ROUTE URL (the emailed
  invite link) legitimately carries the token as a route/query param — that
  part is unavoidable and matches the EXISTING `invitations/accept?token=`
  precedent — the constraint is specifically about the API CALL, not the
  page URL. Do not "fix" the page URL to hide the token; that's not the
  concern here.

## Current state (read before designing anything)

- `src/app/[locale]/(auth)/invitations/accept/` — the EXISTING signed-in
  accept flow (US-E21.2, ADR 0059). `actions.ts`'s `joinAction()` is the
  closest structural precedent: gets a tenant-scoped session back
  (`switchTenant`'s tokens), calls `setAuthCookies(tokens)`, then
  `redirect()`s to `tenantUrl(tenantId, role)` with the locale prefix — mirror
  this pattern for the NEW redeem action (same shape: mint session → set
  cookies → redirect, no intermediate success screen, `redirect()`'s typed
  `never` return so the action can also return an error-key object on the
  failure path).
- **ADR 0059** concluded "no guest account-creation — signed-in join only,
  because BE lacked the capability". BE US-191 REVERSES that premise. This
  story must register an ADR AMENDING 0059 (not a fresh unrelated ADR) —
  fe-lead will register it once the engineer's implementation is done and
  the exact new flow is known; the engineer should flag in Evidence exactly
  what changed vs. 0059's stated model.
- `docs/product/design-spec.jsonc`/`screens.md` note the `invitations.jsx`
  `InviteAcceptScreen` mockup is "stale for content/states, kept for
  shell/tone only" — per the coordinator, use it as a VISUAL reference
  (spacing/tone/shell) but build the actual flow/states/copy against the
  REAL contract above, not the stale mockup's content.
- Check `src/features/auth/domain/use-cases/` for an existing
  password-validation rule (register flow) to reuse for the redeem form's
  client-side validation, rather than re-deriving the policy.

## Scope

1. New domain use-case(s): `LookupInvitationUseCase` (preview) and
   `RedeemInvitationUseCase` (create account + session), each with their own
   failure union (410/409/422/429 mapped distinctly — do not collapse a
   replay-410 into a conflict-409, they mean different things to the user:
   "this link is dead, ask for a new one" vs "you already have an account,
   sign in instead").
2. New public route, e.g. `(auth)/invitations/redeem` (pick a name consistent
   with the existing `(auth)/invitations/accept` sibling — do not nest under
   an authenticated layout). Two-step UI: (a) on load, call `lookup` with the
   URL's `?token=` to render the preview ("Join `<tenantName>` as `<roles>`");
   (b) a form collecting `password`+`fullName` (NO email field — the preview
   step already showed the resolved email, read-only display only) that
   calls `redeem`.
3. On `redeem` success: `setAuthCookies(tokens)` then `redirect()` to the
   appropriate tenant/role landing — mirror `joinAction`'s exact pattern
   (check `tenantUrl`/landing-path helpers already used there).
4. On `409 INVITATION_ACCOUNT_EXISTS`: redirect (or offer a clear link) to
   `(auth)/invitations/accept?token=...` (existing signed-in flow) rather
   than rendering a dead-end error — the user needs a path forward.
5. On `410`: clear "this invitation link is no longer valid, ask an admin to
   resend" copy — do not imply retrying the SAME token will ever work.
6. On `429`: clear "too many attempts, try again shortly" copy, no client
   rate-limit countdown UI required (BE doesn't return a `Retry-After` per
   the ground truth above — confirm, don't assume one exists).
7. Reuse the existing register-flow password policy validation (client-side,
   defense-in-depth; BE 422s as the backstop).
8. Redirect-target validation: since this flow ends in a `redirect()`, make
   sure the target is ALWAYS server-derived (`tenantId`/role from the
   RESPONSE, never from any client-supplied value) — same discipline
   `joinAction` already follows, copy it exactly, don't relax it.
9. i18n: new copy keys (preview line, form labels, all 4 error states) in
   `messages/{vi,en}.json`.

## NOT in scope

- The EXISTING `(auth)/invitations/accept` signed-in flow — untouched,
  only linked TO from the new 409 path.
- `admin/invitations` (admin-side invite management) — untouched.
- Building a parallel password-policy — reuse the existing one.

## Acceptance Criteria

- A visitor with a valid invitation link can preview the invitation (tenant
  name, roles, resolved email) without authenticating.
- The same visitor can set a password + name and land inside the tenant
  workspace with NO additional sign-in step.
- An expired/used/replayed token shows a clear "link no longer valid"
  state — never a generic error, never implies retry will help.
- An email that already has an account routes cleanly to the existing
  sign-in + accept flow, no dead end.
- Rate-limited attempts show a clear, non-alarming "try again shortly"
  message.
- Token never appears in any outbound API call's query string (verify via
  a test asserting the exact axios call shape, not just "it works").
- Redirect target after success is always server-derived.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | use-case tests (both flows, all failure branches distinct), repository test (exact POST body shape, header if used, no query-string token) |
| Integration | real interceptor pipeline test |
| E2E | Storybook interaction + a full Playwright/Server-Action-level test of the redirect chain (this is an auth flow — the design-review + a11y + security review must all explicitly verify the cookie/redirect handling, not just UI) |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | high-risk lane — design-review gate + a11y audit + tech-lead review with EXPLICIT security focus (cookie scope, redirect validation, token-never-in-query, rate-limit copy) all required before merge |

## Harness Delta

- TEST_MATRIX row for invitation-redeem flow.
- Close ask #31 in the FE→BE report.
- EPIC-OVERVIEW.md Wave 8 row.
- ADR amending 0059 (fe-lead registers this after implementation, citing the exact reversal).

## Evidence

### New route path

`src/app/[locale]/(auth)/invitations/redeem/page.tsx` → **`/{locale}/invitations/redeem?token=...`**
(e.g. `/vi/invitations/redeem?token=<invite-token>`). Public: it sits in the same
`(auth)` group as its `invitations/accept` sibling, which has no layout and no
`RequireAuth` gate; `src/proxy.ts` only enforces tenant scope on `/t/{tenantId}`
paths, so nothing gates this route.

### Redirect chain (success)

```
GET  /vi/invitations/redeem?token=T          (RSC)
  └─ POST /iam/api/v1/invitations/lookup     body {token:T}         → preview
submit
  └─ redeemAction(T, password, fullName)     ('use server')
       └─ POST /iam/api/v1/invitations/redeem body {token,password,fullName}
            header X-Client-Id: <OAUTH_CLIENT_ID>                    → 201 {member, tokens}
       └─ setAuthCookies(tokens)             (shared helper, httpOnly)
       └─ redirect(`/${locale}${tenantUrl(member.tenantId, '/'+appRole)}`)
            e.g. /vi/t/t-9/teacher
```

No `switchTenant` round-trip (BE already returns a tenant-scoped session) and no
sign-in step. Proof: `actions.test.ts`
- `"passes {token,password,fullName} through, persists the RESPONSE's tokens, then lands in the tenant workspace — no second sign-in step"`
- `"cookies are set BEFORE the redirect — landing in a guarded route without a session would bounce to /select-tenant"` (asserts the literal order `["cookies","redirect"]`)
- `"the redirect target comes ONLY from the response — a caller-crafted token/name cannot steer it"` (a caller passing `https://evil.example.com/?next=/vi/t/t-attacker/principal` as the token and `../../t/t-attacker` as the name still lands on `/vi/t/t-server/teacher`)
- role-enum normalisation (`ADMIN|MANAGER→principal`, `STAFF→teacher`, unknown → lowercase), empty `roles[]` → tenant root.

The action accepts **no** `next`/`returnTo`/`callbackUrl` parameter at all, so
there is no client-supplied redirect target to validate.

### Token never in a query string — confirmed

Two independent proofs:

1. `invitation-redeem.repository.test.ts` →
   **`"neither call passes `params`, and neither endpoint constant contains a '?'"`**
   (also asserts the URL never contains the token value).
2. `invitation-redeem.http.test.ts` (real axios pipeline, only the transport
   adapter stubbed) →
   **`"sends token+password+fullName in the body, the client id as a header, and NOTHING in the query string"`**
   — inspects the fully-resolved config and the serialised URL axios would fetch:
   `expect(url).toBe("http://localhost:8000/iam/api/v1/invitations/redeem")`,
   `expect(url).not.toContain(TOKEN)`, `expect(config.params).toBeUndefined()`,
   `JSON.parse(config.data)` equals exactly `{token,password,fullName}`.
   The lookup counterpart asserts the same for `{token}`.
   Plus `"no Authorization header is attached — this is a PUBLIC endpoint…"`.

The `?token=` on the FRONTEND route URL is unchanged and intentional (the
emailed link's shape, matching `invitations/accept?token=`).

### What changed vs. ADR 0059 (for the amending ADR fe-lead will register)

| ADR 0059 said | Now (BE US-191 / ADR 0130/0131) |
| --- | --- |
| "No guest account-creation — BE has no endpoint for it." | `POST /invitations/redeem` creates the account **and** the ACTIVE membership in one public call. |
| "Signed-in join only: the invitee must already have an account and sign in first." | Still true for `invitations/accept`; the NEW `invitations/redeem` route serves invitees with **no** account. Both coexist; the 409 path hands off from redeem → accept. |
| "No preview endpoint exists, so the accept screen must be blind." | `POST /invitations/lookup` gives a 4-field preview (email/tenantName/roles/expiresAt), so the redeem form is not blind. The accept screen was NOT changed. |
| Accept mints its session via a follow-up `switchTenant`. | Redeem gets the tenant-scoped session in the redemption response — no `switchTenant`. |
| Rule kept unchanged: role/tenantId/email are NEVER client-supplied. | Kept, and strengthened: the redeem body has no `email` field at all (ADR 0131 D5). |

### Ground-truth corrections found while implementing (flagged to fe-lead)

1. **Wire error codes are UPPER_SNAKE, not lowercase.** `pkg/kit/response.WriteError`'s
   `codeFromKey()` does `strings.ToUpper(key)` (present since the Epic-0 commit
   `fc7dfbf4`), so IAM emits `INVITATION_INVALID`, `RATE_LIMIT_EXCEEDED`, …
   The sibling `iam-member.repository.ts` mapper (US-E18.6) matches the
   **lowercase** Go i18n key and its tests assert lowercase — if the real wire is
   UPPER_SNAKE, every invitation-accept failure there silently falls through to
   `unknown`. **Not fixed here** (other story's code, and a live-BE check should
   settle it). This story's mapper accepts either casing *and* falls back to the
   HTTP status.
2. **429 DOES carry `Retry-After`** (`pkg/http/middleware/ratelimit.go` sets it to
   the window in seconds) — the packet said to confirm rather than assume. The
   failure carries `retryAfterSeconds`, but the copy stays wait-less ("try again
   shortly") per the packet's "no countdown UI required".
3. **The password policy answers 400 `USER_WEAK_PASSWORD`, not 422**
   (`user_errors.go` → `apperror.New(http.StatusBadRequest, …)`); 422
   `VALIDATION_FAILED` is only the request-tag layer (required / min=8 / max=128).
   Both are mapped, with distinct copy.

### Proof commands (run in this worktree)

| Command | Result |
| --- | --- |
| `bun vitest run` | **507 files / 3960 tests pass** (measured baseline on this branch BEFORE the story: 498 / 3850 → +9 files, +110 tests). Green on 3 isolated runs. |
| `bunx vitest run --config vitest.storybook.mts` | **159 files / 1255 tests pass** (includes the 2 new story files; the pre-existing `invite-accept-screen` stories pass unchanged after the `InvitationNotice` promotion). |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (1 warning + 1 info, both pre-existing in `messaging/message-context-menu.tsx`) |
| `bun run build` | green in BOTH modes — default (mock) and `NEXT_PUBLIC_USE_MOCK=false`; the route appears as `ƒ /[locale]/invitations/redeem` (dynamic, server-rendered). |

> Flake note (honest): two intermediate runs reported 1 failing test, and one
> reported 22 files / 31 tests failing with 5 s timeouts — every one of those
> runs was executed CONCURRENTLY with another heavy job (`bun run build` / the
> Storybook suite) in the same worktree. Run in isolation the suite is green
> every time. No failure was ever in this story's files.

### Follow-ups / notes

- No ADR was registered by the engineer — the ADR amending 0059 is fe-lead's to
  register (the table above is the input for it).
- The design mockup `invitations.jsx` was used for shell/tone only, per the
  packet; the flow, states and copy come from the real contract.
- `invite-accept-screen`'s local `TokenError` was **promoted** (moved, not copied)
  to `components/shared/invitation-notice/` because the redeem screen needs the
  same pattern (decision `0026`). Same DOM/classes; the accept screen's existing
  stories still pass unchanged, which is the regression proof. The accept FLOW is
  untouched.
