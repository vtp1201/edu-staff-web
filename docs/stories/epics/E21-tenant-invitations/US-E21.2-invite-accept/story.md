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
