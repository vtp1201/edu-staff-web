# Feature Spec — Public Invitation Accept Onboarding (US-E21.2, HIGH-RISK)

Status: Draft   Lane: high-risk
Sources: `requirements.md` (TR-021.2, FR-001..FR-010, NFR-001..NFR-008) +
`integration.md` (INT-001, INT-002) + `use-cases.md` (UC-101..UC-107,
AC-101.x..AC-107.x + AC-SEC-1/2) + `docs/decisions/0051-invitation-accept-public-account-creation.md`
(**BINDING**) + `docs/product/design-spec.jsonc` → `screens.inviteAccept`
(line ~4315) + `docs/design-requests/DR-015-tenant-invitations.md`.

This is the repo's **first unauthenticated, account-creating,
role/tenant-assigning public route**. Every functional requirement below is
subordinate to the Security Contract in §"Security Contract (ADR 0051)" — in
any apparent conflict between a UX nicety and a security rule, the security
rule wins.

## 1. Scope & Objectives

**Purpose**: let an invited person accept a tenant invitation at
`/invitations/accept?token=...`, either by creating a new account (guest) or
joining with their existing account (signed-in), without any client-side
control over the role/tenant they receive.

**In scope**:
- Public route rendering, both guest and signed-in branches.
- Client-side field validation (name required, password ≥6 chars) as a UX convenience layer only — server remains authoritative.
- Rendering server-driven token states: valid/pending, expired, used, invalid, success, and the 4th account-conflict state.
- Sending `{token, fullName, password}` (guest) or `{token}` (signed-in) — never `role`/`tenantId`.
- Session establishment on success following the existing decision-`0018` cookie convention exactly.
- Role-based post-success redirect using the role returned by the server (`/users/me` follow-up).

**Out of scope**:
- Token generation, signing, expiry calculation, single-use tracking (BE/`iam` responsibility).
- Email delivery of the invite link (BE/`noti` responsibility, precondition to this screen).
- Admin-side invitation management (US-E21.1).
- Password strength/complexity beyond the min-6-chars client hint (BE/security policy decision, not this screen's).
- Merging two distinct existing accounts by email (explicitly not supported).

**Definitions**:
- *Guest*: unauthenticated visitor, no active session, pre-account.
- *Signed-in*: any authenticated user (any of the 5 system roles) hitting the link while already logged in.
- *Preview/resolve*: the read-only, idempotent GET that returns invitation summary data before any form renders — distinct from *accept*, the single-use, state-changing POST.
- *Terminal state*: expired / used / invalid (3 fixed illustrations, FR-007) — distinct from the 4th, separately-modeled account-conflict state (UC-104).

## 2. Actors & Roles

| Actor | Access | Role-gated visibility |
| --- | --- | --- |
| Guest (unauthenticated visitor) | View invitation summary; submit `{token, fullName, password}` to create account + join; switch to sign-in | Public route, no auth required to view/submit |
| Any authenticated role (`teacher`/`principal`/`student`/`parent`/`admin`) | View invitation summary as current session; single-click join with `{token}`; switch account (sign out) before joining | No specific role required to join a NEW tenant — any of the 5 system roles may accept |
| System (`iam` service) | Token resolve/validate, single-use enforcement, account creation, role/tenant assignment (server-side only), session-token issuance | N/A — server-authoritative for every security-relevant decision (ADR `0051` rule 1) |

## 3. Functional Requirements

### FR-001 — Resolve token, render invitation summary
- Priority: Must. Source: TR-021.2 FR-001, UC-101, INT-001.
- The system SHALL read the `token` query parameter on mount and resolve invitation summary data (school, invited role, inviter name/title, expiry) before rendering the form.
- AC:
  - AC-101.1 Given navigation with `?token=X`, When the preview call is in flight, Then a loading state renders within 320ms, distinct from the 3 error variants, the 4th conflict state, and success.
  - AC-101.2 Given the preview resolves `status: pending`, Then the invitation summary renders and the guest/signed-in branch renders next per session state.
  - AC-101.3 Given the URL has no/malformed `token` param, Then the "invalid" variant renders immediately with ZERO network call.
- Dependencies: `[OPEN QUESTION]` preview endpoint shape (§6 INT-001, unconfirmed).

### FR-002 — Email locked/read-only in guest form
- Priority: Must (**security-critical**). Source: TR-021.2 FR-002, UC-102, ADR `0051` rule 3.
- The system SHALL render the invited email as a read-only, locked field sourced only from the server-resolved invitation data — no control to edit/retype/override it, anywhere in the DOM.
- AC:
  - AC-102.1 Given the guest branch renders, Then the email field is read-only/disabled with an aria-describedby hint, and NO control (button, contentEditable, hidden input override) exists anywhere to change it.

### FR-003 — Guest form client-side validation
- Priority: Must. Source: TR-021.2 FR-003, UC-102.
- The system SHALL require full name (non-empty) and password (≥6 chars) with inline validation errors before enabling submit.
- AC:
  - AC-102.2 Given empty fullName on submit/blur, Then inline error "Vui lòng nhập họ tên." (role=alert, aria-invalid, aria-describedby), submit disabled.
  - AC-102.3 Given password <6 chars, Then inline error "Mật khẩu tối thiểu 6 ký tự.", submit disabled.
  - AC-102.4 Given fullName non-empty and password ≥6 chars, Then submit enables.

### FR-004 — Guest submit: create account + join, no client role/tenant fields
- Priority: Must (**security-critical, primary privilege-escalation guard**). Source: TR-021.2 FR-004, UC-102, ADR `0051` rule 2, INT-002.
- The system SHALL submit the guest form as `{token, fullName, password}` — no `role`/`tenantId` field, ever, under any code path including retries.
- AC:
  - AC-102.5 **SECURITY** — Given the guest submits, Then the outgoing request body contains EXACTLY `token`/`fullName`/`password` and NO `role`/`tenantId`/other identity field, under any circumstance including retried requests — independently verified by `fe-tech-lead-reviewer` (see §"Security Contract").
  - AC-102.6 Given submit is pending, Then aria-busy + spinner, disabled to prevent double-submit; no optimistic success UI before the response returns (NFR-001, ADR `0051` rule 1).
  - AC-102.7 Given accept succeeds, Then account created, session cookies set via the EXACT login/decision-`0018` code path, follow-up `GET /users/me` resolves role, success state (UC-106) renders using that server-returned role.
  - AC-102.8/AC-102.9 Given token expires/is used between load and submit, Then the "expired"/"used" variant renders, form discarded.
  - AC-102.10 Given an email-already-exists condition, Then the 4th distinct state (UC-104) renders — NOT the expired/used/invalid illustrations.
  - AC-102.12 Given network/5xx, Then generic error toast, fullName/password field values preserved (not cleared).

### FR-005 — Signed-in single-action join, no silent merge
- Priority: Must (**security-critical**). Source: TR-021.2 FR-005, UC-103, ADR `0051` rule 2/6, INT-002.
- The system SHALL, when signed in, display the current email + a single "Tham gia {school}" action submitting `{token}` bound to the CURRENT session — never silently creating a second account or reassigning the invitation to a different email without explicit user action.
- AC:
  - AC-103.1 Given a signed-in user, Then only current email + single "Tham gia {school}" button render — no name/password fields.
  - AC-103.2 **SECURITY** — Given the user clicks "Tham gia", Then the outgoing request body contains EXACTLY `token` and NO `role`/`tenantId`/`email` field — independently verified by `fe-tech-lead-reviewer`.
  - AC-103.3 Given join succeeds, Then invited tenant/role added to the CURRENTLY signed-in account only, follow-up role-refresh resolves the new role, success state (UC-106) renders.
  - AC-103.4 Given the server rejects because the invitation's target email differs from the signed-in account's email, Then an explicit error renders (never silent success/auto-switch/auto-merge), and the switch-account affordance (UC-107) is offered — `[OPEN QUESTION]` exact trigger/error-code unconfirmed (§8), this AC's assertion holds regardless of the eventual BE behavior.
  - AC-103.5 Given the user already has a role in the invited tenant, Then a curated (non-raw) error renders verbatim.

### FR-006 — Switch account affordance
- Priority: Should. Source: TR-021.2 FR-006, UC-107.
- The system SHALL provide a "switch account" affordance in the signed-in branch that signs the user out and returns to the guest branch for the SAME token/URL, without losing invitation context.
- AC:
  - AC-107.1 Given signed-in branch active, When "Đổi tài khoản?" clicked, Then existing logout flow signs out and the SAME token/URL re-renders the guest branch, invitation summary intact.
  - AC-107.2 Given logout fails, Then user remains signed in, error shown, session NOT partially cleared.

### FR-007 — Three distinct token-error states
- Priority: Must (**security boundary — no form access on invalid token**). Source: TR-021.2 FR-007, UC-105.
- The system SHALL render exactly one of three distinct token-error states (expired/used/invalid), each with its own icon/color/title/body/contact-office fallback; SHALL NOT render the signup/join form in any of these states.
- AC:
  - AC-105.1/AC-105.2/AC-105.3 Given expired/used/invalid respectively, Then a distinct icon/color/title/body + contact-office fallback renders, visually distinct from the other two/three, no form shown.
  - AC-105.4 Given any of the 3 states (or the UC-104 conflict state), Then no raw server `error.message`, stack trace, or error code string is ever displayed.

### FR-008 — Success state + role-based redirect
- Priority: Must. Source: TR-021.2 FR-008, UC-106.
- The system SHALL render a success state on successful accept and redirect/link to the workspace matching the role JUST assigned (server truth via `/users/me`), never a role the client assumed beforehand.
- AC:
  - AC-106.1 Given accept succeeds (either branch), Then success state shows "Chào mừng đến {school}!", assigned role, "Vào trang chính" CTA.
  - AC-106.2 Given success renders, Then redirect target is computed from the post-accept `/users/me` role — never the pre-accept preview's informational `role` field.
  - AC-106.3 Given the refreshed account has multiple roles/tenants, Then CTA routes to `/select-role` (existing post-login rule, no new rule invented).
  - AC-106.4 Given success renders, Then session cookies are set via the EXACT same server-side code path as login (decision `0018`) — no new client-side cookie-writing code.

### FR-009 — No client-side token persistence/logging
- Priority: Must (**security-critical**). Source: TR-021.2 FR-009, ADR `0051` rule 1.
- The system SHALL NOT persist or expose the raw invite token anywhere client-readable beyond the current page's query string and the in-flight accept request body — no localStorage/sessionStorage, no logging.
- AC:
  - AC-101.9 Given the preview response is received, Then the raw token value is never written to localStorage/sessionStorage or logged, only held in the URL and transient component state.
  - AC-SEC-2 (cross-cutting) Given the accept flow completes (success or any error/terminal state), Then the raw invite token is never written to localStorage/sessionStorage/logs — exists only in the URL query string and in-flight request body.

### FR-010 — Loading state during token resolution
- Priority: Should. Source: TR-021.2 FR-010, UC-101.
- The system SHALL show a loading state while the preview call is in flight, distinct from the 3 terminal states and success.
- AC: AC-101.1 (see FR-001).

### UC-104 (no dedicated FR-ID in requirements.md, ba-lead resolution) — Account-conflict state
- Priority: Must (ba-lead product/UX decision, `integration.md` 2026-07-12). Source: `integration.md` §"Ba-Lead Decision", UC-104.
- The system SHALL, on a guest-accept `USER_EMAIL_ALREADY_EXISTS`-equivalent condition, render a 4th, distinct state (not one of the 3 token-error illustrations) using the ALREADY-STAGED i18n keys `invitations.accept.alreadyHaveAccount`/`invitations.accept.signInToJoin` as the call-to-action.
- AC:
  - AC-104.1 Given the condition, Then a visually/structurally distinct state renders (not the 3 illustrations) with the staged copy keys.
  - AC-104.2 Given this state renders, Then no account is auto-linked/merged, no session silently established.
  - AC-104.3 Given the sign-in CTA clicked, Then navigation to the existing sign-in flow (token context not required to be preserved beyond this point).

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 (Security) | Token single-use/expiry authoritative server-side; FE never optimistically assumes success | Zero client-side logic marking an invitation consumed/valid without a successful server response | Code review + AC-102.6 interaction test (no success UI before response) |
| NFR-002 (Security) | Invited email immutable; role/tenant never client-sent | Accept payload contains ONLY `{token,fullName,password}` (guest) or `{token}` (signed-in) — no `role`/`tenantId` field in any variant | **Mandatory `fe-tech-lead-reviewer` security-diff** (ADR `0051` rule 2) — see §"Security Contract" |
| NFR-003 (Security) | Session issuance reuses decision-`0018` hybrid exactly, no new mechanism | Same cookie-setting code path as login, no `document.cookie`/localStorage token write | Code review — same server action code path as `loginAction` |
| NFR-004 (Security) | No raw internal/BE error text leaked to the public page | Zero raw `error.message`/exception text ever rendered on this route | AC-105.4 interaction test + `fe-accessibility-auditor`/security review |
| NFR-005 (a11y) | Locked-email describedby hint; form errors role=alert+aria-invalid+aria-describedby; countdown never color-only | WCAG 2.1 AA; ≥4.5:1 body text, ≥3:1 large/bold text + icons | `fe-accessibility-auditor` audit + axe scan |
| NFR-006 (Responsive) | Brand panel hides ≤900px; content card usable to 320px | No layout break/clipping at 320/375/768/1280px | Storybook viewport addon |
| NFR-007 (i18n) | All copy from `invitations.accept.*` namespace; contact-office phone/email as interpolation params | 100% strings via `t('invitations.accept....')` both locales | `bunx tsc --noEmit` (typed keys) + hardcode grep |
| NFR-008 (Perf) | Prompt loading state to avoid blank first-impression public page | Loading visible ≤320ms of navigation | Storybook interaction timing |

## 5. UI States & Flows

Required states (loading/error/success — this screen has no "empty" surface
in the conventional sense; the 3 terminal states + 4th conflict state serve
that role):

- **Token resolution (UC-101)**: loading (≤320ms) → success (summary + branch) | malformed-token (zero-network "invalid") | expired/used/invalid (3 terminal states) | network error (distinct 5th, retryable) | unmapped-code (falls back to "invalid").
- **Guest form (UC-102)**: idle/editing (client validation) → submitting (spinner, aria-busy, NO optimistic UI) → success (UC-106) | expired/used race (form discarded, terminal state) | account-conflict (UC-104) | server validation error (inline, form stays editable) | network error (form data preserved).
- **Signed-in join (UC-103)**: idle (single button) → submitting (spinner) → success (UC-106) | expired/used race | email-mismatch error (explicit, switch-account offered) | already-member error | network error.
- **Success (UC-106)**: single terminal success render + role-based redirect CTA.
- **Switch account (UC-107)**: idle → logging out → guest branch re-render (same token/URL) | logout failure (remain signed in, error shown).

Key flow (guest): visitor clicks emailed link → preview loads → summary +
guest form render → visitor fills name/password → submits → account created
+ session established → follow-up `/users/me` → success + redirect.

Key flow (signed-in): user already logged in clicks the link → preview loads
→ summary + single "Tham gia" button → click → join → follow-up role-refresh
→ success + redirect (or explicit mismatch/already-member error, or
switch-account escape hatch).

## 6. Data & Integration

Both endpoints: service `iam`. Full detail in `integration.md` (this packet)
— condensed below. **OQ-3 (single accept call vs resolve+accept) is
resolved**: two calls — a read-only, idempotent preview/resolve GET, and a
separate, deliberate, state-changing accept POST (never triggered by a
page-load GET).

### INT-001 Resolve/preview invitation by token
- `[BEST-EFFORT, NOT CONFIRMED] GET /iam/api/v1/invitations/preview?token={token}` — public, unauthenticated, no repository method exists today.
- Request: `token` query param (Restricted sensitivity).
- Response (camelCase): `schoolName`, `role` (informational/display-only, NEVER authorization-bearing), `inviterName`, `expiresAt`, `email` (PII, rendered read-only), `status` (`pending\|expired\|used\|invalid`).
- Error → UI: `INVITATION_EXPIRED`/`INVITATION_USED`/`INVITATION_NOT_FOUND`\|`INVITATION_INVALID` (all inferred, need new distinct failure-union types, §8) → matching terminal state, not retryable; unrecognized code → "invalid" generic copy; network/5xx → generic error + retry, distinct from the 3 terminal variants, retryable; malformed token in URL → client-side short-circuit, zero network call.

### INT-002 Accept invitation (guest = create account, or signed-in = join)
- `POST /iam/api/v1/invitations/accept` — endpoint constant REAL (`IAM_MEMBER_EP.acceptInvitation`), **contract extension required**: existing repo method is `acceptInvitation(token): Promise<void>` (signed-in-only, US-E06.4) — guest branch + session-token response are new surface.
- Request — guest: `{token, fullName, password}` (camelCase). Request — signed-in: `{token}` only (existing shape, no change needed).
- Response — guest branch: `{accessToken, refreshToken, tokenType:"Bearer", sessionId}` — SAME shape as existing `TokenResponseDto`, mirroring `signin()`'s chain pattern exactly (fetch tokens → follow-up `GET /users/me` for role). Response — signed-in branch: recommend treating as empty + the SAME follow-up `/users/me` (or `listMyTenants()`) call for consistency, one code path for redirect-role-resolution regardless of branch.
- Error → UI: `INVITATION_EXPIRED`/`INVITATION_USED` (race between load and submit) → matching terminal state, form discarded, not retryable; `INVITATION_NOT_FOUND`/`INVITATION_INVALID` → "invalid" state; `USER_EMAIL_ALREADY_EXISTS` (guest, already mapped in `auth-failure.mapper.ts`) → UC-104 4th state, NOT one of the 3 terminal illustrations; email-mismatch (signed-in, `[OPEN QUESTION]` exact code, §8) → explicit FR-005 error, switch-account offered; 422 validation → `error.fields[]` inline; network/5xx → generic error toast, retryable, form data preserved (guest branch).

### Mock-first plan
`iam` is real/shipped, but INT-001 has zero existing wiring and INT-002's
guest-branch extension is unbuilt. Until BE confirms both contracts, recommend
a mock-first stand-in in `bootstrap/lib/mock.ts` (decision `0014`) gated by
`NEXT_PUBLIC_USE_MOCK`: fixture invitations keyed by test tokens
(`valid-pending`, `expired-token`, `used-token`, `invalid-token`) for
INT-001, and a mock `TokenResponseDto` + `/users/me` response for INT-002's
guest branch, so the full redirect chain is testable end-to-end against the
mock before BE ships.

## Security Contract (ADR 0051)

**ADR `0051` (`docs/decisions/0051-invitation-accept-public-account-creation.md`)
is BINDING for this story.** Its six rules are restated here in full because
this spec must be self-contained for `fe-lead`/`fe-nextjs-engineer` without
requiring a separate ADR lookup:

1. **Server-authoritative token validation.** Token single-use, expiry, and
   validity are enforced entirely server-side (BE `POST /api/v1/invitations/accept`).
   The client never optimistically assumes success and never caches/logs the
   raw token beyond the URL it arrived in. (→ FR-009, NFR-001)
2. **No client-supplied role or tenant — the primary privilege-escalation
   guard.** The accept request body is `{token, fullName, password}` (new
   account) or `{token}` (already signed-in "Join"). Role and `tenantId` are
   ALWAYS resolved server-side from the invitation record — the client never
   sends or can override them, under ANY code path including error-retry
   flows. (→ FR-004, FR-005, NFR-002, AC-102.5, AC-103.2, AC-SEC-1)
3. **Email is immutable and server-resolved.** The accept form's email field
   is read-only, populated from the server-resolved invitation, never a
   free-text client value. (→ FR-002, AC-102.1)
4. **Session issuance reuses the existing hybrid token convention** (decision
   `0018`) — no new token/session mechanism. Successful accept sets the same
   httpOnly-cookie pair (`auth_token`, refresh, `auth_token_exp`, `sessionId`)
   as email/SSO signin. (→ FR-008, NFR-003, AC-102.7, AC-106.4)
5. **Password policy: minimum 6 characters** (per the DR-015 mockup) — the
   baseline going forward, not a weakening of an existing rule (no stronger
   policy exists elsewhere in `src/features/auth` today). (→ FR-003)
6. **Already-signed-in branch does not silently merge accounts.** If the
   caller is authenticated as a different account than the invited email, the
   UI must show an explicit "switch account" affordance rather than silently
   joining the tenant under the wrong identity. Exact BE behavior on email
   mismatch is `[OPEN QUESTION]`, still unresolved (ADR `0051`'s own
   Follow-Up item) — do not guess. (→ FR-005, FR-006, AC-103.4)

**3 error states (expired/used/invalid) never leak raw server error text** —
each maps to one of three fixed, translated messages (FR-007, NFR-004). This
is a fourth, related rule from the ADR's Decision section and is treated with
equal weight to rules 1-6 above.

**4th distinct state (account-conflict, `USER_EMAIL_ALREADY_EXISTS`)** — this
is a `ba-lead` product/UX resolution (`integration.md`, 2026-07-12), not part
of ADR `0051`'s original 3-state enumeration, but is now a fixed requirement
of this spec (FR — UC-104, above): separate from expired/used/invalid,
reuses staged i18n keys, no silent auto-link.

**Mandatory `fe-tech-lead-reviewer` security-diff callout** (ADR `0051`
Follow-Up, restated as a hard gate): the reviewer MUST diff the accept Server
Action payload — for BOTH the guest and signed-in variants, across ALL code
paths including retry/error-recovery — against rule 2 above and reject any
payload shape that includes a `role` or `tenantId` field. This is
AC-102.5/AC-103.2/AC-SEC-1 made mechanically enforceable at review time, not
merely inferred from UI behavior. `fe-lead` must not mark this story
`implemented` without this specific diff having been performed and recorded
in the story's Evidence/Review Verdicts section.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-101 | Resolve invitation token (preview) | FR-001, FR-009, FR-010 | 9 |
| UC-102 | Guest creates account and accepts invitation | FR-002, FR-003, FR-004 | 12 |
| UC-103 | Signed-in user joins invited tenant | FR-005 | 7 |
| UC-104 | Account-conflict state (email already has an account) | (ba-lead UX resolution, above) | 3 |
| UC-105 | Token-invalid terminal states (expired/used/invalid) | FR-007 | 4 |
| UC-106 | Success + role-based redirect | FR-008 | 4 |
| UC-107 | Switch account (signed-in escape hatch) | FR-006 | 2 |
| Cross-cutting | Security AC (both UC-102 and UC-103) | FR-004, FR-005, FR-009 (ADR `0051` rule 2) | 2 (AC-SEC-1/2) |

## 8. Constraints & Assumptions

**Technical constraints**:
- No `edu-api/services/iam/docs/openapi.yaml` accessible from this repo — every error-code mapping and response shape below is best-effort/inferred, cross-checked only against the already-wired US-E06.4 `acceptInvitation()` (narrower, signed-in-only scope).
- `iam-member.failure.ts` today collapses `INVITATION_NOT_FOUND`/`INVITATION_EXPIRED` into ONE failure type (`invitation-not-found`) — this story needs 3 DISTINCT types (expired/used/invalid), requiring an `IamMemberFailure`/dedicated `InviteAcceptFailure` union extension.

**Confirmed [ASSUMPTION]s** (from `requirements.md`, not re-litigated here):
- [ASSUMPTION] Min-6-char password is the current baseline (no stronger policy exists elsewhere in `src/features/auth` today) — fixed by ADR `0051` rule 5; revisit only if a future registration epic introduces a stricter policy.
- [ASSUMPTION] "Signed-in" detection reuses the existing session-check mechanism already used elsewhere in the app shell — no new session-detection mechanism introduced.
- [ASSUMPTION] Role-based redirect after success reuses the existing post-login redirect logic (exactly 1 role → that workspace; multiple → `/select-role`) — no new redirect rule invented.

**[GAP]**: none identified beyond the `[OPEN QUESTION]`s below (this story's requirements/integration/use-case passes were unusually thorough in flagging rather than silently gapping).

**[OPEN QUESTION]** (carried verbatim from `integration.md`/`use-cases.md`/
ADR `0051`'s own Follow-Up — NOT resolved here, MUST block `/fe`
implementation of the affected branch, per ADR `0051`'s explicit "do not
guess" instruction):
- **INT-001 preview endpoint** — path/method is this analyst's proposal, not read from `iam/openapi.yaml`. Confirm before `/fe` implements the token-resolution fetch.
- **New failure-union codes** — confirm exact BE strings for `INVITATION_EXPIRED`/`INVITATION_USED`/`INVITATION_INVALID` (or `INVITATION_NOT_FOUND`) before `/fe` wires the mapper.
- **Email-mismatch behavior (signed-in branch)** — hard reject vs conditional allow is UNCONFIRMED (carried from ADR `0051`'s own unresolved Follow-Up item + requirements.md OQ-2). AC-103.4 holds under either outcome (no silent success/merge either way), but the exact trigger condition/error code/UX copy detail needs BE confirmation before `/fe` implements this specific branch.
- **`USER_EMAIL_ALREADY_EXISTS` exact code on guest accept** — the UX shape (UC-104) is fixed by ba-lead's decision, but the FE cannot wire the mapper until the exact code string is confirmed against `iam` ERROR_CODES.md.
- **Signed-in-join response shape** — confirm whether accept returns updated membership/role data inline for the signed-in branch, or is genuinely empty (this spec recommends treating it as empty + a uniform follow-up `/me` call for both branches — confirm this isn't a wasted round trip if BE already returns inline).
- OQ-2.1: is there a client-side max-length on fullName/password (not specified in requirements.md) — recommend a reasonable UX cap but flag to `ba-lead`/design before `/fe` hardcodes an un-spec'd number.
- OQ-2.2: if the signed-in user's OWN session expires mid-flow (distinct from the invitation token expiring) — recommend the existing generic 401/reactive-refresh handling (decision `0018`) suffices silently, no bespoke messaging, unless `ba-lead` says otherwise.

**No [CONFLICT]** identified between `requirements.md`/`integration.md`/`use-cases.md`/ADR `0051`/design-spec for this story — all three sources are consistent on the security rules; the only open items are BE-contract-shape confirmations, not internal contradictions.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Resolve token + summary | TR-021.2 FR-001 | UC-101 | INT-001 | Must |
| FR-002 Email locked/read-only | TR-021.2 FR-002, ADR 0051 r.3 | UC-102 | INT-001 (data source `email`) | Must |
| FR-003 Client-side name/password validation | TR-021.2 FR-003 | UC-102 | — | Must |
| FR-004 Guest submit, no client role/tenant | TR-021.2 FR-004, ADR 0051 r.2 | UC-102 | INT-002 (guest variant) | Must |
| FR-005 Signed-in join, no silent merge | TR-021.2 FR-005, ADR 0051 r.2/6 | UC-103 | INT-002 (signed-in variant) | Must |
| FR-006 Switch-account affordance | TR-021.2 FR-006 | UC-107 | — (reuses existing logout) | Should |
| FR-007 3 token-error states | TR-021.2 FR-007 | UC-105 | INT-001, INT-002 (error codes) | Must |
| FR-008 Success + role-based redirect | TR-021.2 FR-008 | UC-106 | INT-002 (guest) + follow-up `/users/me` | Must |
| FR-009 No client-side token persistence | TR-021.2 FR-009, ADR 0051 r.1 | UC-101 | INT-001, INT-002 | Must |
| FR-010 Loading state (token resolution) | TR-021.2 FR-010 | UC-101 | INT-001 | Should |
| UC-104 Account-conflict (4th state) | ba-lead resolution, `integration.md` 2026-07-12 | UC-104 | INT-002 (guest, `USER_EMAIL_ALREADY_EXISTS`) | Must |
| NFR-001 Server-authoritative, no optimistic UI | TR-021.2 NFR-001, ADR 0051 r.1 | UC-102 | INT-002 | Must |
| NFR-002 No client role/tenant field | TR-021.2 NFR-002, ADR 0051 r.2 | UC-102, UC-103 | INT-002 | Must |
| NFR-003 Session reuses decision-0018 hybrid | TR-021.2 NFR-003, ADR 0051 r.4 | UC-106 | INT-002 | Must |
| NFR-004 No raw error leakage | TR-021.2 NFR-004 | UC-105, UC-104 | INT-001, INT-002 | Must |
| NFR-005 a11y | TR-021.2 NFR-005 | UC-102 | — | Must |
| NFR-006 Responsive | TR-021.2 NFR-006 | all UCs | — | Must |
| NFR-007 i18n | TR-021.2 NFR-007 | all UCs | — | Must |
| NFR-008 Perf (loading timing) | TR-021.2 NFR-008 | UC-101 | INT-001 | Should |

## 10. Handoff to FE

`fe-lead` should build the public `/invitations/accept?token=...` route per
this spec + `design_src/edu/invitations.jsx` (`InviteAcceptScreen`) +
`docs/product/design-spec.jsonc` → `screens.inviteAccept`. **Lane: high-risk**
— confirmed by ADR `0051`'s own hard-gate analysis (Auth, Authorization,
External-systems, Public-contract all apply), not re-litigated by this spec.

Before `/fe` implements FR-001 (preview) and the email-mismatch branch of
FR-005, resolve the `[OPEN QUESTION]`s in §8 (preview endpoint shape, new
failure-union codes, email-mismatch trigger/code) with the `iam` BE team —
ADR `0051` explicitly forbids shipping a guessed behavior for the
email-mismatch branch. Everything else in this spec is buildable mock-first
per decision `0014` in the interim.

Proof owed (maps to `docs/TEST_MATRIX.md` rows, see story.md §Validation):
unit tests for resolve-token/accept-guest/accept-signed-in use-cases
(including the new 3-way failure-union split); integration tests for the
extended `IIamMemberRepository` (preview + accept, both variants) confirming
session-establishment reuses `AuthRepository.signin()`'s exact cookie-setting
code path; Storybook interaction stories for every state in §5; `bun build` +
`tsc --noEmit` clean; design-review gate pass; **and the mandatory
`fe-tech-lead-reviewer` security-diff** on the accept Server Action payload
(§"Security Contract") recorded in the story's Evidence section before this
story may be marked `implemented`.
