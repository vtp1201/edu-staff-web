# TR-021.2 — Public Invitation Accept Onboarding (HIGH-RISK)

Source: `docs/design-requests/DR-015-tenant-invitations.md` (Scope §"Public
'Chấp nhận lời mời'"), `docs/product/design-spec.jsonc` → `screens.inviteAccept`
(line ~4315), `docs/product/screens.md` row "Accept tenant invitation",
`.claude/rules/api-integration.md` (auth flow: register/signin contract,
token hybrid decision 0018), `docs/product/roles-permissions.md`,
`iam` service `POST /api/v1/invitations/accept`.

**Lane: high-risk.** This is an **unauthenticated public route** that
performs account creation (new-user branch) or tenant-join (existing-user
branch), assigns a role + tenant, and mints an authenticated session — all
flags apply: Auth, Authorization (role/tenant assignment), External-systems
(email — invite delivery is a precondition, out of this screen's scope but
its output token is this screen's sole input), Public-contract (unauthenticated
endpoint). **Flag to `ba-lead` for ADR**: token handling / account-creation-
via-public-link is a new auth pattern in this codebase (existing patterns are
signin, social-auth, forgot-password/reset — none of which create an account
or assign a role from an unauthenticated request) — recommend an ADR
capturing the accept-flow contract before/alongside implementation.

## 1. Requirements Summary

At `/invitations/accept?token=...` (public, no auth/tenant shell — same
2-column layout family as `/login`), a visitor presents an opaque invite
token. The system shows the invited school/role/inviter/expiry, then branches
on session state: **guest** (no active session) sees a shortened signup form
(email locked/read-only from the invite, name + password required) whose
submission creates a new account, joins them to the invited tenant with the
invited role, and establishes an authenticated session (same token
storage/cookie convention as login — decision 0018); **signed-in** (active
session, any account) sees a single "Join" action that adds the invited
tenant/role to their existing account. Three token-invalid variants (expired /
used / invalid) each render a distinct explanation + contact-office fallback,
no form. Success state confirms the role/tenant and offers a role-based
redirect. Actors: unauthenticated visitor (guest) and any authenticated user
(any of the 4 system roles) hitting the link while signed in. Key constraint:
**all token validation, expiry enforcement, single-use enforcement, and
role/tenant authorization decisions are made server-side (BE `iam`)** — this
spec defines what the FE sends, receives, and renders, not how tokens are
validated or signed.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-021.2",
  "title": "Public Invitation Accept Onboarding",
  "status": "Draft",
  "actors": [
    {
      "role": "guest (unauthenticated visitor, pre-account)",
      "capabilities": [
        "view invitation summary (school/role/inviter/expiry) from token",
        "submit name + password to create an account bound to the invited email",
        "switch to sign-in if they already have an account"
      ]
    },
    {
      "role": "any authenticated role (teacher|principal|student|parent) already signed in",
      "capabilities": [
        "view invitation summary while signed in as their current email",
        "join the invited tenant/role with a single action",
        "switch account (sign out, return to guest branch) before joining"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL read the `token` query parameter on mount and call POST /api/v1/invitations/accept (or an equivalent token-lookup/preview call, per ba-integration-analyst) to resolve invitation summary data (school, invited role, inviter name/title, expiry) before rendering the form.",
      "trigger": "Page load at /invitations/accept?token=...",
      "preconditions": ["token query param present"],
      "postconditions": ["Invitation summary rendered, OR one of the 3 error variants rendered"],
      "errorConditions": [
        "token missing/malformed -> invalid-token error state (FR-006), no network call attempted, or server returns invalid",
        "token lookup fails (network) -> generic loading/error, distinct from the 3 token-semantic error states"
      ]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL render the invited email as a read-only, locked field in the guest signup form, sourced only from the server-resolved invitation data — the FE SHALL NOT expose any control to edit, retype, or override this email value.",
      "trigger": "Guest branch renders (no active session)",
      "preconditions": ["Token resolved successfully, invitation status = pending/valid"],
      "postconditions": ["Email field is read-only with a describedby hint explaining it is locked to the invite"],
      "errorConditions": []
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL require full name (non-empty) and password (min 6 characters per current copy/design-spec) in the guest form, with inline validation errors (role=alert, aria-invalid, aria-describedby), before enabling submit.",
      "trigger": "Guest types in name/password fields",
      "preconditions": ["Guest branch active"],
      "postconditions": ["Submit enabled only when both fields pass client-side validation"],
      "errorConditions": [
        "Empty name -> 'Vui lòng nhập họ tên.'",
        "Password < 6 chars -> 'Mật khẩu tối thiểu 6 ký tự.'"
      ]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL submit the guest form as a single accept-invitation request carrying {token, fullName, password} — and SHALL NOT include any client-supplied role or tenantId field; role and tenant are determined entirely server-side from the token record.",
      "trigger": "Guest submits the completed form",
      "preconditions": ["Client-side validation passed"],
      "postconditions": [
        "On success: account created, tenant/role attached exactly as encoded in the invitation, session established (tokens stored per decision 0018 httpOnly-cookie convention, same as login), success state rendered",
        "Invitation record is marked consumed/used server-side (single-use enforced by BE, not re-checked client-side)"
      ],
      "errorConditions": [
        "Token expired between load and submit -> expired-token error state (FR-006), form discarded",
        "Token already used (race: accepted elsewhere concurrently) -> used-token error state (FR-006)",
        "Server-side validation error (e.g. password policy mismatch beyond client check) -> inline field error via server-returned field, do not silently retry",
        "Network/5xx -> generic error toast/state, form data preserved so user can retry submit"
      ]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL, when a session already exists (signed-in branch), display the current signed-in email and a single 'Tham gia {school}' action that submits {token} bound to the CURRENT authenticated session — the FE SHALL NOT allow this action to silently create a second account or merge/reassign the invitation to a different email than the one in the active session without explicit user action.",
      "trigger": "Page loads and an active/valid session is detected",
      "preconditions": ["Active authenticated session present", "Token resolved, invitation valid"],
      "postconditions": ["Tenant/role added to the CURRENTLY signed-in account only, on success"],
      "errorConditions": [
        "Server rejects join because the invitation's email does not match the signed-in account's email (or any other business rule) -> the system SHALL surface this as an explicit error to the user, never proceed as if it succeeded, and SHALL NOT auto-switch or auto-merge accounts",
        "Signed-in user already has a role in the invited tenant -> server-driven error surfaced verbatim, no client-side masking"
      ]
    },
    {
      "id": "FR-006",
      "priority": "Should",
      "description": "The system SHALL provide a 'switch account' affordance in the signed-in branch that signs the current user out (clearing their session per existing logout flow) and returns to the guest branch for the SAME token/URL, without losing the invitation context.",
      "trigger": "Signed-in user clicks 'Đổi tài khoản?'",
      "preconditions": ["Signed-in branch active"],
      "postconditions": ["User is signed out; page re-renders guest branch for the same token"],
      "errorConditions": ["Logout call fails -> remain signed in, show error, do not partially clear session"]
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL render exactly one of three distinct token-error states — expired, used, invalid — each with its own icon/color/title/body/contact-office fallback, whenever the server reports the corresponding condition; the system SHALL NOT render the signup/join form in any of these states.",
      "trigger": "Token resolution or accept-submission returns an expired/used/invalid condition",
      "preconditions": [],
      "postconditions": ["No form rendered; only the matching error illustration + guidance + school-contact chip"],
      "errorConditions": [
        "Server returns an error condition not mapped to one of the 3 known variants -> fall back to the 'invalid' variant generic copy rather than a raw/blank error (never expose raw server error text to an unauthenticated public page)"
      ]
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL render a success state on successful accept (title 'Chào mừng đến {school}!', the assigned role, and a role-based redirect CTA 'Vào trang chính') and SHALL redirect/link to the workspace matching the role just assigned (per roles-permissions.md role-to-route mapping), not a role the client assumed beforehand.",
      "trigger": "Accept-invitation request succeeds (guest or signed-in branch)",
      "preconditions": ["Accept call returned success with the assigned role"],
      "postconditions": ["User has a valid session scoped to the new tenant/role and can navigate to their workspace"],
      "errorConditions": []
    },
    {
      "id": "FR-009",
      "priority": "Must",
      "description": "The system SHALL NOT persist or expose the raw invite token anywhere client-readable beyond the current page's query string and the in-flight accept request body (no localStorage/sessionStorage caching of the token, no logging of the token value).",
      "trigger": "Any point during page lifecycle",
      "preconditions": [],
      "postconditions": ["Token only lives in the URL and transient request payload"],
      "errorConditions": []
    },
    {
      "id": "FR-010",
      "priority": "Should",
      "description": "The system SHALL show a loading state while the initial token-resolution call is in flight, distinct from the 3 terminal error states and the eventual form/success state.",
      "trigger": "Page mount, token-lookup request pending",
      "preconditions": [],
      "postconditions": ["Loading indicator replaced by form, signed-in view, error variant, or success on resolution"],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Security",
      "requirement": "Token single-use and expiry enforcement is authoritative server-side (BE iam); the FE MUST treat every accept-submission response as the source of truth and MUST NOT optimistically assume success before the response returns, given the state-changing (account-creating) nature of this action.",
      "measurableTarget": "Zero client-side logic that marks an invitation as consumed/valid without a corresponding successful server response"
    },
    {
      "id": "NFR-002",
      "category": "Security",
      "requirement": "The invited email is immutable in the FE for the guest branch (read-only field, no client-side override); the invited role/tenant is never sent by the client on submit (no hidden role/tenantId form field) — this SHALL be verified in code review as a security-critical check preventing client-supplied-role privilege escalation.",
      "measurableTarget": "Accept-invitation request payload contains only {token, fullName, password} (guest) or {token} (signed-in) — no role/tenantId field present in any request variant"
    },
    {
      "id": "NFR-003",
      "category": "Security",
      "requirement": "On successful accept, session/token storage follows the existing hybrid convention (decision 0018): tokens in httpOnly cookies set server-side, never readable/writable by client JS; no new token-storage mechanism introduced for this flow.",
      "measurableTarget": "Same cookie-setting code path as login (server action sets auth_token/auth_token_exp httpOnly), verified by not introducing any document.cookie or localStorage token write"
    },
    {
      "id": "NFR-004",
      "category": "Security",
      "requirement": "Error states MUST NOT leak internal/raw BE error messages, stack traces, or token contents to the unauthenticated page; only the 3 curated copy variants (expired/used/invalid) or a generic fallback are shown.",
      "measurableTarget": "No raw error.message/server exception text ever rendered on this public route"
    },
    {
      "id": "NFR-005",
      "category": "Accessibility",
      "requirement": "Email read-only field has an aria-describedby hint explaining the lock; all form errors use role=alert + aria-invalid + aria-describedby; expiry countdown text is never color-only.",
      "measurableTarget": "WCAG 2.1 AA; contrast >=4.5:1 body text, >=3:1 large/bold text and icons"
    },
    {
      "id": "NFR-006",
      "category": "Responsive",
      "requirement": "Brand panel (left, 42%) hides below 900px per design-spec; content card remains fully usable down to 320px width.",
      "measurableTarget": "No layout break/clipping at 320/375/768/1280px"
    },
    {
      "id": "NFR-007",
      "category": "i18n",
      "requirement": "All copy sourced from `invitations.accept.*` namespace in messages/{vi,en}.json; contact-office phone/email are interpolation params, not baked strings.",
      "measurableTarget": "100% of user-facing strings via t('invitations.accept....') in both locales"
    },
    {
      "id": "NFR-008",
      "category": "Performance",
      "requirement": "Initial token-resolution loading state must appear promptly to avoid a blank public-facing page (first impression for a new user).",
      "measurableTarget": "Loading state visible within <=320ms of navigation"
    }
  ],
  "uiStates": ["loading", "error (expired|used|invalid — 3 variants)", "form (guest)", "form (signed-in)", "success"],
  "dataDependencies": [
    { "source": "iam", "entity": "Invitation (token resolve/lookup)", "sensitivity": "Confidential" },
    { "source": "iam", "entity": "Invitation accept (POST /invitations/accept — account creation / tenant-join)", "sensitivity": "Restricted" },
    { "source": "iam", "entity": "Session/auth token issuance on accept success", "sensitivity": "Restricted" }
  ],
  "scope": {
    "inScope": [
      "Public /invitations/accept?token=... route rendering, both guest and signed-in branches",
      "Client-side field validation (name required, password >=6 chars) as a UX convenience layer only",
      "Rendering server-driven token states: valid/pending, expired, used, invalid, success",
      "Sending {token, fullName, password} or {token} to the accept endpoint; never sending role/tenantId",
      "Session establishment on success following existing decision-0018 cookie convention",
      "Role-based post-success redirect using the role returned by the server"
    ],
    "outOfScope": [
      "Token generation, signing, expiry calculation, single-use tracking logic (all BE/iam responsibility)",
      "Email delivery of the invite link (BE/noti responsibility; precondition to this screen, not part of it)",
      "Admin-side invitation management (covered by US-E21.1)",
      "Password strength/complexity enforcement beyond the min-6-chars client hint — any richer policy is a BE/security decision, not decided here",
      "Merging two distinct existing accounts by email (explicitly not supported by this flow)"
    ],
    "externalDependencies": [
      "iam service: POST /api/v1/invitations/accept (and/or a token-preview GET, to be confirmed with ba-integration-analyst)",
      "Existing auth session infrastructure (bootstrap/lib/http.server.ts, auth-token.server.ts) for establishing the post-accept session identically to login"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] The min-6-character password rule in DR-015 copy is the CURRENT policy for this flow because no stronger password policy exists elsewhere in the codebase today (no register/signup use-case found in src/features/auth; reset-password/login flows do not define a client-side minLength either) — if a stricter policy is introduced later (e.g. via a future registration epic), this requirement must be revisited to stay consistent, flagged as OQ-1.",
    "[ASSUMPTION] POST /api/v1/invitations/accept is a single endpoint handling both token-resolution-for-display AND the final accept action is NOT assumed — the spec treats resolve (read) and accept (write) as potentially two calls; ba-integration-analyst to confirm exact BE shape (one endpoint with GET-like preview vs two).",
    "[ASSUMPTION] 'Signed-in' detection reuses the existing session-check mechanism already used elsewhere in the app shell (httpOnly cookie presence checked server-side / via an existing 'me' call) — no new session-detection mechanism is introduced for this screen.",
    "[ASSUMPTION] Role-based redirect after success reuses the existing post-login redirect logic (per roles-permissions.md: exactly 1 role -> that workspace; if the account now has multiple roles across tenants -> /select-role), not a new redirect rule invented for this flow."
  ],
  "openQuestions": [
    "OQ-1: Is min-6-char password acceptable long-term security policy for account creation via public link, or should this align with a to-be-defined stronger registration password policy? Recommend flagging to ba-lead for an ADR given this is the FIRST account-creation-from-public-link flow in the codebase.",
    "OQ-2: When a signed-in user's session email differs from the invitation's target email, what is the exact BE behavior — hard reject, or does BE allow joining a tenant with a DIFFERENT email than the invite targeted? This determines whether FR-005's error path is 'always rejected' or 'sometimes allowed' and must be confirmed before AC are written (do not assume either direction).",
    "OQ-3: Does the accept endpoint return the newly assigned role(s) inline in its response (needed for FR-008's role-based redirect), or does the FE need a follow-up 'me'/session-refresh call after accept to learn the role? Affects whether a second network round-trip is required before redirect."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | Resolve token, show invitation summary | Must | Entry point of the whole flow; nothing renders correctly without it |
| FR-002 | Email locked/read-only in guest form | Must | Security-critical — prevents attacker from redirecting the account to a different email than invited |
| FR-003 | Client-side name/password validation | Must | Baseline UX + a11y (inline errors); server remains authoritative |
| FR-004 | Guest submit -> account create + join, no client role/tenant fields | Must | Core account-creation path; the no-client-role-field rule is the primary privilege-escalation guard |
| FR-005 | Signed-in single-action join, no silent merge | Must | Prevents silent account merge/hijack — explicit high-risk concern from intake |
| FR-006 | Switch-account affordance | Should | Improves UX for a mistaken session but not required for the flow to be safe/functional |
| FR-007 | 3 distinct token-error states, no form shown | Must | Explicit DR-015 requirement; also a security boundary (no form access on invalid token) |
| FR-008 | Success state + role-based redirect from server-assigned role | Must | Prevents redirecting to a role the client merely assumed (must reflect server truth) |
| FR-009 | No client-side token persistence/logging | Must | Confidential/Restricted data handling baseline for a bearer-style secret token |
| FR-010 | Loading state during token resolution | Should | UX polish; absence would show blank page, not a functional break |

## 4. Handoff Notes

- **For `ba-integration-analyst`**: resolve OQ-3 first (single accept call vs
  resolve+accept two calls) — this shapes the entire data-fetching design.
  Confirm the exact response envelope of `POST /api/v1/invitations/accept`
  (does it return `{accessToken, refreshToken, sessionId}` matching the
  existing `TokenResponse` shape from `signin`, per `.claude/rules/api-integration.md`
  Auth flow section, so the same DI/session-establishment code path can be
  reused rather than duplicated?). Confirm how the 3 error variants
  (expired/used/invalid) are distinguished in the error envelope — by
  `error.code` (preferred, per api-integration.md's "branch by code not
  message" rule) — list the exact `USER_NOT_FOUND`-style codes expected.
- **For `ba-use-case-modeler`**: needs Given/When/Then for both branches
  (guest, signed-in) crossed with all terminal states (success, 3 errors),
  plus the race condition in FR-004 (token expires/gets used between page
  load and submit) and the account-mismatch case in FR-005 (OQ-2) — do not
  assume the answer, write the AC to cover both possible BE behaviors until
  OQ-2 is confirmed, or block that specific AC pending the answer.
- **Escalate to `ba-lead` for ADR consideration**: this is the first
  "create-account-from-unauthenticated-public-link" pattern in edu-staff-web.
  Recommend an ADR (next available number, >= 0023 per instructions — note
  current highest observed in this repo is already past 0049 per
  `.claude/rules/design-system.md` references, so confirm the actual next
  free number with `ba-lead`/`harness-cli decision list` before assigning)
  covering: (a) the accept-endpoint contract and error-code catalogue, (b)
  the password-policy question (OQ-1), (c) confirmation that session
  establishment reuses the exact login/decision-0018 cookie mechanism with no
  new client-side token exposure.
- **Soft sequencing note**: US-E21.2 is testable/demoable independently (a
  valid token can be constructed by BE/QA for testing) but is only
  *meaningfully* end-to-end usable once US-E21.1 ships the invite-generation
  surface that produces real tokens. No hard technical blocking dependency;
  document this ordering for planning purposes only.
