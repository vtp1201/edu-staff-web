# US-E22.1 — Integration Map (iam)

Source contract: `edu-api/services/iam/docs/openapi.yaml` (lines ~807–845,
1185–1192, 1373–1401) + `INTEGRATION.md` (endpoint table row 178–179, footnote
⁸) + `ERROR_CODES.md` (§"user — Credential recovery (US-030)"). Service:
**iam** (per `.claude/rules/api-integration.md` service map — auth/profile).

## 1. Integration Overview

- **Endpoints touched: 3** — 1 existing (`GET /users/me`, extended with one
  new field to consume) + 2 new (send/resend verification, confirm OTP).
- **Service: `iam`** only. No `core`/`lms`/`social` involvement.
- **Status: all REAL** — iam has shipped all three endpoints
  (`openapi.yaml` §807–845; `ERROR_CODES.md` §"Credential recovery (US-030)").
  This is **not** a mock-first integration; no `bootstrap/lib/mock.ts` entry
  needed.
- **Risk notes:**
  1. The web's current `UserProfileResponseDto`
     (`src/features/auth/infrastructure/dtos/user-profile-response.dto.ts`)
     is missing the `isEmailVerified` field that iam's `UserProfileResponse`
     schema already returns (openapi.yaml line 1386). This is an **FE-side gap
     to close in this story**, not a BE contract gap — no ADR needed, just add
     the field to the DTO/entity/mapper (see §4).
  2. **Pre-existing field-name drift** between the web's `UserProfileResponseDto`
     (`id`/`name`/`avatar`/`roles[]`) and iam's documented `UserProfileResponse`
     schema (`userId`/`fullName`/`avatarUrl`/single `role` + separate
     `status`/`mfaEnabled`/`dob`/timestamps) — this predates US-E22.1 and is
     out of this story's scope, but flagging it because it means `GET /users/me`
     as consumed today may go through a gateway/BFF transform not visible in
     this repo, or the DTO is stale. **[OPEN QUESTION → ba-lead]**: confirm
     whether `auth.repository.ts`'s existing `/users/me` mapping is verified
     against a live iam response, since this story adds one more field to that
     same DTO and inherits whatever transform is (or isn't) happening.
  3. Confirm endpoint returns **204 no body** (not a fresh user object) — the
     UI must locally flip `emailVerified: true` on success rather than
     re-fetching `/users/me` (though a refetch is also valid and safer against
     drift — see §2 INT-003 for both options).

## 2. Endpoint Catalogue

### INT-001 — Get current profile (existing, extend consumption)

```
Service: iam                          Method+Path: GET /iam/api/v1/users/me
Status: REAL (openapi.yaml line 1373 UserProfileResponse; INTEGRATION.md row 176)
Protected: yes                        Role required: any authenticated user (account-level)
Request (outbound): none (Bearer header only)
Response payload (inbound, after envelope unwrap):
  - id — user id | Internal
  - email — account email (shown read-only, immutable per FR-008) | PII
  - name — display name | PII
  - avatar — avatar URL or null | PII (low sensitivity)
  - roles[] — tenant/role memberships | Internal
  - emailVerified — NEW field this story must add, sourced from BE's
    `isEmailVerified: boolean` (openapi.yaml line 1386) | Internal
Pagination: none
Errors → UI behavior:
  - 401 UNAUTHORIZED_ACCESS / TOKEN_EXPIRED → handled by existing session/refresh
    flow (decision 0018), not a new concern for this story
  - transport/5xx → existing shell error handling; per FR-001 the banner
    "SHALL NOT render" while verification status is unresolved/unknown
    (fail-closed — do not show a wrong badge)
Empty / loading expectation:
  - Per NFR-006, this MUST NOT be a new blocking round-trip — reuse the
    session/user data already fetched for the shell. Banner and Profile-row
    badge both read the same `emailVerified` field once resolved; while
    unresolved, banner stays hidden (FR-001) and the Profile row shows the
    email value without a badge (FR-007 error/loading branch), not a stale one.
```

### INT-002 — Request/resend email verification code

```
Service: iam                          Method+Path: POST /iam/api/v1/users/me/email/verification
Status: REAL (openapi.yaml line 807; INTEGRATION.md footnote ⁸)
Protected: yes                        Role required: any authenticated user
Request (outbound): none (Bearer header only — no body)
Response payload (inbound, after envelope unwrap): none — 204, no body.
  Success is signaled by HTTP 204 alone; the server action/use-case returns
  `{ ok: true }` (mirrors existing VoidResult pattern in
  `i-auth.repository.ts`), not a data payload.
Pagination: none
Errors → UI behavior:
  - 401 UNAUTHORIZED_ACCESS → session expired; defer to existing auth/refresh
    handling, do not show an email-verify-specific error
  - 429 (rate-limited) → **[INFERRED, not explicit in this endpoint's openapi
    entry]**. iam's shared transport rate-limit (`rate_limit_exceeded` per-IP,
    `ERROR_CODES.md` §"transport") and lockout (`too_many_attempts`) middleware
    apply broadly to `/v1/auth/*`-style routes per `INTEGRATION.md`; the
    `/users/me/email/verification` route is NOT explicitly listed under that
    footnote, so whether IAM also rate-limits resend server-side (distinct
    from the UI's 60s client cooldown) is **[OPEN QUESTION → ba-lead, flag for
    iam BE team confirmation]**. Assume yes per standard security practice —
    if a 429 arrives, map to the existing `too-many-requests` AuthFailure type
    (already in `auth.failure.ts` + `CODE_MAP` in
    `auth-failure.mapper.ts` for `RATE_LIMIT_EXCEEDED`/`USER_TOO_MANY_ATTEMPTS`)
    and surface the BE `Retry-After` hint if the header is present, else a
    generic "try again shortly" copy (per FR-003 errorConditions). Do NOT start
    the 60s cooldown on a 429 response.
  - transport/5xx or no response → generic retryable error state (FR-003);
    cooldown SHALL NOT start
  - Idempotent 204 no-op if already verified (openapi.yaml line 813) — the UI
    should treat this exactly like a normal successful send (banner → "sent"
    state, cooldown starts); there is no distinct error code for
    "already verified" to branch on, so no special handling needed beyond the
    happy path
Empty / loading expectation:
  - Button shows a brief pending/disabled state while in flight (no full-page
    spinner); on success start the 60s client-side cooldown timer (see §3).
```

### INT-003 — Confirm email verification (OTP submit)

```
Service: iam                          Method+Path: POST /iam/api/v1/users/me/email/verification/confirm
Status: REAL (openapi.yaml line 823; INTEGRATION.md footnote ⁸)
Protected: yes                        Role required: any authenticated user
Request (outbound, camelCase):
  - otp — 6-digit numeric string, pattern ^[0-9]{6}$ (openapi.yaml
    ConfirmEmailVerificationRequest, line 1185) | Confidential (OTP code,
    NFR-008: never logged/persisted beyond input-field state)
Response payload (inbound, after envelope unwrap): none — 204, no body
  (openapi.yaml line 837). This mirrors the codebase's existing
  `resetPassword` OTP-confirm precedent
  (`src/features/auth/domain/use-cases/reset-password.use-case.ts` +
  `IAuthRepository.resetPassword` → `VoidResult`), NOT the signin-style
  "confirm returns a fresh session/profile" shape. **Two valid UI options,
  both consistent with the envelope contract:**
    (a) treat success as a local flip: repository returns `{ ok: true }`,
        use-case/action returns success, presentation optimistically sets
        `emailVerified = true` on the VM (banner disappears, Profile badge
        flips) without a refetch — simplest, matches FR-006's literal wording
        ("verified=true propagated to Profile VM and shell banner");
    (b) same `{ ok: true }` but the use-case triggers a `GET /users/me`
        refetch (INT-001) to re-derive `emailVerified` from source-of-truth —
        safer against drift if another tab/session also mutates it, at the
        cost of one extra round-trip.
    Recommend (a) per NFR-006's "no added blocking request" spirit, but this
    is an implementation choice for `fe-state-engineer`, not fixed here.
Pagination: none
Errors → UI behavior (this is the DISTINCT wrong-vs-expired mapping FR-006
requires — confirmed satisfiable from iam's existing, already-distinct codes;
no BE change needed):
  - `USER_INVALID_OTP` (400, `ERROR_CODES.md`: "wrong, unknown, or already
    used") → map to existing `AuthFailure` type `{ type: "invalid-otp" }`
    (already in `auth.failure.ts` + `CODE_MAP`) → dialog errorKey
    `emailVerify.dialog.errorWrongCode`; inline error text
    (`--edu-error-text`) + `aria-invalid` on the OTP group; code input stays
    editable; per FR-006 this is DISTINCT from expired
  - `USER_OTP_EXPIRED` (400, "validity window elapsed — 15m for verify") →
    map to existing `{ type: "otp-expired" }` → dialog errorKey
    `emailVerify.dialog.errorExpiredCode`; show the expired message AND
    surface the Resend action per FR-006
  - `USER_TOO_MANY_ATTEMPTS` (429, "failed-attempt cap of 5 reached; code
    locked") → map to existing `{ type: "too-many-requests" }` → dialog shows
    a distinct "too many attempts, request a new code" message (surface
    Resend, same as expired-code UX) — **note this is a THIRD distinct state
    beyond the two named in FR-006/DR-016; flag to
    `ba-use-case-modeler`/`ba-spec-writer`** so the dialog's AC covers it
    explicitly rather than falling into a generic bucket
  - 401 UNAUTHORIZED_ACCESS → session expired; defer to existing auth/refresh
    handling
  - 422 VALIDATION_FAILED (malformed 6-digit pattern, client should normally
    prevent this via the OtpInput component) → generic retryable error,
    code preserved for resubmission (FR-006 "Transport/5xx failure" bucket
    also covers this)
  - transport/5xx or no response → generic retryable error state, code
    preserved for resubmission (FR-006)
Empty / loading expectation:
  - Confirm button pending/disabled while in flight; OTP cells remain
    editable/focusable until a response resolves (no full-dialog blocking
    spinner per NFR-004 keyboard-operability requirement).
```

## 3. Client-side vs server-side concerns (explicit split, per FR-004)

- **60-second resend cooldown is a UI/client concern only** — there is no
  cooldown value or `retryAfter`/`nextResendAt` field in either
  INT-002's or INT-003's response (both are bare 204s). The cooldown is a
  pure client timer (per the requirements doc's `useEVCooldown` hook,
  DR-016/design-spec `screens.emailVerify`) started on a successful send
  response, shared between the banner and the dialog (FR-004/FR-005
  "one 60s clock per pending verification request").
- **Server-side rate limiting is a SEPARATE, orthogonal concern** — whatever
  IAM enforces (assumed 429 `RATE_LIMIT_EXCEEDED`/`USER_TOO_MANY_ATTEMPTS`,
  see INT-002 open question) is independent of and likely stricter/longer
  than the 60s UI cooldown. The UI must not conflate the two: a 429 is an
  **error state** (shown via errorKey, does not start the 60s cooldown),
  whereas the 60s cooldown countdown itself is **not an error state** (just a
  disabled-button + countdown text, `aria-live="polite"` per NFR-002).
- Do not invent a "resend attempts remaining" counter in the UI — no field
  in the contract exposes it; if iam ever adds a `retryAfter`/attempts-left
  field to the envelope's `error` object it would arrive as part of the
  standard `ApiError` shape (`retryable`, `message`) already unwrapped by
  `bootstrap/lib/api-envelope.ts` — no new client plumbing needed to *read*
  it, just a presentation-layer decision to surface it (currently no such
  field is documented, so out of scope until iam adds one).

## 4. `emailVerified` field — plumbing needed (FE-side, not a BE gap)

Confirmed against `openapi.yaml` line 1386: iam's `GET /users/me` response
already includes `isEmailVerified: boolean`. **No BE work / no ADR required.**
What this story must add on the web side (implementation detail for
`fe-nextjs-engineer`, not prescribed here beyond the contract shape):

1. `UserProfileResponseDto` (`src/features/auth/infrastructure/dtos/user-profile-response.dto.ts`)
   — add the field consumed from the wire. **Naming note:** iam's wire field
   is `isEmailVerified`; the web's existing DTO fields are already
   web-side-normalized names diverging from iam's documented casing (see
   Overview risk #2), so whether the DTO property is literally
   `isEmailVerified` (1:1 wire) or renamed `emailVerified` (matching this
   story's VM/entity convention, `AuthUser`/`ProfileScreenVM` boolean naming
   style used elsewhere in the codebase) is a naming call for whoever
   implements the mapper — flag for `fe-component-architect`/
   `fe-nextjs-engineer` to pick one and keep DTO (wire-shaped) vs
   entity/VM (domain-shaped) distinct per the mapper-layer convention already
   used in `auth.mapper.ts`.
2. `AuthUser` entity (`src/features/auth/domain/entities/auth-user.entity.ts`)
   — add `emailVerified: boolean`.
3. `mapProfile()` in `auth.mapper.ts` — map the new DTO field to the entity.
4. `ProfileScreenVM` (`src/features/user/presentation/profile/profile-screen.i-vm.ts`)
   — add `emailVerified: boolean` (already flagged in requirements.md
   §Dependencies).
5. New endpoint constants — extend `AUTH_EP`
   (`src/bootstrap/endpoint/auth.endpoint.ts`) with two new entries, e.g.
   `requestEmailVerification: "/iam/api/v1/users/me/email/verification"` and
   `confirmEmailVerification: "/iam/api/v1/users/me/email/verification/confirm"`
   (naming/exact constants are an implementation choice, following the
   existing `forgotPassword`/`resetPassword` naming precedent in that file).
6. New repository methods on `IAuthRepository` (or a new
   `IEmailVerificationRepository` if `fe-component-architect` prefers
   isolating this from the broader auth surface — this is a design choice,
   not fixed here) mirroring the existing `requestPasswordReset`/
   `resetPassword` `VoidResult`-returning pattern already in
   `i-auth.repository.ts`/`auth.repository.ts`.
7. `AuthFailure` union — **no new failure types needed.** `invalid-otp`,
   `otp-expired`, `too-many-requests` already exist (forgot-password
   precedent) and map 1:1 to this flow's three OTP-confirm error codes
   (`CODE_MAP` in `auth-failure.mapper.ts` already contains
   `USER_INVALID_OTP`/`USER_OTP_EXPIRED`/`USER_TOO_MANY_ATTEMPTS` +
   lowercase variants + `RATE_LIMIT_EXCEEDED`). Reuse `mapAuthError()`
   as-is for both new endpoints.

## 5. Auth & Security

- All 3 endpoints require `Authorization: Bearer <accessToken>` (server-side
  cookie-mediated per decision 0018 — the UI never handles tokens
  client-side, confirmed consistent with NFR-008's "server-action-mediated"
  requirement).
- No role gating — identical for all 4 roles (teacher/principal/student/
  parent), per requirements.md scope.
- PII/sensitive fields: `email` (PII, already read-only per FR-008 — this
  story does not add any write path for it), `otp` (Confidential — 6-digit
  code, must never be logged client-side or persisted beyond the input
  field's in-memory state, cleared on dialog close per NFR-008).
- `emailVerified`/`isEmailVerified` itself is a low-sensitivity boolean
  (Internal), safe to include in the VM/entity passed to Client Components.

## 6. Mock-first plan

**Not applicable** — all three endpoints are REAL (iam has shipped them).
No `bootstrap/lib/mock.ts` entry is needed for this story. (If Storybook
stories for the banner/dialog/Profile-row need fixture data for the 4 UI
states — loading/empty/error/success — that is component-level fixture data
for `fe-nextjs-engineer`'s stories, not a `NEXT_PUBLIC_USE_MOCK` service
mock, since `iam` is a real, shipped service per decision 0017.)

## 7. Open Questions

- **[OPEN QUESTION → ba-lead / iam BE team]** Does
  `POST /users/me/email/verification` (send/resend) enforce its own
  server-side rate limit distinct from the UI's 60s cooldown (e.g. max
  resends per hour)? `openapi.yaml`'s endpoint entry documents only `204`/
  `401` — no `429` response is listed for this specific route (unlike the
  reset-password flow, whose `INTEGRATION.md` explicitly documents `429`
  `TOO_MANY_ATTEMPTS` for repeated bad reset attempts). The web should code
  defensively for a `429` anyway (existing `too-many-requests` AuthFailure
  branch is a safe no-op if iam never actually emits it here), but this
  should be confirmed with the iam team so the UI copy ("Đã gửi quá nhiều
  yêu cầu, thử lại sau") isn't dead code or, conversely, isn't missing a
  BE-provided `Retry-After` hint FR-003 explicitly asks the UI to surface
  when present.
- **[OPEN QUESTION → ba-lead]** Pre-existing field-name/shape drift between
  the web's `UserProfileResponseDto` (`id`/`name`/`avatar`/`roles[]`) and
  iam's documented `UserProfileResponse` schema (`userId`/`fullName`/
  `avatarUrl`/`role`/`status`/`isEmailVerified`/`mfaEnabled`/`dob`/
  `createdAt`/`updatedAt`) — out of scope for US-E22.1 to fix, but worth a
  follow-up story/ADR since this story adds one more field onto a DTO whose
  other fields already may not match the live contract 1:1.
- **[OPEN QUESTION → fe-component-architect]** Confirm-response handling
  choice between optimistic local flip vs. `/users/me` refetch (§2 INT-003)
  — both are contract-valid; pick one for consistency with the state
  management pattern already used elsewhere (e.g. TanStack Query
  invalidation vs. direct cache write) per `fe-state-engineer`'s conventions.
- **[OPEN QUESTION → ba-use-case-modeler]** FR-006 as written names only two
  dialog error states (wrong-code, expired-code) but iam's contract exposes
  a THIRD distinct one (`USER_TOO_MANY_ATTEMPTS`, 429, "code locked after 5
  attempts") — should this get its own AC/copy distinct from "expired", or
  be folded into the same "request a new code" messaging? (Recommendation
  in §2 INT-003: treat like expired — show message + Resend — but AC should
  say so explicitly.)
