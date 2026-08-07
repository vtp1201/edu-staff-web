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

### A11y audit (2026-08-07)

**Scope:** `src/features/auth/presentation/invite-redeem/invite-redeem-screen.tsx`,
`src/components/shared/invitation-notice/invitation-notice.tsx` (promoted, also
re-checked its new consumer `invite-accept-screen.tsx`), `src/app/[locale]/(auth)/invitations/redeem/{page,actions}.tsx`,
`src/bootstrap/i18n/messages/{vi,en}.json` (`invitations.redeem` + `invitations.roleLabels`
namespaces). Criteria checked: contrast (resolved against `src/app/tokens.css`),
keyboard/focus, forms (label/aria-invalid/aria-describedby), status-not-color-only,
motion, language/copy, target size.

**Verdict: PASS — WCAG 2.1 AA compliant.** 0 Blocking, 0 Critical, 0 Major.
3 Minor/advisory findings (none gate the design-review/merge; all are polish
follow-ups). Contrast, keyboard operability, form semantics, focus visibility,
and status-not-color-only are all correctly implemented and consistent with the
rest of the auth flow (unmodified `Input`/`Button`/`Label` primitives, `--ring`
focus tokens, `text-edu-error-text`/`text-edu-warning-text` — not `text-destructive`).

#### WCAG 2.1 AA coverage

| Criterion | Description | Result | Finding |
| --- | --- | --- | --- |
| 1.3.1 Info & Relationships | Labels linked via `htmlFor`/`id` (`nameId`/`pwId`/`confirmId`), error `<p>` tied via `aria-describedby` | PASS | — |
| 1.4.3 Contrast (Minimum) | `text-edu-error-text` (#c0392b) on white/`edu-error-light` (#fff5f2), `text-edu-warning-text` (#9a6a0f) similarly, `text-muted-foreground` aliased to `--edu-text-secondary` (5.48:1 per design-system.md) | PASS | — |
| 1.4.11 Non-text Contrast | Password-strength bars are `aria-hidden` and redundant with the text hint below (`pwHintId`) — decorative, not sole conveyor | PASS | — |
| 2.1.1 Keyboard | All controls are native `<input>`/`<button>`/`<a>` — no custom widgets, no keyboard trap | PASS | — |
| 2.4.3 Focus Order | DOM order (name → password → confirm → submit → back-to-login) matches visual/reading order | PASS | — |
| 2.4.7 Focus Visible | Inherited `focus-visible:border-ring focus-visible:ring-ring/50 ring-[3px]` from unmodified `Input`/`Button` primitives — not overridden | PASS | — |
| 2.5.5 Target Size | `Input`/`Button` both carry `min-h-11` (44px); `linkLabel` anchors use `min-h-11 inline-flex items-center` | PASS | — |
| 3.3.1 Error Identification | Field errors: `aria-invalid` + `aria-describedby` + visible text under each field. Submit-level errors: `role="alert"` banner/`InvitationNotice`. | PASS | — |
| 3.3.2 Labels/Instructions | Every field has a visible `<Label>`; password field additionally gets a persistent hint (`form.passwordHint`) always in `aria-describedby`, not just on error | PASS | — |
| 3.3.3 Error Suggestion | Copy tells the user how to fix (e.g. `passwordTooShort`, `linkExpired` → "liên hệ nhà trường") | PASS | — |
| 4.1.2 Name, Role, Value | `aria-invalid`/`aria-describedby`/`aria-busy` correctly toggled on state change | PASS | A11Y-001 (minor robustness note) |
| 4.1.3 Status Messages | `role="alert"` on inline submit-error `<p>`, mismatch `<p>`, and `InvitationNotice`'s root `<div>` | PASS | — |
| Motion (prefers-reduced-motion) | No new animation/transition added in this diff | PASS (N/A) | — |
| Language (`<html lang>`) | Unmodified `src/app/layout.tsx` sets `lang={locale}` from `getLocale()` | PASS | — |
| Status not color-only | Every `InvitationNotice` state pairs an icon (`aria-hidden`, supplementary) with a text `title`+`body`; password strength pairs color with bar-count (quantity), not color alone | PASS | — |

#### Findings

```
A11Y-001
Severity: Minor (WCAG 4.1.2, robustness — not a live failure today)
Component: src/features/auth/presentation/invite-redeem/invite-redeem-screen.tsx:380
Issue: `aria-describedby={cn(pwHintId, pwIssue && pwErrId)}` uses `cn()` — a
  Tailwind-class merge helper (`clsx` + `twMerge`) — to build a space-separated
  ARIA ID-reference list. `twMerge` parses its input as Tailwind utility
  classes and can silently drop/reorder tokens it thinks conflict (e.g. two
  strings that both look like a spacing/color utility). Today's generated ids
  (`r0-password-hint`, `r0-password-error`) don't collide with any Tailwind
  class pattern, so this happens to work, but it is fragile: any future `useId()`
  prefix or id-naming change could produce a segment that DOES match a utility
  pattern and get merged away, silently breaking the `aria-describedby` link for
  screen-reader users.
Evidence: `aria-describedby={cn(pwHintId, pwIssue && pwErrId)}` (invite-redeem-screen.tsx:380)
  vs. the name field's own safer pattern one block above:
  `aria-describedby={nameIssue ? nameErrId : undefined}` (line 360), which does
  NOT use `cn()`.
Fix: Build the id list with plain string/array join instead of the class-merge
  helper:
  ```tsx
  aria-describedby={[pwHintId, pwIssue && pwErrId].filter(Boolean).join(" ")}
  ```
Reference: https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/ (aria-describedby); WAI-ARIA 1.2 §5.1.3 (idref lists must resolve to real ids).

A11Y-002
Severity: Minor (advisory — enhancement, not a WCAG SC violation)
Component: src/features/auth/presentation/invite-redeem/invite-redeem-screen.tsx:349-430
Issue: The three account fields (full name, password, confirm password) render
  as loose `<div className="space-y-1.5">` siblings inside the `<form>`, with no
  `<fieldset>`/`<legend>` grouping — yet `messages/vi.json`'s
  `invitations.redeem.form.legend` = "Thông tin tài khoản" is defined and unused
  (confirmed: not referenced anywhere in the .tsx). Each field DOES have its own
  linked `<Label>` (WCAG 3.3.2 is met), so this is a missed grouping cue for
  screen-reader users navigating by landmark/group, not a violation.
Evidence: `grep -rn "form.legend" src/` → zero matches outside `messages/{vi,en}.json`.
Fix: Either wrap the three fields in a `<fieldset className="contents"><legend
  className="sr-only">{t("form.legend")}</legend>…</fieldset>` to consume the
  key and give SR users a group announcement, or delete the unused key from
  both `vi.json`/`en.json` if grouping was never intended.
Reference: WCAG 1.3.1 (Info and Relationships, grouping is a "should" for related
  fields); https://www.w3.org/WAI/tutorials/forms/grouping/

A11Y-003
Severity: Minor (advisory — enhancement, not a WCAG SC violation)
Component: src/features/auth/presentation/invite-redeem/invite-redeem-screen.tsx:432-447
Issue: The submit `Button` is `disabled` while password/confirm/fullName don't
  yet satisfy client-side rules (`checkRules(password).length`, non-empty
  confirm/fullName). A disabled native `<button>` is unfocusable, so a
  keyboard/SR user tabbing to it gets no explanation of WHY it's disabled or
  WHEN it becomes enabled beyond re-deriving it from the persisted password
  hint text (`form.passwordHint`, already in `aria-describedby` — so the info
  exists, just not proximate to the button itself).
Evidence: `disabled={isPending || !checkRules(password).length || confirm.length
  === 0 || fullName.trim().length === 0}` with no `aria-describedby` on the
  `Button` pointing back at the unmet-condition copy.
Fix: Optional polish — either leave the button always enabled and let native
  `required`+submit-time validation surface issues (simpler, more standard
  keyboard pattern), or if keeping client-side disable, add
  `aria-describedby={pwHintId}` on the `Button` too so the reason surfaces when
  focus lands there via Tab (won't help since disabled buttons don't receive
  focus in most browsers — hence "leave enabled" is the better fix).
Reference: https://www.w3.org/WAI/ARIA/apg/practices/images-and-non-text-content/
  (disabled-control announcement pattern); WCAG 3.3.1/3.3.2 spirit (error/
  instruction proximity).
```

#### Keyboard navigation map

1. `Tab` → **Full name** input (`nameId`) — type text.
2. `Tab` → **Password** input (`pwId`, `type="password"`) — native password
   masking/reveal via browser/OS chrome; strength bar updates live but is
   `aria-hidden` (redundant with `pwHintId` text, always announced via
   `aria-describedby`).
3. `Tab` → **Confirm password** input (`confirmId`).
4. `Tab` → **Submit** button (`Enter`/`Space` activates; disabled state skips
   it in tab order only in the sense that focus lands then immediately can't
   activate — see A11Y-003).
5. `Tab` → **"Quay lại đăng nhập"** link (`min-h-11`, native `<a>`).
6. Terminal states (`invalid`/`expired`/`rate-limited`/`tenant-inactive`/`error`/
   `account-exists`/other-terminal) replace the whole form with `InvitationNotice`:
   tab order becomes optional CTA `Button` (only for `account-exists`) → text
   link. No keyboard trap in any state; `Shift+Tab` reverses cleanly since
   everything is native DOM order.

#### Screen reader script

**Before fix (current code — already acceptable):**
- Password field: "Mật khẩu, mật khẩu bảo vệ, bắt buộc" → on focus, hint
  announced via `aria-describedby`: "Tối thiểu 8 ký tự, nên gồm chữ, số và ký tự
  đặc biệt." → on invalid submit: additionally "Mật khẩu chưa đủ mạnh: cần có
  chữ, số và ký tự đặc biệt." (both ids concatenated — confirmed the
  concatenation renders correctly today, see A11Y-001 for the fragility caveat).
- Submit failure (non-terminal, e.g. `rate-limited` while inline): alert region
  interrupts and announces "Bạn đã thử quá nhiều lần. Vui lòng chờ khoảng một
  phút rồi thử lại." immediately, without requiring the user to navigate to find it.
- Terminal state (e.g. expired link): page/region reads "Lời mời đã hết hạn."
  (h1) → body text → "Liên hệ văn phòng nhà trường để được hỗ trợ." (hint chip)
  → "Quay lại đăng nhập" (link, focusable).

**After applying A11Y-001/002 fixes:** identical experience, plus (A11Y-002) an
announced group label "Thông tin tài khoản" when entering the field cluster via
some SR's group-navigation command, and (A11Y-001) guaranteed robustness of the
password field's combined hint+error announcement against future id-format changes.

#### Quick wins (< 30 min each, severity order)

1. A11Y-001 — swap `cn(pwHintId, pwIssue && pwErrId)` for
   `[pwHintId, pwIssue && pwErrId].filter(Boolean).join(" ")` (1 line).
2. A11Y-002 — either wire `<fieldset>`/`<legend className="sr-only">` using the
   already-authored `form.legend` key, or delete the unused key from both
   `vi.json`/`en.json`.
3. A11Y-003 — leave as advisory; only act on it if `fe-tech-lead-reviewer`
   also flags the disabled-button UX pattern independently.

### Tech-lead review (2026-08-07)

**Verdict: APPROVED** (high-risk lane, explicit security focus). No blocking
finding. One `[SHOULD FIX]` is an FE→BE ask outside this branch's code, one is a
1-line `cn()` misuse that overlaps A11Y-001; the rest are `[CONSIDER]`s.

**Checks I ran in this worktree** (isolated — nothing else running concurrently):

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean |
| `bunx vitest run` | **507 files / 3960 tests pass** — matches the packet exactly |
| `bunx vitest run --config vitest.storybook.mts` | **159 files / 1255 tests pass** |
| `bun lint` | 1 warning + 1 info, both pre-existing in `messaging/message-context-menu.tsx` |
| `bun run build` | ✓ compiled; the route appears as `ƒ /[locale]/invitations/redeem` (dynamic) |
| vi/en deep-key parity (scripted diff) | 3625 = 3625, zero drift in either direction |

**Architecture — PASS.** `bootstrap/di/invitation-redeem.di.ts` and both
repositories carry `import "server-only"`; `presentation/invite-redeem/` is
`"use client"` and imports only `domain/` types + its own `.i-vm.ts`;
`page.tsx` (RSC) imports DI but no infrastructure; `actions.ts` (`'use server'`)
touches only `bootstrap/di`, `bootstrap/lib/auth-token.server`,
`bootstrap/tenant`. Endpoints are constants (`IAM_MEMBER_EP.lookupInvitation` /
`redeemInvitation`), DI is a per-request factory, file naming is correct
throughout. Component placement per decision `0026` is exemplary: `TokenError`
was **moved** (not copied) to `components/shared/invitation-notice/` with its
own stories, and the accept screen's unchanged stories are the regression proof.

**Code quality — Excellent.** Strict types, no `any` outside two justified
test-only `biome-ignore`d casts, no unexplained `!`. The domain/infra comments
explain *why* (bcrypt 72-byte bound, replay≠conflict, explicit body fields
instead of a spread) rather than restating code.

**Security — PASS.** I verified each §Release gate independently rather than
trusting the Evidence section:
1. *Cookies* — `setAuthCookies(tokens)` reused verbatim from
   `bootstrap/lib/auth-token.server.ts`: no fork, no parallel path, no
   flag/scope override. `actions.test.ts` asserts the literal order
   `["cookies","redirect"]`.
2. *Redirect target* — derived ONLY from `member.tenantId` +
   `member.roles[0]`; the action accepts no `next`/`returnTo`/`callbackUrl` at
   all, which is the strongest form of "validated redirect" (nothing to
   validate). The caller-crafted-token/name test proves an attacker string
   cannot steer the landing. Role normalisation is the same
   `appRoleOf(...) ?? toLowerCase()` as `select-tenant/actions.ts:52` —
   precedent, not a new rule.
3. *Token never in a query string* — proven twice, the stronger proof being
   `invitation-redeem.http.test.ts` running the REAL axios pipeline and
   asserting the serialised URL equals the bare endpoint and does not contain
   the token. The `?token=` on the PAGE URL is the emailed link's unavoidable
   shape and matches the `invitations/accept?token=` precedent. The token is
   never logged and never persisted client-side (it reaches the client only as
   the prop it already had in the URL).
4. *Confused deputy* — `invitation-redeem.di.ts` builds a BARE
   `createHttpClient()` (no bearer, no `ensureFreshSession`), with a DI test
   asserting `["http:no-token"]` and no `refresh`. Exactly right for an
   account-creation call on a possibly-shared device.
5. *409 vs 410* — kept distinct end-to-end (failure union → mapper → mock
   replay test → action test → two Storybook stories). 409 routes into the
   existing accept flow with a real CTA; 410 is terminal copy that never
   implies a retry could work.
6. *No `email` on the wire* — the redeem body lists fields explicitly instead
   of spreading the command, so no future field can silently reach the wire.
7. Route is genuinely public: `(auth)` has no layout and `src/proxy.ts` only
   gates `/t/{tenantId}` — confirmed by reading both.

**Data & contract — PASS.** Repos consume the unwrapped payload (no `.data`
read); failures branch on `error.code` (case-normalised) with an HTTP-status
fallback, never on `message`; 429 reads `retryAfterSecondsOf`; no retry logic
invented. `mapInvitationPreview` normalises Go's `null` slice to `[]`.

**Design system & i18n — PASS.** Zero raw colors (scanned both new `.tsx`
files): only `bg-edu-error/warning/success`, `*-light`, `text-edu-error-text`,
`bg-primary`, `border-border`, `bg-muted/40` — all present in
`tokens.css`/`@theme`. All copy lives in `messages/{vi,en}.json` with exact
parity; dynamic `t()` keys interpolate literal unions
(`fieldErrors.${InvitationFieldIssue}`, `submitErrors.${…}`) so they stay
compile-checked; the action/use-case/repository return stable keys only.

**Test coverage — PASS.** Genuine TDD proof at every tier: use-case units
(byte bounds, all-issues-at-once, replay≠conflict), mapper (both code casings,
status fallback, 422-blaming-`token` → dead link), repo unit + real-axios
integration, DI env matrix + the public-client property, action redirect chain,
16 redeem stories + 3 notice stories covering loading/empty/error/success.
Deterministic — no reliance on real wall-clock behaviour.

#### Required changes

1. `[SHOULD FIX — FE→BE ask, not this branch's code]` The BE's "10/min per
   client IP" budget shared by `lookup`+`redeem` is mis-bucketed: both calls
   originate from the Next.js server and this repo forwards no
   `X-Forwarded-For`, so the whole app shares one bucket — one abuser can 429
   every legitimate invitee of a public account-creation flow. Do **not** add an
   XFF header unilaterally (a BE trusting a client-settable header is its own
   spoofing hole). `fe-lead`: raise as an FE→BE ask / ADR item alongside the ADR
   amending 0059.
2. `[SHOULD FIX]` `invite-redeem-screen.tsx:380` — `aria-describedby={cn(pwHintId, pwIssue && pwErrId)}`
   pushes DOM **ids** through `cn()` (clsx + **tailwind-merge**). Joining ids is
   not what tailwind-merge is for, and an id that happens to look like a utility
   class could be dropped. Use
   `[pwHintId, pwIssue && pwErrId].filter(Boolean).join(" ")` — same 1-line fix
   the a11y audit filed as A11Y-001, so fix it once.
3. `[CONSIDER]` `invite-redeem-screen.tsx:440` — `!checkRules(password).length`
   reads like an array length, but `checkRules` returns `PasswordRules` and
   `.length` is the ≥8 **boolean**. Correct today; a future reader will "fix"
   it. Destructure: `const { length: isLongEnough } = checkRules(password)`.
4. `[CONSIDER]` `invite-redeem-screen.tsx:121,134` — the `"__mismatch"` sentinel
   shares the `errorKey` state slot with the failure-union keys, forcing the
   state type to `string | null` instead of
   `InvitationRedeemFailure["type"] | null` and requiring the `?? "unknown"`
   guard at line 336. A separate `useState(false)` for mismatch restores the
   typed union.
5. `[CONSIDER]` `redeem-invitation.use-case.ts:26` bounds the password at 72
   **bytes** (bcrypt), but `fieldErrors.passwordTooLong` says "72 characters" /
   "tối đa 72 ký tự" — with Vietnamese diacritics a ~35-character password can
   trip it and the copy would then be misleading. Reword, or measure characters.
6. `[CONSIDER]` The ≥8 rule now exists three times: here (bytes),
   `ResetPasswordUseCase` (`newPassword.length < 8`), and the screen's
   `checkRules().length`. A `shared/password-policy.ts` constant would be the
   canonical home — worth doing before a 4th copy appears.
7. `[CONSIDER]` `actions.ts:56` — an unknown future role enum lands on
   `/{locale}/t/{tenantId}/{lowercased-enum}`, which 404s, while an empty
   `roles[]` correctly falls back to the tenant root. It matches the
   `select-tenant` precedent, so not a defect of this story; falling back to the
   tenant root for an *unmapped* role too would be strictly better and could be
   fixed in both places at once.
8. `[NOTE — confirms a standing finding]` The wire-casing discrepancy the
   engineer flagged matches my own earlier review note:
   `iam-member.repository.ts`'s `mapIamFailure()` matches **lowercase** codes
   with no status fallback, so if the wire is UPPER_SNAKE every IAM failure
   there degrades to `unknown` while its tests still pass. Correctly NOT fixed
   here (other story's code). `fe-lead`: worth its own story with a live-BE check.

#### Called out as good work

The two-level token-never-in-query proof (particularly inspecting the serialised
URL through the real interceptor chain rather than asserting "it works"); the DI
test that asserts the *absence* of a bearer token and of `ensureFreshSession`;
the zero-network short-circuit on a blank token so a dead link cannot spend a
slot of the budget the real attempt needs; and the promote-don't-copy handling
of `InvitationNotice`.
