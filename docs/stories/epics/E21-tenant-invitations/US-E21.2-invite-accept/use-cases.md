# Use Cases + Acceptance Criteria — US-E21.2 Public Invitation Accept Onboarding (HIGH-RISK)

Governed by `docs/decisions/0051-invitation-accept-public-account-creation.md`
(binding) + `requirements.md` (TR-021.2) + `integration.md` (INT-001/INT-002).
This is the repo's first unauthenticated, account-creating, role/tenant-
assigning public route — every use case below is written defensively per
ADR 0051's rules, especially rule 2 (no client-supplied role/tenantId, ever).

## 1. Use Case Scope Summary

7 use cases, 2 actor states (guest, signed-in), 1 public route
(`/invitations/accept?token=...`). Boundaries: this screen never performs
token generation/signing/expiry-calculation (BE/iam responsibility, out of
scope), never sends `role`/`tenantId` in any request, and never persists the
raw token beyond URL + in-flight request body. Session establishment on
success reuses decision 0018's httpOnly-cookie mechanism exactly — no new
auth path.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| Guest (unauthenticated visitor) | Public, pre-account | View invitation summary; submit fullName+password to create account bound to invited email; switch to sign-in |
| Any authenticated role (teacher/principal/student/parent/admin) | Authenticated, any existing session | View invitation summary while signed in; single-click "Join"; switch account (sign out) before joining |
| System (iam service) | External/server | Token resolve/validate, single-use enforcement, account creation, role/tenant assignment, session-token issuance |

## 3. Use Case Catalogue

### UC-101: Resolve invitation token (preview)

- **Primary actor**: guest or signed-in visitor (state not yet known at this point). **Preconditions**: page loaded with `token` query param.
- **Main success scenario**:
  1. Page mounts, reads `token` from URL.
  2. Calls `GET /invitations/preview?token=...` (INT-001, read-only, idempotent, safe to re-run/retry).
  3. Loading state renders while in flight (distinct from the 3 terminal error states and success).
  4. Response resolves with `status: pending` → invitation summary (school, role, inviter, expiry, invited email) renders; branch continues to UC-102 (guest) or UC-103 (signed-in) based on session state.
- **Alternative flows**:
  - A1 — Token missing/malformed in the URL itself → short-circuit to the "invalid" variant (UC-105) with ZERO network call.
- **Exception flows**:
  - E1 — Server returns `status: expired` → UC-105 "expired" variant.
  - E2 — Server returns `status: used` (including "already accepted by the time of preview") → UC-105 "used" variant.
  - E3 — Server returns `status: invalid`/not-found → UC-105 "invalid" variant.
  - E4 — Network/5xx (no error.code / transport failure) → generic error state distinct from the 3 terminal variants, with a retry button that re-issues the preview call.
  - E5 — Unrecognized/unmapped error code → falls back to the "invalid" variant's generic copy (never expose raw server error text on a public page).
- **Business rules**: preview is read-only and MUST NOT mark the token consumed (that only happens on accept, UC-102/103).
- **Non-functional**: loading state visible ≤320ms (NFR-008); no token value ever written to localStorage/sessionStorage/logs.

### UC-102: Guest creates account and accepts invitation

- **Primary actor**: guest (no active session). **Preconditions**: preview resolved with `status: pending`, no active session detected.
- **Main success scenario**:
  1. Guest branch renders: invited email shown read-only (locked, describedby hint explaining it's locked to the invite — no edit control exists anywhere), fullName + password fields editable.
  2. Guest enters fullName (non-empty) and password (≥6 chars); inline validation runs client-side as a UX convenience layer.
  3. Submit enables only when both pass client-side checks.
  4. Guest submits → request body is EXACTLY `{ token, fullName, password }` — no `role`, no `tenantId`, ever (ADR 0051 rule 2).
  5. Submit button shows aria-busy/spinner while in flight; NFR-001 forbids any optimistic UI change before the response returns.
  6. On success: account created, invited tenant/role attached exactly as encoded server-side in the token record, session established via the SAME server-side cookie-setting code path as `loginAction`/signin (decision 0018: `auth_token`, refresh, `auth_token_exp`, `sessionId` httpOnly cookies) — guest branch mints tokens (`TokenResponseDto`-shaped: accessToken/refreshToken/tokenType/sessionId), FE chains a follow-up `GET /users/me` to learn the assigned role.
  7. Success state (UC-106) renders using the server-truth role from `/users/me`, never a role assumed from the preview response.
- **Alternative flows**:
  - A1 — Guest clicks "already have an account? sign in" affordance → navigates to sign-in (out of scope for accept itself; standard sign-in flow takes over).
- **Exception flows**:
  - E1 — Empty fullName → inline error "Vui lòng nhập họ tên." (role=alert, aria-invalid, aria-describedby), submit stays disabled.
  - E2 — Password <6 chars → inline error "Mật khẩu tối thiểu 6 ký tự.", submit stays disabled.
  - E3 — Race: token expires between page load and submit → server rejects with expired condition → UC-105 "expired" variant renders, form discarded (not a field-level error).
  - E4 — Race: token already used (accepted elsewhere concurrently) between load and submit → UC-105 "used" variant renders, form discarded.
  - E5 — `USER_EMAIL_ALREADY_EXISTS` (account with the invited email already exists) → UC-104 (distinct 4th account-conflict state), NOT one of the 3 token-error variants.
  - E6 — Server-side validation error beyond client checks (e.g. password policy) → inline field error from `error.fields[]`, no silent retry, form data preserved.
  - E7 — Network/5xx → generic error toast/state, form data preserved so guest can retry submit without re-typing.
- **Business rules (SECURITY-CRITICAL, ADR 0051 rule 2 + 3)**: the accept request body for this branch contains ONLY `token`, `fullName`, `password` — no `role` or `tenantId` field is ever constructed, serialized, or sent by the client, under any code path, including error-retry. The email field has no editable control anywhere in the DOM.
- **Non-functional**: keyboard-operable end to end; WCAG AA contrast on all field errors (NFR-005).

### UC-103: Signed-in user joins invited tenant

- **Primary actor**: any authenticated role. **Preconditions**: preview resolved with `status: pending`, active session detected.
- **Main success scenario**:
  1. Signed-in branch renders: current signed-in email displayed, single "Tham gia {school}" button (no form fields).
  2. User clicks "Tham gia {school}" → request body is EXACTLY `{ token }` — bound to the CURRENT authenticated session (no email/role/tenantId field sent).
  3. Button shows aria-busy/spinner while in flight.
  4. On success: invited tenant/role added to the CURRENTLY signed-in account only; FE calls follow-up `GET /users/me` (or refreshes membership) to learn the newly joined role for redirect.
  5. Success state (UC-106) renders.
- **Exception flows**:
  - E1 — Race: token expired between load and click → UC-105 "expired" variant, no silent failure.
  - E2 — Race: token already used elsewhere → UC-105 "used" variant.
  - E3 — Server rejects because the invitation's target email does not match the signed-in account's email → an explicit, distinct error message is shown ("this invite is for a different email"); the system NEVER proceeds as if it succeeded and NEVER auto-switches/auto-merges accounts; the "switch account" affordance (UC-107) is offered as the resolution path. [OPEN QUESTION — exact BE behavior/error code for this case is UNCONFIRMED (requirements.md OQ-2, ADR 0051 Follow-Up, integration.md carried-over OPEN QUESTION) — do not assume hard-reject vs conditional-allow; AC-103.4 below is written to hold regardless of which the BE ultimately implements, but the exact trigger condition needs BE confirmation before `/fe` builds it.]
  - E4 — Signed-in user already has a role in the invited tenant → server-driven error surfaced verbatim (curated, not raw text), no client-side masking.
  - E5 — Network/5xx → generic error toast, button re-enabled, no state change assumed.
- **Business rules (SECURITY-CRITICAL)**: request body contains ONLY `token` — no role/tenantId/email field. The join action NEVER silently creates a second account and NEVER silently reassigns the invitation to an email other than the currently authenticated session's own email without the user explicitly acting (e.g. via UC-107 switch-account first).

### UC-104: Account-conflict state (email already has an account)

- **Primary actor**: guest. **Preconditions**: guest submitted the create-account form (UC-102), server responds with an email-already-exists condition.
- **Main success scenario**: distinct 4th state (not one of the 3 token-error illustrations) renders a message reusing the ALREADY-STAGED i18n keys `invitations.accept.alreadyHaveAccount` ("Đã có tài khoản?") + `invitations.accept.signInToJoin` ("Đăng nhập để tham gia") as the call-to-action; form is not silently resubmitted, no account auto-linked.
- **Business rules**: per ba-lead's 2026-07-12 decision (integration.md), this is treated as a distinct account-conflict branch, separate from expired/used/invalid; exact BE error-code string is `[OPEN QUESTION]` (unconfirmed) but the UX shape (message + sign-in CTA, no silent auto-link, no generic failure) is fixed and may proceed to AC now.
- **Non-functional**: no raw server error text ever shown (NFR-004).

### UC-105: Token-invalid terminal states (expired / used / invalid)

- **Primary actor**: guest or signed-in visitor. **Preconditions**: preview or accept-submission resolves to one of the three known conditions.
- **Main success scenario**: exactly one of three distinct illustrations/copy blocks renders — expired, used, invalid — each with its own icon/color/title/body + a contact-office fallback chip; NO signup/join form is rendered in any of these three states.
- **Business rules**: an unrecognized/unmapped error condition falls back to the "invalid" variant's generic copy rather than a raw/blank error — never expose raw server error text to an unauthenticated public page (NFR-004).

### UC-106: Success + role-based redirect

- **Primary actor**: guest (post account-creation) or signed-in user (post-join). **Preconditions**: accept call (UC-102 or UC-103) returned success.
- **Main success scenario**:
  1. Success state renders: title "Chào mừng đến {school}!", the assigned role, and a redirect CTA "Vào trang chính".
  2. Redirect target is computed from the role/membership RETURNED by the server (via the follow-up `/users/me` call), reusing the existing post-login redirect rule (exactly 1 role → that workspace; multiple roles/tenants → `/select-role`) — never a role the client assumed before submission.
- **Business rules**: the preview response's `role` field (from UC-101) is informational/display-only and is NEVER used to compute the redirect — only the post-accept `/users/me` server truth is authoritative.

### UC-107: Switch account (signed-in branch escape hatch)

- **Primary actor**: signed-in user. **Preconditions**: signed-in branch (UC-103) is active.
- **Main success scenario**: user clicks "Đổi tài khoản?" → existing logout flow signs the user out (session cleared) → page re-renders the guest branch (UC-102) for the SAME token/URL, invitation context preserved (no re-navigation losing the token).
- **Exception flows**:
  - E1 — Logout call fails → user remains signed in, error shown, session NOT partially cleared (all-or-nothing).

## 4. Acceptance Criteria

```
UC-101: Resolve invitation token
  AC-101.1 Loading — Given navigation to /invitations/accept?token=X, When the preview call is in flight, Then a loading state renders within 320ms, distinct from the 3 error variants, the 4th conflict state, and success.
  AC-101.2 Success — Given the preview resolves with status=pending, Then the invitation summary (school, role, inviter, expiry) renders and the guest or signed-in branch renders next per session state.
  AC-101.3 Malformed token, no network call — Given the URL has no `token` param (or it is empty/malformed), Then the "invalid" variant (UC-105) renders immediately with ZERO network request issued.
  AC-101.4 Expired — Given the preview resolves with status=expired, Then the "expired" variant (UC-105) renders and no form is shown.
  AC-101.5 Used — Given the preview resolves with status=used (or "already accepted"), Then the "used" variant (UC-105) renders and no form is shown.
  AC-101.6 Invalid — Given the preview resolves with status=invalid/not-found, Then the "invalid" variant (UC-105) renders and no form is shown.
  AC-101.7 Network error — Given the preview call fails (network/5xx, no error.code), Then a generic error state distinct from the 3 terminal variants renders with a retry button; When retry is clicked, Then the preview call re-fires.
  AC-101.8 Unmapped error code — Given the preview returns an error code not in {expired, used, invalid}, Then the "invalid" variant's generic copy renders (never raw server text).
  AC-101.9 No client-side caching — Given the preview response is received, Then the raw token value is never written to localStorage/sessionStorage or logged, only held in the URL and transient component state.

UC-102: Guest creates account
  AC-102.1 Email locked — Given the guest branch renders, Then the email field is read-only/disabled with an aria-describedby hint explaining it is locked to the invite, and NO control (button, contentEditable, hidden input override) exists anywhere in the DOM to change it.
  AC-102.2 Empty name — Given the guest leaves fullName empty and attempts submit (or blurs the field), Then inline error "Vui lòng nhập họ tên." renders with role=alert, aria-invalid=true, aria-describedby referencing the error, and submit stays disabled.
  AC-102.3 Short password — Given password <6 characters, Then inline error "Mật khẩu tối thiểu 6 ký tự." renders (role=alert, aria-invalid, aria-describedby), submit stays disabled.
  AC-102.4 Submit enabled — Given fullName is non-empty and password ≥6 chars, Then the submit button becomes enabled.
  AC-102.5 SECURITY — no client-supplied role/tenantId — Given the guest submits the form, Then the outgoing accept request body contains EXACTLY the keys `token`, `fullName`, `password` and NO `role` key, NO `tenantId` key, and no other identity/authorization field, under any circumstance (including retried/re-submitted requests after a prior error) — this AC MUST be independently verified in code review (`fe-tech-lead-reviewer`) as ADR 0051 rule 2's primary privilege-escalation guard, not merely inferred from UI behavior.
  AC-102.6 Loading — Given submit is pending, Then the submit button shows aria-busy=true + spinner and is disabled to prevent double-submit; no optimistic success UI (e.g. no premature success message) renders before the response returns (NFR-001).
  AC-102.7 Success — Given the accept call succeeds, Then the account is created, session cookies are set via the exact login/decision-0018 code path (same server action code path, no new cookie-writing logic), a follow-up GET /users/me resolves the assigned role, and the success state (UC-106) renders using that server-returned role.
  AC-102.8 Race — token expired before submit — Given the token expires between preview-load and submit, Then the "expired" variant (UC-105) renders and the form is discarded (not shown alongside any partial state).
  AC-102.9 Race — token used before submit — Given the token was already used by the time of submit, Then the "used" variant (UC-105) renders and the form is discarded.
  AC-102.10 Account-conflict — Given the server responds with an email-already-exists condition, Then the 4th distinct state (UC-104) renders — NOT the expired/used/invalid illustrations — showing `invitations.accept.alreadyHaveAccount` + `invitations.accept.signInToJoin` copy/CTA.
  AC-102.11 Server validation error — Given the server returns 422 field errors beyond client checks, Then the corresponding field(s) show inline errors sourced from `error.fields[]`, the dialog/form remains editable, and no silent retry occurs.
  AC-102.12 Network error — Given the accept call fails on network/5xx, Then a generic error toast/state renders, fullName and password field values are preserved (not cleared) so the guest can retry without re-typing.

UC-103: Signed-in join
  AC-103.1 Single action — Given a signed-in user with a valid session lands on the page and the preview resolves pending, Then only the current signed-in email + a single "Tham gia {school}" button render — no name/password form fields exist in this branch.
  AC-103.2 SECURITY — no client-supplied role/tenantId/email — Given the signed-in user clicks "Tham gia", Then the outgoing accept request body contains EXACTLY the key `token` and NO `role`, `tenantId`, or `email` field — this AC MUST be independently verified in code review (same ADR 0051 rule 2 guard as AC-102.5).
  AC-103.3 Success — Given the join call succeeds, Then the invited tenant/role is added to the CURRENTLY signed-in account only, a follow-up membership/role refresh call resolves the new role, and the success state (UC-106) renders.
  AC-103.4 Email mismatch — Given the server rejects the join because the invitation's target email differs from the signed-in account's email, Then an explicit error message renders (not a silent success, not a silent auto-switch/auto-merge), and the "switch account" affordance (UC-107) is offered as the next step. [OPEN QUESTION — exact trigger/error-code unconfirmed per requirements.md OQ-2 / ADR 0051 Follow-Up; this AC's assertion (no silent success/merge) holds regardless of the eventual BE behavior, but exact copy/condition-detection needs BE confirmation before `/fe` implements.]
  AC-103.5 Already-member — Given the signed-in user already has a role in the invited tenant, Then a server-driven curated error renders verbatim (no client-side masking of the condition).
  AC-103.6 Loading — Given the join call is pending, Then the button shows aria-busy + spinner and is disabled.
  AC-103.7 Network error — Given the join call fails on network/5xx, Then a generic error toast renders, the button re-enables, and no membership change is assumed client-side.

UC-104: Account-conflict (email already exists)
  AC-104.1 Distinct state — Given a guest-accept submission returns the email-already-exists condition, Then the rendered state is visually/structurally distinct from all 3 token-error illustrations (UC-105) — it shows the "already have an account" message + sign-in CTA using i18n keys `invitations.accept.alreadyHaveAccount` / `invitations.accept.signInToJoin`.
  AC-104.2 No auto-link — Given this state renders, Then no account is auto-linked/merged and no session is silently established — the user must explicitly navigate to sign-in.
  AC-104.3 Sign-in CTA — Given this state renders, When the user clicks the sign-in CTA, Then they are navigated to the sign-in flow (existing login route), invitation token context not required to be preserved beyond this point (out of scope to auto-resume accept post-login).

UC-105: Token-invalid terminal states
  AC-105.1 Expired — Given the resolved condition is "expired", Then a distinct icon/color/title/body + contact-office fallback renders and no form (signup or join) is shown.
  AC-105.2 Used — Given the resolved condition is "used", Then a distinct icon/color/title/body + contact-office fallback renders (visually distinct from "expired") and no form is shown.
  AC-105.3 Invalid — Given the resolved condition is "invalid"/not-found/unmapped, Then a distinct icon/color/title/body + contact-office fallback renders (visually distinct from the other two) and no form is shown.
  AC-105.4 No raw error leakage — Given any of the 3 states (or the UC-104 conflict state) renders, Then no raw server error.message, stack trace, or error code string is ever displayed to the user.

UC-106: Success + role-based redirect
  AC-106.1 Success copy — Given accept succeeds (either branch), Then the success state shows "Chào mừng đến {school}!", the assigned role, and a "Vào trang chính" CTA.
  AC-106.2 Server-truth redirect — Given the success state renders, Then the redirect target is computed from the role returned by the post-accept `/users/me` (or membership refresh) call — never from the pre-accept preview response's `role` field.
  AC-106.3 Multi-role — Given the refreshed account now has multiple roles/tenants after joining, Then the CTA routes to `/select-role` per the existing post-login redirect rule (no new redirect rule invented for this flow).
  AC-106.4 Session established — Given success renders, Then the session cookies (`auth_token`, refresh, `auth_token_exp`, `sessionId`) are set via the exact same server-side code path as login (decision 0018) — verified by no new client-side cookie-writing code existing for this flow.

UC-107: Switch account
  AC-107.1 Success — Given the signed-in branch is active, When the user clicks "Đổi tài khoản?", Then the existing logout flow signs them out and the SAME token/URL re-renders the guest branch (UC-102), with the invitation summary intact (no re-fetch-losing-context).
  AC-107.2 Logout failure — Given the logout call fails, Then the user remains signed in, an error message renders, and the session is not partially cleared (no half-signed-out state).

Cross-cutting SECURITY AC (applies to the whole story, both UC-102 and UC-103)
  AC-SEC-1 — Given ANY accept request variant (guest or signed-in, including all retry/error-recovery paths), Then the request payload NEVER contains a `role` key or a `tenantId` key — role and tenant are resolved exclusively server-side from the invitation token record. This is verified as a mandatory `fe-tech-lead-reviewer` security-diff item per ADR 0051 rule 2, not merely an inferred behavior from the happy-path AC above.
  AC-SEC-2 — Given the accept flow completes (success or any error/terminal state), Then the raw invite token is never written to localStorage, sessionStorage, or any client-side log — it exists only in the URL query string and the in-flight request body for its lifetime on this page.
```

## 5. Edge Case Matrix

| Feature / UC | Empty | Max-length input | Concurrent action | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| UC-101 Preview | AC-101.3 (no token in URL) | N/A (token is opaque, not user-typed) | Two tabs open same accept link, one already used by the time the other previews → AC-101.5 "used" variant for the second tab | N/A (public, unauthenticated call) | AC-101.7 | N/A (public route, no role gate on preview itself) |
| UC-102 Guest create | AC-102.2 empty name | Very long fullName/password — no explicit max specified in requirements; [OPEN QUESTION] OQ-2.1 below | AC-102.9 (token used elsewhere between load and submit — the core race this story worries about) | N/A (guest has no session yet) | AC-102.12 | N/A (guest branch has no role concept pre-accept) |
| UC-103 Signed-in join | N/A (no empty-state concept, single button) | N/A | AC-103.4 (race: token used elsewhere), AC-103.5 (already a member) | Signed-in session itself expires mid-click → existing reactive-refresh/401 handling (decision 0018), not story-specific — [OPEN QUESTION] OQ-2.2 whether this needs bespoke copy here vs generic session-expired handling | AC-103.7 | Any of the 4 system roles may join (FR: "no specific role required") — this row is N/A by design |
| UC-104 Account conflict | N/A | N/A | Two guests race to create the same email account → second one hits AC-102.10 too (same state) | N/A | Treated as a business condition (E5), not a network error — no separate network-error variant for this specific code | N/A |
| UC-105 Token-invalid states | N/A (these ARE the "nothing to show" states) | N/A | N/A (terminal, no further action possible from this page besides contact-office) | N/A | AC-101.7 distinguishes network error from these 3 semantic states | N/A |
| UC-106 Success/redirect | N/A | N/A | N/A | Redirect target session must still be valid — session was JUST established in this same request, so not applicable | N/A (this is post-success) | AC-106.3 multi-role → /select-role instead of assuming single workspace |
| UC-107 Switch account | N/A | N/A | Logout invalidates session concurrently used by another tab → out of scope for this story (standard multi-tab logout behavior) | AC-107.2 (logout call itself fails) | AC-107.2 covers this via "logout call fails" | N/A |

## 6. Open Questions

- `[OPEN QUESTION]` OQ-1 (carried from requirements.md): password min-6-chars is fixed by ADR 0051 as the current baseline — no further action needed here, but flagged for awareness that it may need revisiting if a stronger registration password policy is introduced later.
- `[OPEN QUESTION]` OQ-2 (carried from requirements.md, unresolved by ADR 0051's own Follow-Up + integration.md): exact BE behavior when the signed-in user's session email differs from the invitation's target email (AC-103.4) — hard reject vs conditional allow. AC-103.4 is written to hold under either outcome (no silent success/merge either way), but the precise trigger condition/error code and UX copy detail must be confirmed before `/fe` implements this specific branch. Do not let `/fe` guess.
- `[OPEN QUESTION]` OQ-3 (carried from integration.md): exact BE error code for `USER_EMAIL_ALREADY_EXISTS` on guest accept (AC-102.10/UC-104) is unconfirmed — the UX shape is fixed by ba-lead's decision, but the FE cannot wire the mapper until the exact code string is confirmed against `iam` ERROR_CODES.md.
- `[OPEN QUESTION]` OQ-2.1 (new, this pass): is there a client-side max-length on fullName/password fields for the guest form? Not specified in requirements.md — recommend a reasonable UX cap (e.g. 100 chars fullName) but flag to `ba-lead`/design before `/fe` hardcodes a number not in the design-spec.
- `[OPEN QUESTION]` OQ-2.2 (new, this pass): if the signed-in user's OWN session expires mid-flow (distinct from the invitation token expiring), does this screen need bespoke messaging, or does the existing generic 401/reactive-refresh handling (decision 0018) suffice silently? Recommend the latter (no new UX) unless `ba-lead` says otherwise — flagging so `/fe` doesn't invent a special case unprompted.
- Carried over from `integration.md` §5 (contract-shape questions, block `/fe` implementation but not this AC pass): INT-001 preview endpoint path/method unconfirmed; new failure-union codes (`INVITATION_EXPIRED`/`INVITATION_USED`/`INVITATION_INVALID`) need confirmation against BE; signed-in-join response shape (empty vs inline membership data) unconfirmed.

## 7. Ground-Truth Correction (fe-lead, 2026-07-18) — SUPERSEDES UC-101/102/104 above

Read directly against `edu-api` Go source before implementation (per
`api-integration.md`'s mandate to prefer source over inferred shapes) —
`services/iam/internal/membership/adapter/http/{routes.go,invitation_handler.go,
dto/invitation_dto.go}` + `core/application/usecase/accept_invitation.go` +
`core/domain/{entity/invitation.go,valueobject/invitation.go}` +
`docs/ERROR_CODES.md`. Full finding + rationale: ADR `0059` (amends `0051`).
This section is authoritative over UC-101/102/104 and their AC above, which
are **historical/superseded**, kept for audit trail only:

- **UC-101 (preview) does not exist and is dropped.** No `GET .../invitations/
  preview` route (or any GET route) exists on `iam`'s invitation surface —
  only invite/revoke/accept (`routes.go`). The invite token is a fully opaque
  256-bit random value (`invitation_token_codec.go`), so no client-side
  decode is possible either. There is no pre-action summary card. AC-101.1
  through AC-101.9 do not apply.
- **UC-102 (guest creates account) does not exist and is dropped.**
  `POST /api/v1/invitations/accept` requires `RequireAuth` (Bearer JWT); its
  body (`dto.AcceptRequest`) is `{token}` only — no `fullName`/`password`
  field exists anywhere in the DTO or use-case input. The use case
  (`accept_invitation.go`) only creates a tenant `Member` for the
  ALREADY-authenticated caller (`ActorUserID`/`ActorEmail` from verified JWT
  claims) — it never creates a user account. AC-102.1 through AC-102.12 do
  not apply (no such branch exists to build).
- **UC-104 (account-conflict) is unreachable and is dropped.** It modeled a
  `USER_EMAIL_ALREADY_EXISTS` response from account-creation-via-accept,
  which cannot occur since accept never creates an account. AC-104.1–.3 do
  not apply.
- **NEW UC-101': Auth-gate for an unauthenticated visitor.** Primary actor:
  guest (no session). The page renders directly (no preview/loading step) to
  an informational state: "Bạn cần đăng nhập để tham gia lời mời này" +
  a plain link to `/login` (no `returnTo` param — the visitor re-opens the
  SAME emailed link, which still carries `?token=`, after signing in
  manually; see ADR `0059` Alternative 2 for why `returnTo` is deliberately
  not added to the shared login flow in this story). No form fields, no
  password, no email display (there is no server-resolved invitation data to
  show pre-action).
- **UC-103 (signed-in join) is CONFIRMED, real, and is now the entire
  actionable surface** — unchanged in shape from the original UC-103 (single
  "Tham gia" action, `{token}` only body), but its follow-up mechanics are
  corrected: on success, session refresh reuses
  `IIamMemberRepository.switchTenant(tenantId, clientId)` (the SAME method
  `select-tenant/actions.ts` already calls) — minting a tenant-scoped token
  for the server-returned `tenantId` from `MemberResponse` — rather than a
  `GET /users/me` follow-up (there is no need to re-derive role; `accept`'s
  own response already returns `roles[]` for the newly joined tenant).
  AC-103.1/103.6/103.7 hold as written. AC-103.2 holds as written (still the
  primary privilege-escalation guard — now the ONLY code path, not one of
  two). AC-103.3 is corrected: "assigned role" comes directly from the
  `accept` response (`MemberResponse.roles`), reused as the `switchTenant`
  redirect role, no separate `/users/me` call needed. AC-103.4 (email
  mismatch) is corrected from `[OPEN QUESTION]` to CONFIRMED: BE returns
  `invitation_email_mismatch` (403) whenever the authenticated caller's own
  verified email differs from the invited address (F8, hard reject, no
  conditional-allow branch exists) — the switch-account affordance (UC-107)
  is offered exactly as originally specified. AC-103.5 (already-member) —
  BE-side idempotency behavior on re-accepting when already an ACTIVE member
  of that tenant is not separately coded in `accept_invitation.go` (it will
  attempt to re-`Save` the member, likely succeeding as a no-op or upserting)
  — no distinct "already member" error code was found; treat any non-listed
  error as the network/5xx generic path rather than inventing a specific
  "already member" copy block.
- **UC-105 (token-invalid states) is corrected to TWO states, not three.**
  `invitation_invalid` (410) covers unknown/already-used/revoked as ONE code
  (`ERROR_CODES.md` line 116); `invitation_expired` (410) is separate. AC-105.2
  ("used", a distinct 3rd illustration) is dropped — a used token renders the
  SAME "invalid" state as a not-found/revoked token, not a 3rd illustration.
  AC-105.1 (expired) and AC-105.3 (invalid, now also covering "used") hold;
  AC-105.4 (no raw error leakage) holds unchanged.
- **UC-106 (success) is corrected**: redirect target comes from the
  `switchTenant` mint (point above), not a `/users/me` follow-up; multi-role
  handling within the JUST-joined tenant reuses the same `role ? /${role} :
  /` pattern `switch-tenant/actions.ts` already uses (no new `/select-role`
  branch is introduced by this story — that existing rule is for
  multi-TENANT accounts at login time, a different concern from a single
  tenant's multi-role membership).
- **UC-107 (switch account) is unchanged** — still logout + re-render the
  (new) auth-gate state (UC-101') for the same token/URL.
- **Net use-case set for implementation**: UC-101' (auth-gate, new) ·
  UC-103 (signed-in join, corrected mechanics) · UC-105 (2 terminal states,
  corrected) · UC-106 (success, corrected redirect source) · UC-107
  (switch account, unchanged). UC-101/102/104 are dropped entirely.
