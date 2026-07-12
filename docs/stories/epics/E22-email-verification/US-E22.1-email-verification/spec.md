# Feature Spec — Email Verification (banner + Profile row + OTP dialog)   (US-E22.1)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-221, FR-001..010, NFR-001..008) +
`integration.md` (INT-001..003, service `iam`, all REAL) +
`use-cases.md` (UC-001..008, AC-001.1..AC-008.8) + `docs/product/design-spec.jsonc`
→ `screens.emailVerify` (~line 1727) + `docs/design-requests/DR-016-email-verification.md`
+ mockup `design_src/edu/email-verify.jsx`.

## 1. Scope & Objectives

**Purpose.** Give every authenticated user (regardless of role) a way to
discover that their account email is unverified and to complete verification
via a 6-digit OTP, without ever exposing an email-change capability.

**In-scope.**
- App-shell banner (mounts on every route, below Header, session-dismissible,
  60s cooldown after send).
- Profile personal-info row: status badge + "Xác thực ngay" CTA next to the
  existing (already-implemented, US-E08.5) `profile.personal.email` field.
- `EmailVerifyDialog`: 6-digit OTP entry (reusing the existing auth `OtpInput`
  pattern), Confirm, Resend (shared cooldown), 3 distinct error states
  (wrong/expired/lockout), success state.
- i18n: net-new `emailVerify` namespace (banner + dialog) + 4 additive keys
  under the existing `profile.personal` namespace.
- Client integration with `iam`'s 3 endpoints via server action + repository,
  mapped to the existing `AuthFailure` union (no new failure types).

**Out-of-scope.**
- Email-delivery infrastructure (SMTP/provider/template) — entirely `iam` BE.
- Designing a new OTP component — MUST reuse
  `src/features/auth/presentation/forgot-password/otp-input.tsx`.
- Changing the email value itself — no edit/change-email flow, ever.
- Role-gating — feature is identical across teacher/principal/student/parent.
- The mockup's demo-only helper text ("Demo: mã đúng 123456…") — excluded
  from production copy per DR-016.
- Cross-tab/session synchronization of verified status or cooldown state
  (explicitly not required by any AC — see §8 open questions).

**Definitions.**
- *Banner* — `EmailVerifyBanner`, shell-level, `role="status"`, mounted
  between `<Header>` and `<main>` in `app-shell.tsx` (same slot as the
  existing `SseDisconnectBanner`, confirmed at `app-shell.tsx:81`).
- *Profile row* — the verification status badge + CTA added next to the
  existing `email` `Field` inside `profile-screen.tsx`'s personal-info
  `TabsContent` (US-E08.5 baseline, unmodified elsewhere).
- *Shared cooldown clock* — one 60-second, purely client-side timer per
  outstanding verification request, read by both the banner's "Gửi lại" and
  the dialog's "Gửi lại mã", started only by a genuinely successful
  (204, non-429) send/resend response.

## 2. Actors & Roles

| Actor | Type | Visibility / capability |
| --- | --- | --- |
| Teacher | Primary, human | Full capability set below — account-level, no role gate |
| Principal | Primary, human | Same as teacher |
| Student | Primary, human | Same as teacher |
| Parent | Primary, human | Same as teacher |
| `iam` service | Secondary, system | Source of `isEmailVerified`; issues verification email; validates OTP; enforces 5-attempt confirm lockout |
| Screen reader / AT | Secondary, non-human | Consumes `role="status"`, `aria-live="polite"` cooldown text, `aria-invalid`/`aria-describedby` on OTP group |

Capabilities (identical for all 4 roles, no admin/other role variant in
scope): view verification status (banner + Profile row), dismiss banner
(session-scoped), request/resend verification email, submit 6-digit OTP,
observe success/error states. **No role-gated visibility** — this is the one
axis this spec does not vary on.

## 3. Functional Requirements

Each FR below: priority, source, "The system SHALL…", AC (Given/When/Then,
full text in `use-cases.md` §4 — referenced here by ID), dependencies.

### FR-001 — Shell banner renders when unverified
- Priority: Must · Source: TR-221 FR-001, UC-001
- The system SHALL render an app-shell banner below the Header and above
  route content, on every route, when `user.emailVerified === false` and the
  verification status has resolved (not loading/unknown).
- AC: AC-001.1 (unresolved → hidden), AC-001.3 (fetch error → hidden,
  fail-closed), AC-001.4 (resolved+unverified → visible with `role="status"`,
  warning tone, mail icon, unverified copy, inline send CTA).
- Dependencies: shell session/user data already fetched (no new round-trip,
  NFR-006); `AuthUser.emailVerified` field (§6 plumbing).

### FR-002 — Session-scoped banner dismiss
- Priority: Must · Source: TR-221 FR-002, UC-001
- The system SHALL allow the user to dismiss the banner for the current
  session/tab only (not persisted across sessions/reloads).
- AC: AC-001.5 (dismiss hides for remainder of session, survives route nav),
  AC-001.6 (reappears next full session while still unverified),
  AC-001.7 (keyboard-operable close control).
- Dependencies: FR-001.

### FR-003 — Send verification email (banner CTA)
- Priority: Must · Source: TR-221 FR-003, UC-002, INT-002
- The system SHALL send a verification email when the user activates the
  banner's send CTA, calling `POST /iam/api/v1/users/me/email/verification`.
- AC: AC-002.1 (pending/disabled button, no full-page spinner),
  AC-002.2 (204 → "sent" state referencing user's email + cooldown starts),
  AC-002.3 (idempotent 204-already-verified → same as AC-002.2, no special
  case), AC-002.4 (transport/5xx → stable errorKey, cooldown does NOT start,
  CTA remains actionable), AC-002.5 (429, defensive, no cooldown start).
- Dependencies: FR-004 (cooldown), INT-002.

### FR-004 — 60-second shared resend cooldown
- Priority: Must · Source: TR-221 FR-004, UC-008
- The system SHALL enforce a 60-second resend cooldown, visible as a live
  countdown, shared by exactly one clock between the banner and the dialog
  (not two independent timers), before "Gửi lại"/"Gửi lại mã" re-actionable.
- AC: AC-008.1 (starts on success), AC-008.2/8.3 (`aria-live="polite"`
  announces start + re-enable), AC-008.4 (shared clock across banner↔dialog),
  AC-008.5 (persists across dialog close/reopen same page load),
  AC-008.6 (never started by an error response), AC-008.7 (full reload MAY
  reset — documented, not a defect), AC-002.6 (mid-cooldown reopen shows
  remaining time, not fresh 60s).
- Dependencies: none beyond FR-003/FR-005 triggering it.

### FR-005 — Dialog opens from Profile row, shares cooldown
- Priority: Must · Source: TR-221 FR-005, UC-003, UC-007
- The system SHALL open `EmailVerifyDialog` when the user activates
  "Xác thực ngay" on the Profile row, and SHALL read/write the same cooldown
  clock as the banner (FR-004).
- AC: AC-003.1 (dialog opens immediately, OTP group + target email +
  Confirm/Resend + focus trap), AC-007.6 (entry point from Profile row),
  AC-008.4 (shared clock confirmation from the dialog side).
- Dependencies: FR-004, FR-007 (Profile row), FR-009 (OtpInput reuse).

### FR-006 — OTP confirm: success + 3 distinct error states
- Priority: Must · Source: TR-221 FR-006, UC-003/004/005/006, INT-003
- The system SHALL submit the entered 6-digit code to
  `POST /iam/api/v1/users/me/email/verification/confirm` and:
  - on 204 success, show a success state and propagate `emailVerified=true`
    to every surface displaying it (banner disappears, Profile badge flips)
    without a page reload;
  - on `USER_INVALID_OTP` (400), show a wrong-code error, OTP cells stay
    editable, Resend remains available;
  - on `USER_OTP_EXPIRED` (400), show an expired-code error with Resend
    emphasized;
  - on `USER_TOO_MANY_ATTEMPTS` (429, 5-attempt cap), show a THIRD, distinct
    lockout message, OTP cells disabled until a new code is requested via
    Resend (this third state is not named in the original FR-006 wording but
    is a confirmed, already-mapped `iam` error code per INT-003 — modeled
    defensively as UC-006);
  - on transport/5xx/422, show a generic retryable error, code preserved.
- AC: AC-003.3/3.4/3.5/3.6/3.7 (submit/success/close/keyboard/responsive);
  AC-004.1..4 (wrong-code: distinct copy, editable, Resend available,
  non-color-only); AC-005.1..4 (expired-code: distinct copy, Resend
  emphasized/available/cooling-down); AC-006.1..4 (lockout: distinct copy,
  cells locked, unlock-via-resend `[OPEN QUESTION]`, distinct from
  send-endpoint 429).
- Dependencies: FR-004 (shared cooldown for Resend), FR-009 (OtpInput),
  existing `AuthFailure`/`mapAuthError` (no new failure types — §6).

### FR-007 — Profile personal-info row: status badge + CTA
- Priority: Must · Source: TR-221 FR-007, UC-007
- The system SHALL display a verification-status row on the Profile
  screen's personal-info tab, immediately adjacent to the existing
  `profile.personal.email` field: badge ("Đã xác thực" success+check /
  "Chưa xác thực" warning+icon) plus, when unverified, a "Xác thực ngay" CTA.
- AC: AC-007.1 (status unresolved → no badge, neutral), AC-007.3 (fetch
  error → same as unresolved, not a wrong status), AC-007.4 (unverified →
  badge + CTA), AC-007.5 (verified → badge, no CTA), AC-007.7 (reactive
  flip when verified via the banner entry point instead).
- Dependencies: `ProfileScreenVM.emailVerified` (§6 plumbing), FR-008.

### FR-008 — Email remains immutable
- Priority: Must · Source: TR-221 FR-008, UC-007
- The system SHALL treat the account email as read-only in this flow —
  verification never implies an email-change capability.
- AC: AC-007.8 (email `Field` stays disabled exactly as today, US-E08.5; no
  edit affordance added).
- Dependencies: none (constraint only).

### FR-009 — Reuse existing OTP cell component
- Priority: Should · Source: TR-221 FR-009
- The system SHOULD reuse
  `src/features/auth/presentation/forgot-password/otp-input.tsx`
  (`OtpInput`) for `EmailVerifyDialog` rather than building a new component,
  adapting only the `aria-label` copy (existing English
  `OTP digit ${i+1}` → Vietnamese `emailVerify.dialog.digitAriaLabel`,
  "Chữ số thứ N").
- AC: implicit in AC-003.1/3.6/3.7 (dialog behavior/dimensions match the
  46×52/radius-10 spec `OtpInput` already satisfies).
- Dependencies: decision `0026`/`component-organization.md` — if
  forgot-password and email-verify need genuinely divergent props, promote
  to `components/shared/otp-input/` rather than forking; implementer's call
  (`fe-component-architect`), not fixed here.

### FR-010 — No email-delivery infrastructure work
- Priority: Won't · Source: TR-221 FR-010
- The system SHALL NOT implement/configure SMTP/provider/template rendering
  — entirely owned by `iam`.
- No AC (explicitly out of scope).

## 4. Non-Functional Requirements

| ID | Category | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- | --- |
| NFR-001 | Accessibility | Banner uses `role="status"`, never `alert` | axe/impeccable audit: zero role-misuse findings | `/impeccable audit` + manual DOM check |
| NFR-002 | Accessibility | OTP group `role="group"` + labelled `aria-label`; per-cell `aria-label` "Chữ số thứ N"; cooldown exposed via `aria-live="polite"` | SR announces at minimum countdown start + re-enable transition (WCAG 4.1.3) | Manual screen-reader walkthrough (VoiceOver/NVDA) on dialog open→cooldown→re-enable |
| NFR-003 | Accessibility | Warning banner text uses `--edu-warning-foreground` (never white); dialog error text uses `--edu-error-text` (never background-only destructive color) | Contrast ≥4.5:1 text, ≥3:1 large text/icons (WCAG AA) | `/impeccable audit` contrast check + token grep (no raw color) |
| NFR-004 | Accessibility | Dialog fully keyboard-operable: OTP auto-advance, backspace-to-previous, Confirm/Resend/Close via Tab, focus trapped, focus returns to invoking control on close | Manual keyboard-only walkthrough passes end-to-end; focus ring always visible | Playwright keyboard-navigation test + manual pass |
| NFR-005 | Responsive | Banner + dialog do not break at 320/375/768/1280px; OTP cells wrap/shrink per spec, never overlap | No layout break, no horizontal scroll at any breakpoint | Storybook viewport addon + manual resize check |
| NFR-006 | Performance | Verification-status check SHALL NOT add a blocking round-trip before shell first paint — reuse already-fetched session/user data | Zero new network waterfall entries before shell paint; banner mounts on next paint after existing user/session data resolves | Network tab / Lighthouse trace diff before/after |
| NFR-007 | i18n | Banner/dialog copy under net-new `emailVerify` namespace; Profile-row copy extends existing `profile.personal` (no duplicate keys); vi source + en mirror | `bunx tsc --noEmit` passes (typed messages); zero hardcoded Vietnamese diacritics in `.tsx` outside messages/mock | `tsc --noEmit` + diacritics grep per `.claude/rules/i18n.md` |
| NFR-008 | Security | OTP confirm/resend calls authenticated (Bearer, server-action-mediated); no OTP code logged/persisted client-side beyond input-field state, cleared on dialog close | Zero PII/secret in client console logs; code state cleared on unmount/close (verified by test) | Code review + unit test asserting state clear on close |

## 5. UI States & Flows

Per async surface (banner send, dialog confirm, Profile-row status fetch),
all 4 states required (loading/empty/error/success):

- **Banner:**
  - *loading/unresolved* → hidden (fail-closed, AC-001.1).
  - *empty (verified)* → never mounts (AC-001.2).
  - *error* (status fetch fails, or send fails) → hidden for status-fetch
    (AC-001.3); stable errorKey banner state for send failure (AC-002.4/2.5).
  - *success* → unverified banner visible (AC-001.4) → "sent" state +
    cooldown (AC-002.2/2.3).
- **Profile row:**
  - *loading/unresolved/error* → email shown, no badge (AC-007.1/7.3).
  - *empty* → n/a (email always present once Profile has loaded).
  - *success* → badge (verified or unverified variant, AC-007.4/7.5).
- **OTP dialog:**
  - *loading (open)* → immediate open, focus trap (AC-003.1).
  - *empty* → 6 empty cells, Confirm disabled (AC-003.2).
  - *loading (submit)* → Confirm pending/disabled, cells stay focusable
    (AC-003.3).
  - *error* → 3 distinct sub-states: wrong-code (AC-004.x), expired-code
    (AC-005.x), lockout (AC-006.x).
  - *success* → check icon + confirmation copy + "Hoàn tất" (AC-003.4/3.5).

**Key flows** (see `use-cases.md` for full step lists):
- UC-001→UC-002→UC-008: banner discovery → send → cooldown.
- UC-007→UC-003 (or banner entry)→UC-008: Profile CTA → dialog → shared
  cooldown.
- UC-003→UC-004/005/006: confirm submit → one of 4 outcomes (success or 3
  distinct errors).
- Convergence: both entry points (banner, Profile row) open the SAME dialog
  instance/state and read the SAME cooldown clock — not two parallel flows.

## 6. Data & Integration

All 3 endpoints: service **`iam`**, status **REAL** (shipped, confirmed
against `openapi.yaml`/`ERROR_CODES.md`) — **not** mock-first, no
`bootstrap/lib/mock.ts` entry.

### INT-001 — `GET /iam/api/v1/users/me` (existing, extend consumption)
- Protected: yes · Role: any authenticated user.
- Response (camelCase, after envelope unwrap) adds: `emailVerified`
  (sourced from BE's `isEmailVerified: boolean`, `openapi.yaml` line 1386).
- Error→UI: 401/`TOKEN_EXPIRED` → existing session/refresh flow (decision
  `0018`), not a new concern; transport/5xx → banner/row fail-closed
  (FR-001/FR-007 error branches), no wrong badge shown.
- Pagination: none. Auth: Bearer, server-mediated.
- **Plumbing to add (FE-side, no BE/ADR needed):**
  1. `UserProfileResponseDto` (`src/features/auth/infrastructure/dtos/user-profile-response.dto.ts`)
     — add the wire field (naming: `isEmailVerified` 1:1 vs normalized
     `emailVerified` — implementer's call, keep DTO wire-shaped vs
     entity/VM domain-shaped per existing `auth.mapper.ts` convention).
  2. `AuthUser` entity (`src/features/auth/domain/entities/auth-user.entity.ts`)
     — add `emailVerified: boolean`.
  3. `mapProfile()` in `auth.mapper.ts` — map DTO → entity.
  4. `ProfileScreenVM` (`src/features/user/presentation/profile/profile-screen.i-vm.ts`)
     — add `emailVerified: boolean`.

### INT-002 — `POST /iam/api/v1/users/me/email/verification` (send/resend)
- Protected: yes · Role: any authenticated user. Request: none (Bearer
  header only). Response: 204, no body — server action/use-case returns
  `{ ok: true }` (`VoidResult`, mirrors `requestPasswordReset`).
- Error→UI: 401 → existing session/refresh flow; 429
  (`RATE_LIMIT_EXCEEDED`/`USER_TOO_MANY_ATTEMPTS`, **inferred, not explicit
  in this endpoint's openapi entry** — `[OPEN QUESTION]`) → map to existing
  `too-many-requests` `AuthFailure`, surface BE `Retry-After` hint if
  present else generic copy, do NOT start cooldown; transport/5xx → generic
  retryable error, no cooldown start; idempotent 204 (already verified) →
  treat identically to a normal successful send.
- Pagination: none. Auth: Bearer, server-mediated.
- New endpoint constant: extend `AUTH_EP`
  (`src/bootstrap/endpoint/auth.endpoint.ts`), e.g.
  `requestEmailVerification: "/iam/api/v1/users/me/email/verification"`.

### INT-003 — `POST /iam/api/v1/users/me/email/verification/confirm`
- Protected: yes · Role: any authenticated user.
- Request (camelCase): `{ otp: string }` (`^[0-9]{6}$`, Confidential —
  never logged/persisted beyond input-field state, NFR-008).
- Response: 204, no body. Two contract-valid UI options: (a) optimistic
  local flip of `emailVerified = true` on the VM (recommended, matches
  NFR-006's "no added blocking request" spirit and FR-006's literal
  wording), or (b) trigger a `GET /users/me` refetch (INT-001) to
  re-derive from source-of-truth. Either satisfies the observable AC;
  choice affects whether AC-007.7 ("reactive update" across banner+row) is
  trivially true (shared client state) or needs explicit
  refetch/invalidation — implementer must ensure AC-007.7 holds either way.
- Error→UI (existing `AuthFailure` types, no new failure-mapping
  infrastructure — reuse `mapAuthError()`/`CODE_MAP` as-is):
  - `USER_INVALID_OTP` (400) → `{type:"invalid-otp"}` → `emailVerify.dialog.errorWrong`.
  - `USER_OTP_EXPIRED` (400, 15-min window) → `{type:"otp-expired"}` →
    `emailVerify.dialog.errorExpired`.
  - `USER_TOO_MANY_ATTEMPTS` (429, 5-attempt cap) → `{type:"too-many-requests"}`
    → a NEW distinct copy string (not `errorWrong`/`errorExpired` — this is
    a third UI state; the design-spec/DR-016 copy block does not name it
    explicitly, so `emailVerify.dialog.errorLockout` or equivalent must be
    added as an i18n key by the implementer, following the existing
    key-naming pattern in DR-016).
  - 401 → existing session/refresh flow; 422/transport/5xx → generic
    retryable error, code preserved.
- Pagination: none. Auth: Bearer, server-mediated.
- New endpoint constant: `confirmEmailVerification: "/iam/api/v1/users/me/email/verification/confirm"`.
- New repository methods on `IAuthRepository` (or a new
  `IEmailVerificationRepository`, implementer's choice per
  component-organization/DI conventions) mirroring the existing
  `requestPasswordReset`/`resetPassword` `VoidResult` pattern.

**Client-side vs server-side split (per FR-004/integration.md §3):** the 60s
cooldown is 100% client-side (no `retryAfter`/`nextResendAt` field on either
204 response); BE rate-limiting (429 on either endpoint) is a *separate,
orthogonal* concern — never conflate a 429 error with the cooldown timer.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-001 | Shell banner — unverified + dismiss-per-session | FR-001, FR-002 | 7 |
| UC-002 | Banner send → sent state with 60s cooldown | FR-003, FR-004 | 6 |
| UC-003 | OTP dialog — open → 6-digit entry → confirm success | FR-005, FR-006, FR-009 | 7 |
| UC-004 | OTP dialog — wrong-code error | FR-006 | 4 |
| UC-005 | OTP dialog — expired-code error (resend affordance) | FR-006 | 4 |
| UC-006 | OTP dialog — too-many-attempts lockout (defensive) | FR-006 | 4 |
| UC-007 | Profile row — verified vs unverified + entry point | FR-007, FR-008 | 8 |
| UC-008 | Resend-cooldown countdown — shared clock + a11y | FR-004 | 8 |

Total: 8 use cases, 48 AC, 0 role-variant AC (feature is account-level and
identical across all 4 roles).

## 8. Constraints & Assumptions

**Confirmed [ASSUMPTION]s** (carried from requirements.md, not contradicted
by integration.md/use-cases.md):
- Banner dismiss is scoped to the browser tab/session (sessionStorage or
  in-memory), reappearing on next login/full reload while still unverified.
- Banner and Profile-row/dialog share ONE 60s cooldown clock per outstanding
  verification request (not two independent timers).
- `emailVerified` status is sourced from already-loaded shell/session data
  (`GET /users/me`) — **confirmed** by integration.md (`isEmailVerified` at
  `openapi.yaml` line 1386), not a new dedicated endpoint.
- Wrong-code and expired-code are distinguishable BE error codes —
  **confirmed** (`USER_INVALID_OTP` vs `USER_OTP_EXPIRED`), plus a third,
  previously-unnamed lockout code (`USER_TOO_MANY_ATTEMPTS`) surfaced by
  integration.md and modeled as UC-006.

**[GAP]s:**
- DR-016's copy block does not include a production string for the
  lockout (UC-006/`USER_TOO_MANY_ATTEMPTS`) state — the implementer must
  add one new i18n key (e.g. `emailVerify.dialog.errorLockout`) under the
  same vi-source/en-mirror convention as the rest of the `emailVerify`
  namespace; not a redesign, just a missing copy string DR-016 didn't
  anticipate when integration.md later surfaced the third BE error code.
- Exact DTO field name for `isEmailVerified`/`emailVerified` and the choice
  between `IAuthRepository` extension vs a new
  `IEmailVerificationRepository` are left as implementation decisions (not
  prescribed here — see §6 INT-001/INT-003 notes).

**[OPEN QUESTION]s** (none block starting implementation — each has a safe,
documented fallback already modeled in the AC):
1. Does `POST /users/me/email/verification` (send/resend) enforce its own
   server-side rate limit distinct from the UI's 60s cooldown? AC-002.5 is
   modeled defensively (existing `too-many-requests` branch is a safe no-op
   if `iam` never emits it here). → `ba-lead`/iam BE team.
2. Is the `USER_TOO_MANY_ATTEMPTS` OTP lockout (UC-006) scoped to the
   specific outstanding code (cleared by Resend, as AC-006.3 assumes) or to
   the account/time-window (Resend would NOT unlock it)? Changes whether
   AC-006.3 is correct or whether a longer-form "try again later" state
   (no immediate Resend) is needed instead. → `ba-lead`/iam BE team.
3. Pre-existing field-name/shape drift between the web's
   `UserProfileResponseDto` (`id`/`name`/`avatar`/`roles[]`) and iam's
   documented `UserProfileResponse` schema (`userId`/`fullName`/
   `avatarUrl`/`role`/`status`/`isEmailVerified`/`mfaEnabled`/`dob`/
   timestamps) predates this story and is out of scope to fix here, but
   this story's correctness (UC-001/UC-007) depends on `emailVerified`
   actually round-tripping through whatever transform `auth.repository.ts`
   currently applies. → `ba-lead`, follow-up story/ADR candidate.
4. Cross-tab synchronization is explicitly NOT required by any AC (cooldown,
   dismiss, verified-status are single-tab/session concerns) — confirm this
   UX is acceptable (Tab A verifies, Tab B still shows "unverified" until
   its own session data refreshes) or scope a follow-up
   BroadcastChannel/storage-event story. → `ba-lead`.

**Technical constraints:**
- No new design token, no new component-organization pattern — reuses
  existing warning/error/success tokens, existing `OtpInput`, existing
  `SseDisconnectBanner` mount slot. No ADR required for this story.
- `AuthFailure` union needs zero new members — `invalid-otp`, `otp-expired`,
  `too-many-requests` already exist and cover all 3 confirm error branches.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Banner renders when unverified | TR-221 | UC-001 | INT-001 | Must |
| FR-002 Session-scoped dismiss | TR-221 | UC-001 | — (client-only) | Must |
| FR-003 Send verification email | TR-221 | UC-002 | INT-002 | Must |
| FR-004 Shared 60s cooldown | TR-221 | UC-002, UC-008 | INT-002 (trigger only, no server field) | Must |
| FR-005 Dialog opens from Profile row, shared cooldown | TR-221 | UC-003, UC-007 | INT-002 (via banner path), — | Must |
| FR-006 OTP confirm success + 3 error states | TR-221 | UC-003, UC-004, UC-005, UC-006 | INT-003 | Must |
| FR-007 Profile row status badge + CTA | TR-221 | UC-007 | INT-001 | Must |
| FR-008 Email immutable | TR-221 | UC-007 | — (constraint only) | Must |
| FR-009 Reuse existing OtpInput | TR-221 | UC-003 | — (component reuse) | Should |
| FR-010 No email-infra work | TR-221 | — | — (explicitly out of scope) | Won't |
| NFR-001 Banner `role="status"` | TR-221 | UC-001 | — | a11y gate |
| NFR-002 OTP group a11y + `aria-live` cooldown | TR-221 | UC-003, UC-008 | — | a11y gate |
| NFR-003 Contrast tokens (warning/error) | TR-221 | UC-001, UC-004, UC-005, UC-006 | — | a11y gate |
| NFR-004 Keyboard operability, focus trap | TR-221 | UC-003 | — | a11y gate |
| NFR-005 Responsive 320–1280px | TR-221 | UC-003 | — | a11y/responsive gate |
| NFR-006 No blocking round-trip | TR-221 | UC-001, UC-007 | INT-001 | perf gate |
| NFR-007 i18n vi/en, typed keys | TR-221 | all | — | i18n gate |
| NFR-008 OTP security (no logging/persist) | TR-221 | UC-003 | INT-003 | security gate |

## 10. Handoff to FE

**What `fe-lead` should build** (branch `feat/us-e22.1-email-verification`,
lane **normal**):
1. Data plumbing: `UserProfileResponseDto` → `AuthUser` entity →
   `auth.mapper.ts` → `ProfileScreenVM`, all adding one boolean field
   (§6 INT-001). Two new endpoint constants in `AUTH_EP`. Two new repository
   methods (`VoidResult`-returning, mirroring `requestPasswordReset`/
   `resetPassword`) — no new `AuthFailure` types, reuse `mapAuthError()`.
2. `EmailVerifyBanner` — mount in `src/components/layout/app-shell/app-shell.tsx`
   in the same slot as `SseDisconnectBanner` (confirmed line ~81).
3. Profile personal-info row — extend
   `src/features/user/presentation/profile/profile-screen.tsx`'s existing
   personal-info `TabsContent`, next to the `email` `Field`.
4. `EmailVerifyDialog` — new, **reuse**
   `src/features/auth/presentation/forgot-password/otp-input.tsx`
   (`OtpInput`) per FR-009; decide reuse-as-is (prop for aria-label copy) vs
   promote to `components/shared/otp-input/` per decision `0026` — this is
   an `fe-component-architect` call, not fixed by this spec.
5. Shared cooldown mechanism (context/hook/query-cache — implementer's
   choice) satisfying AC-008.4/8.5.
6. i18n: add net-new `emailVerify` namespace (banner + dialog, full vi/en
   text already drafted in DR-016 §"UX copy", reproduced verbatim in this
   packet's `requirements.md`/DR-016) + 4 additive `profile.personal.*` keys
   (`emailVerified`/`emailUnverified`/`emailVerifyNow`/`emailImmutableHint`,
   also verbatim in DR-016) + ONE new key for the lockout copy not covered
   by DR-016 (§8 [GAP]).

**Reference artifacts to build against:**
- `design_src/edu/email-verify.jsx` — reference mockup (`EmailVerifyBanner`,
  `EVEmailField`, `EmailVerifyDialog`, `useEVCooldown` hook — the hook name
  signals the intended cooldown-sharing mechanism, though the concrete
  implementation is FE's choice).
- `docs/product/design-spec.jsonc` → `screens.emailVerify` (~line 1727) —
  normative layout/token values (banner padding, icon-box, OTP cell
  46×52/radius-10, error-state colors, success iconCircle).
- `src/features/auth/presentation/forgot-password/otp-input.tsx` (`OtpInput`)
  — the reusable OTP component confirmed present and matching spec
  dimensions (46×52/radius-10) — **do not build a second one** (decision
  `0026`).
- This spec (`spec.md`) + `story.md` in this packet.

**Proof owed (maps to TEST_MATRIX rows, per `story.md` §Validation):**
- Unit: DTO→entity→mapper mapping for `emailVerified`; cooldown-timer logic
  (start/tick/re-enable/not-started-by-error).
- Integration: repository contract tests for the 2 new endpoints
  (204/no-body handling, 3-way error→failure mapping including the new
  lockout branch).
- E2E: Storybook interaction + Playwright covering all 8 use cases' happy
  and error paths, keyboard-only walkthrough, 320px responsive check.
- Design-review gate: `/impeccable audit` for contrast/motion/focus
  (NFR-001..004) before closing the story.
