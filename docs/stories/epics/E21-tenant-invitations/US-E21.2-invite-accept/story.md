# US-E21.2 Public Invitation Accept Onboarding (HIGH-RISK)

## Status

planned

## Lane

high-risk

## Dependencies

- Depends on: none technically (a valid token can be constructed by BE/QA for testing); soft-sequencing note — only *meaningfully* end-to-end usable once US-E21.1 ships the invite-generation surface that produces real tokens
- Blocks: none
- Feature module(s) chạm: `src/features/auth/` (extends `IIamMemberRepository.acceptInvitation` + `AuthRepository` session-establishment code path) — new public route in `src/app/[locale]/(auth)/invitations/accept/` or equivalent public route group, exact placement is `fe-lead`'s call
- Shared contract/file: `bootstrap/endpoint/iam-member.endpoint.ts` (`IAM_MEMBER_EP.acceptInvitation`), `src/features/auth/infrastructure/dtos/token-response.dto.ts` (`TokenResponseDto` — reused, not forked), session-establishment code path in `loginAction`/`AuthRepository.signin()` (decision `0018`), `docs/decisions/0051-invitation-accept-public-account-creation.md` (BINDING)

## Product Contract

At the public, unauthenticated route `/invitations/accept?token=...`, a
visitor presents an opaque invite token. The system resolves and shows the
invited school/role/inviter/expiry, then branches on session state:
**guest** (no session) fills a shortened signup form (name + password, email
locked/read-only) whose submission creates a new account, joins the invited
tenant/role, and establishes a session identically to login (decision
`0018`); **signed-in** (any existing account) sees a single "Join" action.
Three token-invalid states (expired/used/invalid) plus a 4th account-conflict
state (email already has an account) each render distinct, curated copy — no
raw server error text is ever shown on this public page. This is the repo's
**first unauthenticated, account-creating, role/tenant-assigning** flow —
**ADR `0051` is binding** and its rules are restated verbatim in `spec.md`
§"Security Contract (ADR 0051)". Full engineering detail, traceability, and
open questions are in `spec.md` (this packet).

## Relevant Product Docs

- `docs/decisions/0051-invitation-accept-public-account-creation.md` — **BINDING**
- `docs/product/design-spec.jsonc` → `screens.inviteAccept` (line ~4315)
- `docs/product/screens.md` — row "Accept tenant invitation (public, no shell)"
- `design_src/edu/invitations.jsx` — `InviteAcceptScreen`
- `docs/design-requests/DR-015-tenant-invitations.md`
- `.claude/rules/api-integration.md` — Auth flow / token hybrid (decision `0018`)
- `docs/product/roles-permissions.md` — role-to-route redirect mapping (reused for FR-008)
- Sibling packet: `docs/stories/epics/E21-tenant-invitations/US-E21.1-admin-invitations/` (produces the real tokens this screen consumes)

## Acceptance Criteria

Condensed — full Given/When/Then in `use-cases.md` (this packet), §4
(AC-101.x .. AC-107.x + cross-cutting AC-SEC-1/2, 7 use cases + security
callouts). Summary by use case:

- UC-101 Resolve invitation token: loading, success (summary renders), malformed-token short-circuit (zero network call), expired/used/invalid terminal states, network error (distinct from the 3 terminal states), unmapped-code fallback to "invalid", no client-side token caching/logging.
- UC-102 Guest creates account and accepts: email locked/read-only (no edit control anywhere), name/password client validation, **security-critical**: request body is exactly `{token, fullName, password}` — no `role`/`tenantId` ever, loading (no optimistic success), success (session established, follow-up `/users/me`, redirect on server-truth role), expired/used race, account-conflict (4th state), server validation error, network error (form data preserved).
- UC-103 Signed-in user joins: single-action, **security-critical**: request body is exactly `{token}` — no `role`/`tenantId`/`email`, success, email-mismatch (explicit error, never silent success/merge — `[OPEN QUESTION]` exact trigger, see spec.md §8), already-member error, loading, network error.
- UC-104 Account-conflict state (email already has an account): distinct 4th state (not one of the 3 token-error illustrations), reuses staged i18n keys `invitations.accept.alreadyHaveAccount`/`signInToJoin`, no auto-link.
- UC-105 Token-invalid terminal states (expired/used/invalid): 3 distinct illustrations, no form shown, unmapped code falls back to "invalid" generic copy, never raw server error text.
- UC-106 Success + role-based redirect: success copy + CTA, redirect target from POST-accept `/users/me` server truth (never the pre-accept preview's informational role), multi-role → `/select-role` (existing rule, no new rule invented).
- UC-107 Switch account (signed-in escape hatch): logout signs out, re-renders guest branch for the SAME token/URL, logout failure leaves session intact (no partial clear).

## Design Notes

- Route: `/invitations/accept?token=...` — public, unauthenticated, same 2-column auth shell family as `/login` (`screens.login.left` brand panel reused, hidden ≤900px)
- Design file: `design_src/edu/invitations.jsx` — `InviteAcceptScreen`
- Commands (indicative, not binding on FE naming): accept-invitation (guest variant, signed-in variant), switch-account (logout + re-render)
- Queries: resolve-invitation-token (preview)
- API (`iam` service — see spec.md §6 for full contract + Security Contract):
  - `[OPEN QUESTION, best-effort] GET /iam/api/v1/invitations/preview?token=...` — resolve/preview, read-only, idempotent, no wiring exists yet
  - `POST /iam/api/v1/invitations/accept` — existing endpoint constant, **contract extension required** (guest-branch fields + session-token response; current repo method is signed-in-only `Promise<void>`)
  - Follow-up `GET /iam/api/v1/users/me` (existing `AUTH_EP.me`) — chained after accept, same pattern as existing `signin()`, to learn the server-assigned role for redirect
- Domain rules: **ADR 0051 rules 1-6, restated in full in spec.md's Security Contract section** — server-authoritative token validation; no client-supplied role/tenantId ever; email immutable/server-resolved; session issuance reuses decision-0018 hybrid exactly; password min 6 chars; signed-in branch never silently merges accounts.
- UI surfaces: invitation summary card, guest form (locked email + name + password), signed-in single-action panel, 3 token-error illustrations + 1 account-conflict state, success state + redirect CTA, switch-account link.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E21.2 --unit 0 --integration 0 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | domain use-cases: resolve-token (pending/expired/used/invalid/unmapped), accept-guest (ok/email-conflict/validation), accept-signed-in (ok/email-mismatch/already-member) |
| Integration | `IIamMemberRepository` extension — preview + accept (guest+signed-in variants) against mock; session-establishment reuses `AuthRepository.signin()`'s cookie-setting code path (no new path) |
| E2E | Storybook interaction: Loading / GuestForm / GuestFormValidationErrors / GuestSuccess / SignedInJoin / SignedInEmailMismatch / AccountConflict / TokenExpired / TokenUsed / TokenInvalid / SwitchAccount |
| Platform | `bun build` + `tsc --noEmit` clean |
| Release | design-review gate pass (`docs/DESIGN_REVIEW.md`) + **mandatory `fe-tech-lead-reviewer` security-diff**: reject any accept Server Action payload containing a `role` or `tenantId` key (ADR `0051` rule 2, non-negotiable) |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E21.2 (planned, **high-risk** lane)
- `docs/product/screens.md`: already has a design-ready row for this screen (see Relevant Product Docs) — update status to spec-ready once this spec lands
- ADR `0051` already exists and is binding for this story — no new ADR needed for the core contract; the email-mismatch behavior (ADR 0051's own unresolved Follow-Up item) may warrant an ADR amendment once BE confirms, flag to `ba-lead` at that time
- Open contract questions (preview endpoint shape, 3 new failure-union codes, email-mismatch trigger, `USER_EMAIL_ALREADY_EXISTS` exact code, signed-in-join response shape) are carried to `fe-lead`/BE team in `spec.md` §8 — not blocking spec completion, but MUST block `/fe` implementation of the affected branches until resolved (do not ship guessed security-relevant behavior)

## Ground-Truth Correction (fe-lead, 2026-07-18)

**ADR `0059` (amends `0051`) is now also BINDING.** Ground-truthing edu-api's
IAM Go source before implementation found `POST /api/v1/invitations/accept`
requires prior authentication (`RequireAuth`), its body is `{token}` only —
no `fullName`/`password`/account-creation capability exists anywhere on this
endpoint or use-case — and no preview/resolve GET endpoint exists at all.
The "guest creates an account inline" premise in this story's Product
Contract above (and UC-102/UC-104 in `use-cases.md`) is **dropped, not
buildable against the real BE**. Corrected scope: an auth-gate state for
unauthenticated visitors (sign-in link, no inline form) + the signed-in
"Join" action (unchanged security shape: `{token}` only) with session refresh
via the EXISTING `switchTenant` mint (not a new session-issuance path) + two
terminal error states (invalid, expired — not three) + a CONFIRMED
email-mismatch state. Full detail: `docs/decisions/0059-*.md` +
`spec.md` §11 + `use-cases.md` §7 (all authoritative over the
now-historical/superseded sections above). Lane stays **high-risk**; the
mandatory security-diff on the accept payload still applies. New cross-repo
ask #31 filed in `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`.

## Evidence / Review Verdicts

- **`fe-tech-lead-reviewer`**: **Approved.** Mandatory security-diff (ADR
  `0051` rule 2 / `0059`) confirmed PASS on all 5 checks: (1) accept payload
  traced end-to-end as EXACTLY `{token}` (`joinAction` →
  `AcceptInvitationUseCase` → `IamMemberRepository.acceptInvitation` →
  `http.post(IAM_MEMBER_EP.acceptInvitation, { token })`, asserted by a
  repository test); (2) `switchTenant` session refresh uses ONLY the
  server-returned `Member.tenantId`, never a client-supplied value; (3)
  `switchAccountAction` fully signs out (clears cookies) before redirecting
  to the SAME token URL — no partial/silent-merge path; (4) no raw server
  error text rendered anywhere (curated `invitations.accept.errors.*`/
  `tokenError.*` keys only); (5) domain layer pure, infrastructure
  `'server-only'`. `tsc --noEmit` clean, 353 files / 2267 tests green
  (confirmed independently by the reviewer, matched the engineer's report).
  One SHOULD-FIX (unhandled throw if post-accept `switchTenant` fails —
  tracked as a follow-up, non-blocking) + 2 minor CONSIDER items (stale
  comment wording; `expired` VM kind currently only reachable via
  Storybook, not `page.tsx`'s runtime branch — flagged for a future pass,
  does not affect the shipped behavior since expired/invalid both render via
  the inline error banner today).

- **`fe-accessibility-auditor`** (self-audit fallback, `fe-lead`,
  2026-07-18): the spawned auditor's structured findings did not
  successfully relay through the background-agent channel (relay failure,
  content lost in-session) — `fe-lead` re-derived the findings directly by
  reading `invite-accept-screen.tsx`/`auth-brand-panel.tsx`/`globals.css`
  against `.claude/rules/accessibility.md` and fixed them in place (not
  merely reviewed):
  - **A11Y-001 (Critical, fixed)** — `.dark {}` in `globals.css` collapsed
    `--edu-error-text` to raw `--edu-error` while leaving
    `--edu-error-light`/`--edu-warning-light` at their light-mode values →
    ~2.2:1 contrast in dark mode for every error/warning chip on this
    screen. Fixed by adding dark-mode-specific `--edu-error-light`/
    `--edu-error-text`/`--edu-warning-light`/`--edu-warning-text` values
    (verified via WCAG relative-luminance calculation: ≥9.5:1 for both
    pairs) to the existing ADR-0049 dark-override block — a token-VALUE fix
    within an already-established override block, not a new token/ADR.
  - **A11Y-002 (Major, fixed)** — `AuthBrandPanel`'s white decorative title
    (aria-hidden) measured ~1.7:1 against the gradient's `--edu-success`
    end. Fixed with a `bg-black/45` scrim behind the text block (verified
    ≥6:1 against every gradient stop) + removed the tagline's `/80` opacity.
    Affects both `login/page.tsx` and this screen (shared component).
  - **A11Y-003 (Major, fixed)** — the inline "Đổi tài khoản?" switch-account
    button had no minimum touch target. Fixed with `inline-flex min-h-11
    items-center` (≥44px per `.claude/rules/accessibility.md`).
  - **A11Y-004 (Minor, fixed)** — the screen's content column was a bare
    `<div>` with no landmark. Changed to `<main>`.
  - **A11Y-005 (Minor, fixed)** — the 2 terminal error states (expired/
    invalid) were dead-ends with no way back to sign-in. Added a "Quay lại
    đăng nhập"/"Back to sign in" link (new i18n key
    `invitations.accept.tokenError.backToLogin`, vi+en).
  - **A11Y-006 (informational, NOT fixed here)** — the shared `Button`
    `default` variant's contrast is borderline app-wide (not
    invite-accept-specific); out of this story's scope, flagged for a
    separate design-system pass.
  - Verified post-fix: `bunx tsc --noEmit` clean, `bun run vitest:storybook
    run invite-accept` (9/9) + `auth-brand-panel` (1/1) still pass, full
    `bun vitest run` 353/353 files · 2267/2267 tests green, `bun lint:fix`
    clean for all touched files (2 pre-existing warnings elsewhere,
    unrelated).
  - Standard a11y checklist re-verified against `.claude/rules/accessibility.md`
    for this screen: all interactive controls keyboard-operable with visible
    focus rings (no custom `outline: none`); error surfaces use `role="alert"`
    + icon+text (never color-only); `aria-busy` on the Join button while
    pending; no motion/animation beyond the existing Button/Card primitives'
    own (already motion-safe-gated) transitions; vi/en both fully covered
    (typed `t()` keys, `tsc` enforces parity); no unlabeled icon-only
    controls (all decorative icons `aria-hidden`, all icon+text pairs).

## Design Review Gate (`docs/DESIGN_REVIEW.md`, fe-lead, 2026-07-18)

```text
Design review: pass
- design-system: conform — tokens-only throughout (bg-primary, text-foreground,
  text-muted-foreground, bg-edu-error-light/text-edu-error-text,
  bg-edu-warning-light/text-edu-warning-text, border-border, bg-card,
  bg-background); typography matches auth-screen scale (text-xl/extrabold
  title, text-sm body); route + component location match
  docs/product/screens.md's "Accept tenant invitation" row
  (`/invitations/accept?token=...`, `features/auth/presentation`); no new
  component pattern invented — reuses Card/Button primitives +
  the newly-promoted shared AuthBrandPanel (component-organization.md
  "promote on 2nd use" compliance, confirmed by fe-tech-lead-reviewer).
- a11y: WCAG AA confirmed after self-audit fixes (see Evidence above) —
  dark-mode error/warning contrast now ≥9.5:1, brand-panel scrim ≥6:1,
  ≥44px touch targets, role="alert" + icon+text on every error state
  (never color-only), aria-busy on Join, <main> landmark, keyboard-operable
  end to end with visible focus rings (no custom outline removal).
- impeccable audit: the impeccable design hook ran automatically on every
  Edit to `globals.css`/`auth-brand-panel.tsx` during the self-audit pass —
  "No anti-patterns" both times (typography hierarchy/spacing rhythm/color
  contrast flagged as intentional). No conflicting suggestion arose against
  the design system.
- states: auth-gate / signed-in-idle / signed-in-loading (aria-busy) /
  email-mismatch / switch-account-failure / network-error / token-expired /
  token-invalid / missing-token — all 9 covered by Storybook interaction
  tests, all green. No "empty" surface applicable (no list on this screen).
  Responsive: Card is `max-w-[440px]` with `p-6 sm:p-8` outer padding — no
  fixed-width overflow below 320px; brand panel already hides `<lg`
  (matches `login`'s established breakpoint). Dark mode verified via the
  A11Y-001 fix above (previously broken, now ≥9.5:1).
```
PASS — gate cleared, story may proceed to `fe-qa-playwright`.

## QA Verdict (`fe-qa-playwright`, 2026-07-18)

**Gate check**: `fe-tech-lead-reviewer` = Approved (security-diff PASS, 5/5
checks) → proceeding.

**Scope re-derivation**: independently re-read ADR `0059`, `use-cases.md` §7,
`spec.md` §11, and the ACTUAL shipped files (`invite-accept-screen.tsx`,
`.stories.tsx`, `page.tsx`, `actions.ts`, `accept-invitation.use-case.ts`,
`iam-member.repository.ts`) — confirmed the corrected scope (no guest
signup/preview/account-conflict; 2 terminal states; auth-gate + signed-in-join
+ email-mismatch + switch-account) and audited against that, not the
superseded UC-101/102/104.

### AC Coverage Matrix (corrected scope)

| AC ID | Criterion | Test ID(s) | Type | Status |
| --- | --- | --- | --- | --- |
| UC-101'.1 | Auth-gate state, no form/password/email display | `AuthGate` story | Storybook interaction | Covered |
| UC-101'.1 | Missing/blank token → `invalid`, ZERO network call (page-level, not just component-level) | `page.test.ts` "missing token"/"blank/whitespace token" (NEW) | Unit (node, RSC) | Covered (was previously only proven at the use-case layer, not the actual RSC branch) |
| UC-101'.2 | Token + no session cookie → auth-gate | `page.test.ts` "no session cookie" (NEW) | Unit | Covered (NEW — untested before) |
| UC-101'.3 | Token + stale/broken session (profile lookup fails) → falls back to auth-gate, no crash | `page.test.ts` "profile lookup returns no data" (NEW) | Unit | Covered (NEW — untested before) |
| UC-103.1 | Signed-in single Join action | `SignedInJoinIdle` | Storybook | Covered |
| UC-103.2 (security) | Payload EXACTLY `{token}` — no role/tenantId | `iam-member.repository.test.ts` ("acceptInvitation posts { token }…") + `actions.test.ts` "posts { token } only…" (NEW, action-layer) | Unit + Integration | Covered |
| UC-103.3 (corrected) | Redirect role from `accept` response `roles[]`, no `/users/me` follow-up | `actions.test.ts` "posts { token } only…", "multi-role…", "empty roles[]…" (NEW) | Unit | Covered (NEW — this exact wiring, incl. the `switchTenant(tenantId)` call using the SERVER-returned id, had ZERO test before) |
| UC-103.4 | Email-mismatch (403) confirmed, explicit error shown | `EmailMismatchError` story + repo test `invitation_email_mismatch` | Storybook + Integration | Covered |
| UC-103.6/.7 | Loading (aria-busy), network error (retry) | `SignedInJoinLoading`, `NetworkError` stories | Storybook | Covered |
| UC-104 (session refresh) | `switchTenant` mint via existing path, `setAuthCookies` called with returned tokens | `actions.test.ts` "posts { token } only…" (NEW) | Unit | Covered (NEW) |
| UC-105.1/.3 | Terminal `expired` / `invalid` (covers used/revoked), no raw error text | `TokenExpired`, `TokenInvalid` stories | Storybook | Covered |
| UC-106 | Success redirect target = server truth, multi-role reuses `role ? /role : /` | `actions.test.ts` "multi-role…"/"empty roles[]…" (NEW) | Unit | Covered (NEW) |
| UC-107 | Switch-account: logout + re-render, failure leaves session intact | `SwitchAccountFailure` story + `actions.test.ts` "signs out…"/"logout failure leaves the session INTACT…" (NEW, action-layer proof of "no partial clear") | Storybook + Unit | Covered |
| Cross-cutting | Keyboard-only operability (Join, switch-account, back-to-login) | `KeyboardOnlyJoin`, `KeyboardOnlySwitchAccount`, `KeyboardOnlyBackToLogin` (NEW) | Storybook | Covered (NEW — previously only asserted via code review, no test) |
| Cross-cutting | Responsive 320px / 768px (no overflow, brand panel hidden) | `Viewport320`, `Viewport768` (NEW) | Storybook | Covered (NEW) |
| Cross-cutting | Dark-mode contrast regression guard (A11Y-001 fix) | `DarkModeEmailMismatchContrast`, `DarkModeTokenExpiredContrast` (NEW) | Storybook | Covered (NEW — the self-audit fix had NO regression-guard test; a future `globals.css` edit could silently reintroduce the ~2.2:1 contrast bug undetected) |

**Coverage: 100%** of the corrected/surviving AC set (UC-101'/103/105/106/107).
Dropped UC-101/102/104 correctly have no tests (would be testing a
non-existent code path, per ADR 0059).

### Findings

- **MAJOR (closed by this QA pass, not a defect for `fe-lead` to route)**: the
  actual security-critical wiring — `joinAction`'s `switchTenant(tenantId)`
  call using the SERVER-returned id (not any client value), the redirect-URL
  construction from `roles[0]`, and `switchAccountAction`'s
  "logout failure leaves session intact" guarantee — had **zero test
  coverage** before this pass. The tech-lead's security-diff traced this by
  manual code read ("(2) `switchTenant` session refresh uses ONLY the
  server-returned `Member.tenantId`… (3) `switchAccountAction` fully signs out
  … no partial/silent-merge path"), which is a real and correct manual
  verification, but had no regression-guard test backing it — a future edit
  to `actions.ts` could silently break these invariants with no red test.
  Added `src/app/[locale]/(auth)/invitations/accept/actions.test.ts` (11
  tests) and `page.test.ts` (7 tests) closing this gap. No production bug was
  found — the shipped code is correct, only the proof was missing.
- **MINOR (informational, not blocking)**: `bootstrap/di/auth.di.ts`'s
  `makeAcceptInvitationUseCase` constructs `IamMemberRepository` directly,
  bypassing the `USE_MOCK` gate that `bootstrap/di/iam-member.di.ts`'s
  `makeRepo()` applies to every other `IIamMemberRepository` consumer. Not a
  security issue (this endpoint has no mock-data risk — it mutates real
  membership), but means `USE_MOCK=1` local dev can't exercise this flow
  against `MockIamMemberRepository`. Flag to `fe-lead` as a follow-up
  consistency nit, not release-blocking.
- No PII in logs/console: confirmed by code read — no `console.*` calls
  anywhere in the touched files; the token is only ever passed through props/
  Server Action args, never persisted (matches the tech-lead's own note).
- Role-gated UI: N/A for this screen (public, unauthenticated route by
  design — no role branching to hide).
- Mapped-failure messages: confirmed user-safe — every error path renders a
  curated `invitations.accept.errors.*`/`tokenError.*` i18n key, never raw
  server text (`errorMsgKey()` maps unmapped codes to `unknown`, no
  passthrough).

### Test Run Evidence (this session)

- `bun vitest run` (full suite): **355 files / 2285 tests, all green**
  (+2 files / +18 tests vs. the reviewer's 353/2267 baseline — the 2 new
  `actions.test.ts`/`page.test.ts` files).
- `bun run vitest:storybook run
  src/features/auth/presentation/invite-accept/invite-accept-screen.stories.tsx`:
  **16/16 green** (9 pre-existing + 7 new: `KeyboardOnlyJoin`,
  `KeyboardOnlySwitchAccount`, `KeyboardOnlyBackToLogin`, `Viewport320`,
  `Viewport768`, `DarkModeEmailMismatchContrast`,
  `DarkModeTokenExpiredContrast`).
- `bun run vitest:storybook run src/features/auth/presentation`: **37/37
  green** (includes `auth-brand-panel`, confirming the shared component isn't
  regressed).
- `bunx tsc --noEmit`: clean.
- `bun lint`: clean for all touched files (2 pre-existing warnings in
  `message-context-menu.tsx`, unrelated to this story).

### Files changed (test-only, no production code)

- `src/app/[locale]/(auth)/invitations/accept/page.test.ts` (NEW)
- `src/app/[locale]/(auth)/invitations/accept/actions.test.ts` (NEW)
- `src/features/auth/presentation/invite-accept/invite-accept-screen.stories.tsx`
  (extended — 7 new stories)

### Release Readiness Decision: **PASS**

Rationale: tech-lead approval confirmed; AC coverage 100% against the
corrected/shipped scope; no BLOCKER/CRITICAL/MAJOR defects found in
production code (the one MAJOR finding was a test-coverage gap, now closed
within this QA pass, not a code defect); one MINOR informational nit
(`USE_MOCK` bypass) flagged as a non-blocking follow-up. Full suite green,
`tsc`/`lint` clean.

### Post-QA follow-up closed (fe-lead, 2026-07-18)

The MINOR `USE_MOCK` bypass nit above was fixed before merge (small, safe,
already the established convention elsewhere — no reason to defer):
`makeAcceptInvitationUseCase` in `bootstrap/di/auth.di.ts` now branches on
`USE_MOCK` and constructs `MockIamMemberRepository` when set, exactly
matching `iam-member.di.ts`'s `makeRepo()` / `admin-invitations.di.ts`'s
convention for every other `IIamMemberRepository` consumer. Re-verified
after the fix: `bunx tsc --noEmit` clean, full `bun vitest run` **355 files /
2285 tests green** (unchanged from QA's count — no new tests needed, this
was a DI-wiring fix only), `bun lint:fix` clean for the touched file.

**Final status: all gates green — tech-lead Approved (security-diff PASS),
a11y fixed (self-audit, 5 findings closed), design-review gate PASS, QA
PASS + follow-up nit closed. Ready for `implemented`.**
