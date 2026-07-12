# Integration Map — US-E21.2 Public Invitation Accept Onboarding (HIGH-RISK)

Governed by `docs/decisions/0051-invitation-accept-public-account-creation.md`
(binding — applied strictly below) + `.claude/rules/api-integration.md`. No
`edu-api/services/iam/docs/openapi.yaml` accessible from this repo — every
error-code mapping and the exact response shape below is **best-effort /
inferred**, cross-checked against the ALREADY-WIRED `acceptInvitation()` on
`IIamMemberRepository` (US-E06.4, `src/features/auth/...`), which today only
covers the narrower "signed-in join with `{token}`" case. New-account creation
(`{token, fullName, password}`) is **not yet modeled anywhere in this repo** —
this is new contract surface for US-E21.2.

## 1. Integration Overview

- **Endpoints consumed**: 2 — token resolve/preview (new) + accept (extends existing).
- **Service**: `iam` only.
- **Status**: accept endpoint constant exists (`IAM_MEMBER_EP.acceptInvitation`,
  REAL path) but its request/response contract must be **extended**
  (guest branch fields, session-token response) beyond the current
  `Promise<void>` shape. The preview/resolve call has **no existing wiring at
  all** — flagged MOCK-FIRST/UNCONFIRMED until iam's contract is confirmed.
- **Risk notes** (per ADR 0051 + FEATURE_INTAKE hard gates — Auth,
  Authorization, External-systems, Public-contract):
  - This is the first unauthenticated, account-creating, role/tenant-assigning
    endpoint call in the codebase. Every request/response field below is
    scoped against ADR 0051's binding rules (no client-role/tenantId, ever).
  - `fe-tech-lead-reviewer` MUST diff the accept Server Action payload against
    rule 2 of ADR 0051 (reject any `role`/`tenantId` field) as a mandatory
    security check for this story.
  - OQ-3 (single accept call vs resolve+accept) is **resolved below**: two
    calls (resolve/preview is read-only and idempotent; accept is the single
    state-changing, single-use call) — see §2 rationale.

## 2. Endpoint Catalogue

### INT-001 Resolve/preview invitation by token

```
Service: iam                          Method+Path: [BEST-EFFORT, NOT CONFIRMED] GET /iam/api/v1/invitations/preview?token={token}
Status: MOCK-FIRST / UNCONFIRMED — no endpoint constant, no repository method exists today.
Protected: no (public, unauthenticated — token itself is the bearer of access to this one record)
Role required: none (public route)
```

**Resolution of OQ-3 (does accept do double-duty as preview, or is there a
separate resolve call?)** — recommend **two calls**, not one:

1. A read-only **preview/resolve** call (GET, idempotent, safe to retry/re-run
   on every page mount without side effects) returns the invitation summary
   (school, role, inviter, expiry, invited email) needed to render FR-001's
   summary card and the 3 terminal states (FR-007) BEFORE any form is shown.
2. The **accept** call (POST, single-use, state-changing) is the only call
   that creates the account / joins the tenant / mints a session — this must
   remain a distinct, deliberate user action (form submit / "Tham gia" click),
   never triggered by a page-load GET, matching ADR 0051's "no optimistic
   success" rule (NFR-001) and the general principle that state-changing
   account-creation should not happen on GET.

Reusing ONE endpoint for both (e.g. a GET that also silently marks
single-use) would risk accidental consumption from prefetch/retry/bot crawl
of the public URL — rejected for that reason.

```
Request (outbound, camelCase): token — query param, the opaque invite token from the URL | Restricted
Response payload (inbound, after envelope unwrap):
  schoolName — tenant display name, server-resolved | Internal
  role — the system role this invite will assign if accepted (teacher|student|parent|principal|admin) — rendered, NOT sent back by the client on accept (ADR 0051 rule 2) | Internal
  inviterName — display name/title of the admin who sent the invite | Internal
  expiresAt — ISO timestamp, drives the summary's expiry display | Internal
  email — the invited email, rendered read-only in the guest form (FR-002); NEVER client-editable | PII
  status — pending | expired | used | invalid — drives which of loading/form/error-variant renders (see FR-007)

Pagination: none
Errors → UI behavior (best-effort code mapping — NOT confirmed against iam ERROR_CODES.md):
  - `INVITATION_EXPIRED` (inferred; existing `iam-member.failure.ts` already
    maps `INVITATION_EXPIRED`→`invitation-not-found`, too coarse for this
    story — needs a NEW distinct failure type, see §5) → FR-007 "expired" variant, no form | not retryable
  - `INVITATION_USED` (inferred, no existing mapping anywhere in this repo — new code) → FR-007 "used" variant, no form | not retryable
  - `INVITATION_NOT_FOUND` / `INVITATION_INVALID` (inferred; existing `INVITATION_NOT_FOUND`→`invitation-not-found` mapping is reused as the base for "invalid") → FR-007 "invalid" variant, no form | not retryable
  - any other/unrecognized code → falls back to the "invalid" variant's generic copy (FR-007 explicit requirement: never expose raw server error text) | not retryable
  - network/5xx (no error.code, or statusOf undefined) → generic loading→error state, DISTINCT from the 3 terminal variants (FR-010) — retry button re-issues the preview call | retryable
  - token missing/malformed in the URL itself → client-side short-circuit to the "invalid" variant with ZERO network call (FR-001 errorConditions) | not retryable
Empty / loading expectation: FR-010 loading state while in flight, replaced by
  summary+form, one of 3 error variants, or (if somehow already accepted by
  the time of preview) an early success/already-used disambiguation — treat
  "already accepted" as the "used" variant per FR-007's exhaustive 3-state rule.
```

### INT-002 Accept invitation (guest = create account, or signed-in = join)

```
Service: iam                          Method+Path: POST /iam/api/v1/invitations/accept
Status: REAL endpoint constant (IAM_MEMBER_EP.acceptInvitation) — CONTRACT
        EXTENSION REQUIRED: current repo method signature is
        `acceptInvitation(token: string): Promise<void>` (US-E06.4, signed-in-only,
        no session-token response). US-E21.2 needs both request variants below
        AND a session-token response — this is new/changed surface, not a
        reuse-as-is.
Protected: guest branch = no (public); signed-in branch = yes, ANY authenticated
           role (the join action itself requires an existing session, but no
           specific role is required — any of the 4 system roles may accept
           an invite to a new tenant/role)
```

**Request contract — per ADR 0051 rule 2, BINDING, no exceptions:**

```
Guest (new account) variant, camelCase:
  token — the invite token from the URL | Restricted
  fullName — from the guest form | PII
  password — from the guest form, min 6 chars client-side hint (ADR 0051 rule 5) | Restricted (never logged)
  — NO role field. NO tenantId field. Ever. (ADR 0051 rule 2 — primary privilege-escalation guard)

Signed-in (join) variant, camelCase:
  token — the invite token from the URL | Restricted
  — NO other fields. Role/tenant/identity are resolved server-side from the
    CURRENT session's bearer token + the invitation record. This is the
    exact shape the EXISTING `acceptInvitation(token)` repo method already
    sends — this variant needs NO change.
```

**Response contract — resolves the requirements packet's OQ-3 "does accept
return role inline, or is a follow-up `/me` call needed":**

Recommend mirroring the EXISTING signin/`TokenResponseDto` chain-pattern
documented in `.claude/rules/api-integration.md` ("signin trả TokenResponse
(không có user) → repo chain GET /users/me") **exactly**, for the guest
branch:

```
Response payload (inbound, after envelope unwrap) — guest branch:
  accessToken, refreshToken, tokenType:"Bearer", sessionId — SAME shape as TokenResponseDto (src/features/auth/infrastructure/dtos/token-response.dto.ts) | Restricted
  — NO profile/role/tenant fields inline (mirrors signin's TokenResponse, which also excludes them)

  → FE chains a follow-up GET /iam/api/v1/users/me (AUTH_EP.me) with the fresh
    accessToken — EXACTLY the existing `AuthRepository.signin()` pattern
    (fetch tokens, then fetch profile) — to learn the assigned role for
    FR-008's role-based redirect. This is a SECOND network round-trip, same
    cost/shape as every existing signin, NOT a new pattern.

Response payload — signed-in (join) branch:
  Likely no new tokens minted (session already exists) — the response instead
  needs to convey the NEWLY ADDED tenant/role so the FE can redirect/update
  local membership state without a second round trip, OR the FE re-calls
  `/users/me` (or the existing `listMyTenants()` on IIamMemberRepository) to
  refresh the membership list post-join. Recommend the SAME follow-up-`/me`-call
  pattern for consistency (one code path for redirect-role-resolution
  regardless of branch), rather than trusting an inline role in the accept
  response for this branch (existing repo method returns `Promise<void>` today
  — extending it to return the resolved role would create TWO different
  response shapes across the guest/signed-in variants; a follow-up `/me` call
  keeps ONE shape).

  [OPEN QUESTION] Confirm with iam whether the signed-in-join accept response
  is genuinely empty/204, or already returns updated membership data inline —
  if inline data already exists, the follow-up call is redundant and can be
  skipped for that branch specifically.
```

**Recommended pattern (final answer to OQ-3):** guest branch = accept (mints
tokens, TokenResponseDto-shaped) → follow-up `GET /users/me` for role, EXACTLY
like existing signin. Signed-in branch = accept (no new tokens needed, session
already valid) → follow-up `GET /users/me` (or re-run `listMyTenants()`) to
learn the newly joined tenant/role for the redirect. One follow-up-call
pattern, reused across both branches — no new session-establishment mechanism
per ADR 0051 rule 4.

```
Pagination: none
Errors → UI behavior (best-effort — flag as inferred, confirm against iam ERROR_CODES.md):
  - `INVITATION_EXPIRED` (race: expired between preview load and submit, FR-004) → FR-007 "expired" variant, form discarded | not retryable
  - `INVITATION_USED` (race: accepted elsewhere concurrently, FR-004) → FR-007 "used" variant, form discarded | not retryable
  - `INVITATION_NOT_FOUND`/`INVITATION_INVALID` → FR-007 "invalid" variant | not retryable
  - `USER_EMAIL_ALREADY_EXISTS` (guest branch: an account with the invited email already exists — already mapped in `auth-failure.mapper.ts`) → NOT one of the 3 token-error variants; this is an account-conflict case — needs its own explicit message ("Email này đã có tài khoản — hãy đăng nhập") distinct from expired/used/invalid, with a link to sign in instead. `[OPEN QUESTION]` whether iam actually returns this or auto-resolves it differently (e.g. auto-links) — do not guess, confirm before AC are written.
  - Email-mismatch on signed-in branch (OQ-2 from requirements.md, unresolved
    by BE contract per ADR 0051's own Follow-Up note) — best-effort code
    `INVITATION_EMAIL_MISMATCH` (inferred, not confirmed) → explicit error per
    FR-005 ("this invite is for a different email"), NEVER silently proceed;
    surface the "switch account" affordance (FR-006) as the resolution path.
    `[OPEN QUESTION — carried over from ADR 0051's own Follow-Up, still open]`.
  - 422 validation (password policy, fullName empty — beyond client check) → error.fields[] → inline field error (FR-004) | not retryable until fixed
  - network/5xx → generic error toast, form data preserved for retry (FR-004) | retryable
Empty / loading expectation: submit button spinner/disabled while in flight;
  NFR-001 forbids any optimistic UI change before the response returns.
```

## 3. Auth & Security (expanded — high-risk story)

- **INT-001 (preview)**: unauthenticated/public by nature — the token itself
  is the access credential to this one record. Server MUST NOT leak other
  tenants'/invitations' data via this endpoint (enumeration risk) — out of
  FE's control, but the FE must never attempt to guess/brute-force tokens or
  cache the response beyond the current page lifecycle (NFR fits FR-009's
  no-persistence rule, applied to the preview response too — role/school
  summary is fine to hold in component state, but the token itself must
  never be written to localStorage/sessionStorage/logs).
- **INT-002 (accept)**: guest branch unauthenticated (creates the auth), then
  IMMEDIATELY becomes an authenticated write once tokens are minted — the
  session-establishment step (setting `auth_token`/refresh/`auth_token_exp`/
  `sessionId` httpOnly cookies) MUST run through the EXACT SAME server-side
  code path as `loginAction`/signin (decision `0018`), not a new cookie-writing
  path — this is ADR 0051 rule 4, non-negotiable.
- **PII/Restricted fields**: `password` (Restricted, never logged, never
  echoed back), `token` (Restricted, URL + in-flight request body only, FR-009 —
  no client storage, no logging), `email` (PII, read-only/immutable per ADR
  0051 rule 3 and NFR-002 — the request body literally cannot carry a
  different email than the one the server resolved from the token).
- **Privilege-escalation guard (the core security property of this whole
  story)**: request bodies for BOTH accept variants contain **zero**
  `role`/`tenantId` fields — this must be verified in `fe-tech-lead-reviewer`'s
  review as a hard-fail check, per ADR 0051 rule 2 and NFR-002's explicit
  measurable target ("Accept-invitation request payload contains only
  {token, fullName, password} (guest) or {token} (signed-in) — no role/tenantId
  field present in any request variant").
- **Role-based redirect (FR-008)**: MUST use the role returned by the
  follow-up `/users/me` call (server truth), never a role the client assumed
  from the preview response before submission — the preview's `role` field is
  informational/display-only, not authorization-bearing.

## 4. Mock-first plan

`iam` is a real/shipped service, but the **preview/resolve endpoint (INT-001)
has zero existing wiring** and the **accept endpoint's guest-branch
request/response extension (INT-002) is unbuilt**. Until BE confirms both
contracts (flagged to `ba-lead` for the ADR 0051 follow-up), recommend a
mock-first stand-in in `bootstrap/lib/mock.ts` (decision `0014`) gated by
`NEXT_PUBLIC_USE_MOCK`:

- Mock preview response: fixture invitations keyed by a few test tokens
  (`valid-pending`, `expired-token`, `used-token`, `invalid-token`) returning
  the INT-001 shape above, so `/fe` can build/demo all 3 error variants +
  the summary card without a live BE.
- Mock accept response (guest branch): fixture `TokenResponseDto`-shaped
  payload + a mock `/users/me` response carrying the role from the matched
  fixture invitation, so the full redirect chain is testable end-to-end
  against the mock before BE ships the real contract.

## 5. Open Questions

- `[OPEN QUESTION]` **INT-001 preview endpoint** — path/method above
  (`GET /iam/api/v1/invitations/preview?token=`) is this analyst's proposal,
  not read from `iam/openapi.yaml`. Confirm the actual resolve/preview
  contract (or confirm BE truly has none and FE must derive the summary from
  a differently-shaped call) before `/fe` implements the token-resolution
  fetch.
- `[OPEN QUESTION]` **New failure-union codes needed** — `iam-member.failure.ts`
  today collapses `INVITATION_NOT_FOUND`/`INVITATION_EXPIRED` into ONE type
  (`invitation-not-found`). US-E21.2 needs 3 DISTINCT types (expired/used/invalid)
  per FR-007 — this requires extending `IamMemberFailure` (or introducing a
  dedicated `InviteAcceptFailure` union) with new best-effort codes
  `INVITATION_EXPIRED` / `INVITATION_USED` / `INVITATION_INVALID` (or
  `INVITATION_NOT_FOUND`), confirm exact strings against BE before `/fe` wires
  the mapper.
- `[OPEN QUESTION]` **Email-mismatch behavior (signed-in branch, carried over
  from ADR 0051's own unresolved Follow-Up item and requirements.md OQ-2)** —
  hard reject vs conditional allow is still unconfirmed; this analyst's
  best-effort `INVITATION_EMAIL_MISMATCH` code is a placeholder pending BE
  confirmation. Do not let `/fe` ship a guessed behavior for this branch.
- `[OPEN QUESTION]` **`USER_EMAIL_ALREADY_EXISTS` on guest accept** — does
  iam surface this distinctly from the 3 token-error variants (this analyst's
  read of FR-007 says it should — it's an account-conflict, not a
  token-validity condition), or does BE handle it differently (auto-link
  existing account to the invite, silently)? Must be confirmed — affects
  whether a 4th distinct UI message is needed beyond the 3 fixed variants
  FR-007 mandates.
- `[OPEN QUESTION]` **Signed-in-join response shape** — confirm whether accept
  returns updated membership/role data inline for the signed-in branch or is
  genuinely empty (this analyst recommends treating it as empty + a uniform
  follow-up `/me` call for both branches, for one consistent code path — but
  confirm this isn't wasting a round trip if BE already returns it inline).
- Per requirements.md's own carried-over OQ-1 (password policy) — outside this
  analyst's scope (product/security policy decision, not a contract-shape
  question) but noted here for completeness: ADR 0051 already fixed it at
  min-6-chars for now; no BE contract implication beyond that being the
  client-hint value.

## Ba-Lead Decision — 4th accept-error state (2026-07-12)

Resolved (product/UX decision, does not require BE confirmation to spec the
AC — `ba-use-case-modeler` may proceed): treat `USER_EMAIL_ALREADY_EXISTS` on
the guest-accept branch as a **4th, distinct state**, separate from the 3
token-error variants (expired/used/invalid) that FR-007 mandates. It is not a
token-validity problem, it's an account-conflict. UI: show a message reusing
the ALREADY-STAGED i18n keys from DR-015 —
`invitations.accept.alreadyHaveAccount` ("Đã có tài khoản?") +
`invitations.accept.signInToJoin` ("Đăng nhập để tham gia") — as a distinct
branch's call-to-action, not a 4th copy of the 3-error-illustration pattern.
Exact BE error code string is still open (flagged above) but the UX/AC shape
is fixed: guest form → submit → email-conflict → show "already have an
account" message + sign-in CTA, do not silently auto-link or fail generically.
