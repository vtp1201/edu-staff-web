# US-E22.1 — Email Verification — Use Cases & Acceptance Criteria

Source: `requirements.md` (TR-221, FR-001..FR-010, NFR-001..008), `integration.md`
(INT-001..003, iam service, all REAL endpoints). No role variants (feature is
account-level, identical for teacher/principal/student/parent per requirements
§scope). All async UCs cover loading/empty/error/success per repo convention.

## 1. Use Case Scope Summary

8 use cases, 1 primary actor type (any authenticated user, all 4 roles,
unified — no role-gating), 1 secondary actor (`iam` service via 3 endpoints:
`GET /users/me`, `POST .../email/verification`, `POST .../email/verification/confirm`).
Boundaries: shell banner (`AppShell`), Profile personal-info row
(`profile-screen.tsx`), `EmailVerifyDialog` (OTP), shared 60s client-side
cooldown clock. Out of scope: email-delivery infra, email-change flow,
role-gating, a dedicated "attempts remaining" counter UI (no such field in
contract — see UC-006).

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
|---|---|---|
| Authenticated user (teacher/principal/student/parent) | Primary, human | View verification status (banner + Profile row), dismiss banner (session), request/resend verification email, submit 6-digit OTP, view success/error states |
| `iam` service | Secondary, system | Source of `isEmailVerified` (`GET /users/me`), issues verification email (`POST .../email/verification`), validates OTP (`POST .../email/verification/confirm`), enforces OTP failed-attempt lockout (`USER_TOO_MANY_ATTEMPTS`, 5-attempt cap) |
| Screen reader / assistive tech | Secondary, non-human | Consumes `role="status"`, `aria-live="polite"` cooldown announcements, `aria-invalid`/`aria-describedby` on OTP group |

## 3. Use Case Catalogue

### UC-001 — Shell banner: unverified state, dismiss per session

- **Primary actor:** Authenticated user with `emailVerified === false`.
- **Secondary actor:** `iam` (`GET /users/me`, already-loaded shell session data — no new round-trip per NFR-006).
- **Preconditions:** User authenticated; shell session/user data resolved (not loading/unknown).
- **Main success scenario:**
  1. Shell renders session/user data with `emailVerified === false`.
  2. Banner mounts between `<Header>` and `<main>` (same slot as `SseDisconnectBanner`), `role="status"`, warning tone, mail icon, unverified copy + inline "Gửi mail xác thực" CTA.
  3. Banner is visible on every route while unverified and not dismissed this session.
  4. User clicks the banner's close (X) control.
  5. Banner hides for the remainder of the session/tab.
- **Alternative flows:**
  - A1 — User navigates to a different route within the same session after dismissing: banner stays hidden (dismiss persists in-session, not per-route).
  - A2 — User is already verified: banner never mounts (no dismiss control shown).
- **Exception flows:**
  - E1 — Verification status unresolved/unknown (session data not yet loaded, or fetch failed): banner SHALL NOT render (fail-closed, FR-001 errorConditions) — no flash of incorrect state.
  - E2 — User completes verification (UC-003) while banner visible on another mounted instance: banner disappears reactively (VM `emailVerified` flips true).
- **Business rules:** Session-scoped dismiss only (sessionStorage/in-memory per `[ASSUMPTION]`) — reappears on next full session (new login or reload) while still unverified. One banner instance app-wide (not per-route re-mount of dismiss state).
- **Non-functional constraints:** `role="status"` not `alert` (NFR-001); no blocking round-trip before shell first paint (NFR-006); warning text uses `--edu-warning-foreground` (NFR-003); close control keyboard-operable + `aria-label`.

### UC-002 — Shell banner: send verification email → sent state with 60s cooldown

- **Primary actor:** Authenticated user, banner visible (unverified state).
- **Secondary actor:** `iam` (`POST /users/me/email/verification`).
- **Preconditions:** Banner visible; resend cooldown not active.
- **Main success scenario:**
  1. User clicks "Gửi mail xác thực".
  2. Button shows brief pending/disabled state (no full-page spinner).
  3. `iam` returns `204` (or idempotent 204 if already verified — treated identically).
  4. Banner switches to "sent" state, copy references the user's email.
  5. 60s cooldown starts (shared clock, see UC-008), "Gửi lại" disabled until it elapses.
- **Alternative flows:**
  - A1 — User reopens/revisits the banner mid-cooldown (same tab, same session): cooldown continues from the shared clock, not reset (FR-004 "shared clock").
  - A2 — Idempotent 204 because email was already verified server-side (race with another tab): UI still shows "sent" + starts cooldown (no distinct error path per INT-002).
- **Exception flows:**
  - E1 — Transport/5xx or no response: banner shows a stable error state via translated errorKey; cooldown SHALL NOT start; "Gửi mail xác thực" remains actionable for retry.
  - E2 — `429` (`RATE_LIMIT_EXCEEDED`/`USER_TOO_MANY_ATTEMPTS`, inferred per INT-002 open question): banner surfaces BE `Retry-After` hint if present, else generic "Đã gửi quá nhiều yêu cầu, thử lại sau"; cooldown SHALL NOT start from this response.
- **Business rules:** Cooldown is a pure client-side timer (no `retryAfter` field in the 204 contract) started only on a genuinely successful (204, non-429) response.
- **Non-functional constraints:** No full-page spinner (in-flight = disabled button only); countdown exposed via `aria-live="polite"` (see UC-008).

### UC-003 — OTP dialog: open → 6-digit entry → confirm success

- **Primary actor:** Authenticated user, unverified.
- **Secondary actor:** `iam` (`POST /users/me/email/verification/confirm`).
- **Preconditions:** Dialog open (via banner-adjacent entry or Profile row "Xác thực ngay", UC-007); 6 digits entered.
- **Main success scenario:**
  1. User activates "Xác thực ngay" (Profile row, UC-007) or an equivalent banner-reachable entry.
  2. `EmailVerifyDialog` opens: reused `OtpInput` (6 cells, 46×52/radius-10), target email in description, Confirm + Resend actions (Resend respecting the shared cooldown, UC-008), focus trapped in dialog.
  3. User types 6 digits (auto-advance per cell, backspace-to-previous).
  4. User activates "Xác nhận".
  5. Confirm button shows pending/disabled state; OTP cells remain focusable (no full-dialog blocking spinner, NFR-004).
  6. `iam` returns `204`.
  7. Dialog shows success state (check icon + confirmation copy) with "Hoàn tất" to close.
  8. `emailVerified = true` propagates to `ProfileScreenVM` and the shell banner visibility check (banner disappears; Profile badge flips to "Đã xác thực").
  9. User activates "Hoàn tất"; focus returns to the invoking control (Profile row CTA or banner entry).
- **Alternative flows:**
  - A1 — User closes the dialog before completing (Escape/close control): dialog closes, no submission, code cleared from state (NFR-008), focus returns to invoking control.
  - A2 — Confirm-response handling is a local optimistic flip (per INT-003 option a, recommended) rather than a `/users/me` refetch — either is contract-valid; AC below assumes the observable outcome (VM flips), not the mechanism.
- **Exception flows:** see UC-004 (wrong code), UC-005 (expired code), UC-006 (too-many-attempts/lockout); plus:
  - E1 — Transport/5xx or no response, or `422 VALIDATION_FAILED` (malformed pattern — should be prevented client-side by `OtpInput`): generic retryable error state, code preserved for resubmission.
  - E2 — `401 UNAUTHORIZED_ACCESS` mid-flow: deferred to existing session/refresh handling (decision `0018`), not an email-verify-specific error.
- **Business rules:** Email remains read-only/immutable throughout (FR-008) — dialog never offers an edit-email affordance. One canonical `OtpInput` reused from forgot-password (FR-009, decision `0026`).
- **Non-functional constraints:** OTP group `role="group"` with labelled `aria-label`; per-cell `aria-label` "Chữ số thứ N"; keyboard-operable end-to-end (NFR-004); no layout break at 320px (NFR-005); OTP code never logged, cleared on close (NFR-008).

### UC-004 — OTP dialog: wrong-code error

- **Primary actor:** Authenticated user, dialog open, 6 digits submitted.
- **Secondary actor:** `iam` — returns `400 USER_INVALID_OTP` ("wrong, unknown, or already used").
- **Preconditions:** Dialog open, Confirm activated with a wrong/stale/already-used code.
- **Main success scenario (of the exception, i.e. expected error handling):**
  1. `iam` returns `400 USER_INVALID_OTP`.
  2. Mapped to existing `AuthFailure` type `{ type: "invalid-otp" }` (reuse `mapAuthError`/`CODE_MAP`, no new failure type).
  3. Dialog shows inline error text using `--edu-error-text`, `aria-invalid="true"` + `aria-describedby` on the OTP group.
  4. Code input(s) remain editable; submitted digits are NOT cleared (user can correct in place).
  5. Focus remains on/returns to the first OTP cell or stays where the user left it (no forced refocus-and-clear that would surprise a screen-reader user).
- **Alternative flows:**
  - A1 — User corrects the code and resubmits successfully: proceeds to UC-003 success.
  - A2 — User instead requests Resend: proceeds to UC-008 (shared cooldown) — Resend is available even on a wrong-code error (not gated behind exhausting attempts).
- **Exception flows:**
  - E1 — Repeated wrong codes reach the BE's 5-attempt cap: transitions to UC-006 (lockout), not this UC, on the 5th failure.
- **Business rules:** Wrong-code message MUST be textually distinct from expired-code (UC-005) and lockout (UC-006) — three distinct copy strings, not one generic bucket.
- **Non-functional constraints:** Error not conveyed by color alone (icon/text alongside `--edu-error-text`); error text read by screen reader via `aria-describedby` linkage, not only visual placement.

### UC-005 — OTP dialog: expired-code error (with resend affordance)

- **Primary actor:** Authenticated user, dialog open, 6 digits submitted after the code's validity window.
- **Secondary actor:** `iam` — returns `400 USER_OTP_EXPIRED` (15-minute validity window for verify, per `ERROR_CODES.md`).
- **Preconditions:** Dialog open; submitted code is syntactically valid but its 15-minute window has elapsed.
- **Main success scenario (of the exception):**
  1. `iam` returns `400 USER_OTP_EXPIRED`.
  2. Mapped to existing `{ type: "otp-expired" }` (no new failure type).
  3. Dialog shows the expired-code message (distinct copy from wrong-code, UC-004).
  4. Resend action is surfaced/emphasized alongside the error (per FR-006 explicit requirement) — same shared-cooldown Resend control as UC-008.
- **Alternative flows:**
  - A1 — Resend cooldown already elapsed (user waited before submitting): Resend is immediately actionable, requests a new code, restarts the 60s cooldown (UC-008), clears the expired-code error state once a new code is requested.
  - A2 — Resend cooldown still active (e.g. user already resent once and waited less than 60s before the expired submit): Resend control shows the live countdown, disabled until it reaches 0.
- **Exception flows:**
  - E1 — Resend itself fails (transport/5xx or 429): falls back to UC-002's exception flows (E1/E2) — expired-code error message stays visible until a successful resend.
- **Business rules:** Expired-code copy must not be reused for wrong-code (UC-004) or lockout (UC-006) — three distinct strings under `emailVerify.dialog.error*`.
- **Non-functional constraints:** Same a11y treatment as UC-004 (`aria-invalid`, `--edu-error-text`, non-color-only).

### UC-006 — OTP dialog: too-many-attempts lockout (defensive, [OPEN QUESTION]-flagged state)

> Modeled defensively per integration.md's explicit flag: `USER_TOO_MANY_ATTEMPTS`
> (429, "failed-attempt cap of 5 reached; code locked") is a real, already-mapped
> `iam` error code for OTP confirm (INT-003), distinct from wrong-code/expired-code,
> but not named in the original FR-006/DR-016 copy. The 429-on-resend
> (`INT-002`) rate-limit is a **separate, orthogonal** open question — see
> AC-006.4 below — and must not be conflated with this OTP-lockout state.

- **Primary actor:** Authenticated user, dialog open, has submitted 5 failed OTP attempts against the same outstanding code.
- **Secondary actor:** `iam` — returns `429 USER_TOO_MANY_ATTEMPTS` on the 5th (or later) confirm attempt.
- **Preconditions:** Dialog open; user has exhausted the BE's failed-attempt cap for the current outstanding code.
- **Main success scenario (of the exception):**
  1. `iam` returns `429 USER_TOO_MANY_ATTEMPTS`.
  2. Mapped to existing `{ type: "too-many-requests" }` (no new failure type — already in `auth.failure.ts`/`CODE_MAP`).
  3. Dialog shows a message distinct from both wrong-code and expired-code — "quá nhiều lần thử, yêu cầu mã mới" (generic "too many attempts, request a new code" framing) — treated UX-wise like expired-code (message + emphasized Resend), per integration.md's recommendation, but with its own copy string.
  4. Resend action is surfaced (same shared-cooldown control as UC-008).
  5. The OTP input cells are disabled/cleared until a new code is requested (the locked code can never succeed — distinct from UC-004's "stay editable" because retrying the SAME code is guaranteed to fail server-side once locked). **[OPEN QUESTION → ba-lead/iam BE team, per integration.md]**: confirm whether iam's lockout is scoped to the specific code (cleared by requesting a new one) or to the account/window (a resend would not unlock it) — AC below assumes the former (resend unlocks) since that is the only actionable UX; flag if BE confirms otherwise.
- **Alternative flows:**
  - A1 — User immediately activates Resend: new code requested, 60s cooldown restarts (UC-008), lockout message clears, OTP cells re-enable for the new code.
- **Exception flows:**
  - E1 — Resend also fails/is itself rate-limited: falls back to UC-002's exception flows.
- **Business rules:** This state is NOT the same as the banner/dialog Resend's own 429 (UC-002 E2) — that 429 is on the *send/resend* endpoint (INT-002, presence unconfirmed by openapi per integration.md open question); this UC's 429 is on the *confirm* endpoint (INT-003, confirmed present in `ERROR_CODES.md`). Do not merge their copy or their AC.
- **Non-functional constraints:** Same a11y treatment as UC-004/UC-005 (`aria-invalid`/live-region announcement of the state change, not color-only).

### UC-007 — Profile personal-info row: verified vs unverified status + "Xác thực ngay" entry point

- **Primary actor:** Authenticated user viewing the Profile screen's personal-info tab.
- **Secondary actor:** `iam` (`GET /users/me`, `isEmailVerified` field — same session data as UC-001, no separate fetch per NFR-006).
- **Preconditions:** Profile screen loaded (US-E08.5 baseline), personal-info tab active.
- **Main success scenario (unverified):**
  1. Row renders adjacent to the existing `profile.personal.email` `Field`.
  2. Badge shows "Chưa xác thực" (warning tone + icon, not color-only).
  3. "Xác thực ngay" CTA renders next to the badge.
  4. User activates "Xác thực ngay" → `EmailVerifyDialog` opens (UC-003), sharing the cooldown clock with the banner (UC-008).
- **Main success scenario (verified):**
  1. Row renders the same slot.
  2. Badge shows "Đã xác thực" (success tone + check icon).
  3. No CTA rendered (verified state hides the CTA per FR-007).
- **Alternative flows:**
  - A1 — User completes verification via the banner entry point instead of this row (UC-002→UC-003): row's badge flips to "Đã xác thực" reactively without a page reload (same VM update as UC-003 step 8).
- **Exception flows:**
  - E1 — Verification status fetch fails / status unresolved: row renders the existing email value WITHOUT a badge (neutral/loading, not a wrong or stale status) — mirrors the banner's fail-closed behavior (UC-001 E1).
- **Business rules:** Email field itself stays disabled/read-only exactly as today (US-E08.5) — this feature adds a status row, never an edit affordance (FR-008).
- **Non-functional constraints:** Badge status conveyed by icon + text, not color alone (NFR-003); CTA keyboard-reachable in tab order.

### UC-008 — Resend-cooldown countdown: shared clock + accessibility (announced, not just visual)

- **Primary actor:** Authenticated user, has just triggered a successful send/resend (banner CTA UC-002, dialog Resend UC-003/004/005/006).
- **Secondary actor:** Screen reader / assistive tech (consumes the `aria-live="polite"` region).
- **Preconditions:** A send or resend call has just succeeded (204, non-429).
- **Main success scenario:**
  1. 60s cooldown starts on the shared clock (one timer per outstanding verification request, not two independent timers for banner vs dialog).
  2. Visually: "Gửi lại"/"Gửi lại mã" control is disabled; countdown text updates each second (e.g. "Gửi lại sau 59s"... "58s"...).
  3. The countdown text lives in an `aria-live="polite"` region so assistive tech is informed of the state (per-second ticking is NOT required to be announced every second — screen readers naturally throttle rapid live-region updates — but at minimum start and end/re-enabled transitions ARE announced, per NFR-002's "at minimum start/end of countdown").
  4. At 0, control re-enables; the live region announces the control is now actionable (e.g. "Bạn có thể gửi lại mã").
  5. If the user closes the dialog and reopens it (banner still visible, or Profile row CTA reactivated) before 60s elapses, the SAME remaining countdown is shown (state persists per FR-004's "survive dialog close/reopen within the same page load").
- **Alternative flows:**
  - A1 — User triggers cooldown from the banner, then opens the dialog before it elapses: dialog's Resend control shows the same remaining time (shared clock, not reset to 60s).
  - A2 — User triggers cooldown from the dialog's Resend, then navigates to a route where the banner is visible: banner's "Gửi lại" reflects the same remaining time.
- **Exception flows:**
  - E1 — User navigates away and returns within the same session/tab before the cooldown elapses: cooldown state persists consistently (FR-004 errorConditions) — not reset by route change.
  - E2 — Page is fully reloaded (new page load) mid-cooldown: per the mockup's `useEVCooldown` hook being scoped to "within the same page load," a full reload MAY reset the client-side timer — this is an accepted client-only limitation (no BE-provided `nextResendAt` exists per integration.md §3) and is NOT a defect; document as expected behavior, not a bug to fix.
- **Business rules:** Cooldown is purely client-side (no `retryAfter` field in the 204 contract, integration.md §3) — never treat a 429 error response as a trigger to start or continue this countdown (UC-002 E2, UC-006 stay distinct concerns).
- **Non-functional constraints:** `aria-live="polite"` not `assertive` (non-interrupting, NFR-002); control fully keyboard-operable while disabled/enabled; countdown never the ONLY signal of state (disabled attribute + visible text together).

## 4. Acceptance Criteria

### UC-001: Shell banner — unverified + dismiss-per-session

```
AC-001.1 Loading — Given the shell's session/user data has not yet resolved,
  Then the banner SHALL NOT render (no flash of any state).
AC-001.2 Empty (n/a — verified) — Given emailVerified === true, Then the
  banner never mounts and no dismiss control is rendered.
AC-001.3 Error — Given the session/user data fetch fails or returns an
  unresolved/unknown verification status, Then the banner SHALL NOT render
  (fail-closed per FR-001), matching AC-001.1's behavior (no distinct error
  banner for this specific fetch — it fails silently closed).
AC-001.4 Success (unverified, banner visible) — Given emailVerified === false
  and session data resolved, When the shell renders any route, Then a banner
  with role="status", warning tone, mail icon, unverified message (vi/en) and
  an inline "Gửi mail xác thực" CTA renders between Header and main content.
AC-001.5 Dismiss — Given the banner is visible, When the user activates the
  close (X) control, Then the banner hides for the remainder of the
  session/tab and does not reappear on subsequent route navigations within
  the same session.
AC-001.6 Reappear next session — Given the user dismissed the banner in a
  prior session and is still unverified, When a new session starts (fresh
  login or full page reload per [ASSUMPTION]), Then the banner renders again.
AC-001.7 Keyboard — Given the banner is visible, Then the close control and
  the send CTA are reachable and operable via Tab/Enter/Space with a visible
  focus ring.
```

### UC-002: Banner send → sent state with 60s cooldown

```
AC-002.1 Loading — Given the user clicks "Gửi mail xác thực", Then the button
  shows a pending/disabled state (aria-busy or equivalent) without a
  full-page spinner.
AC-002.2 Success — Given the send request returns 204, Then the banner
  switches to a "sent" state referencing the user's email (vi/en) and the 60s
  cooldown starts (shared clock, see UC-008).
AC-002.3 Idempotent-verified — Given the send request returns 204 because the
  email was already verified server-side, Then the UI treats it identically
  to AC-002.2 (sent state + cooldown starts) — no special-case error.
AC-002.4 Error (transport/5xx) — Given the send request fails with a
  transport error or 5xx, Then the banner shows a stable error state via a
  translated errorKey, the cooldown SHALL NOT start, and "Gửi mail xác thực"
  remains actionable for retry.
AC-002.5 Error (rate-limited, defensive) — Given the send request returns 429
  (RATE_LIMIT_EXCEEDED/USER_TOO_MANY_ATTEMPTS), Then the banner surfaces the
  BE Retry-After hint if present, else the generic "Đã gửi quá nhiều yêu cầu,
  thử lại sau" message, and the cooldown SHALL NOT start from this response.
AC-002.6 Mid-cooldown reopen — Given a cooldown is already running, When the
  user revisits the banner mid-countdown, Then the remaining time (not a
  fresh 60s) is shown.
```

### UC-003: OTP dialog — open → 6-digit entry → confirm success

```
AC-003.1 Loading (open) — Given the user activates an entry point
  (Profile row "Xác thực ngay" or banner-adjacent entry), Then
  EmailVerifyDialog opens immediately with the OTP group, target email in
  the description, Confirm + Resend actions, and focus trapped inside.
AC-003.2 Empty — Given the dialog just opened, Then all 6 OTP cells are empty
  and Confirm is disabled until all 6 are filled.
AC-003.3 Loading (submit) — Given all 6 digits are entered and the user
  activates "Xác nhận", Then the Confirm button shows a pending/disabled
  state while OTP cells remain focusable (no full-dialog blocking spinner).
AC-003.4 Success — Given the confirm request returns 204, Then the dialog
  shows a success state (check icon + confirmation copy, vi/en) with a
  "Hoàn tất" action, the shell banner (if mounted) disappears, and the
  Profile row badge flips to "Đã xác thực" without a page reload.
AC-003.5 Close — Given the user activates "Hoàn tất" or closes the dialog
  before submitting, Then focus returns to the control that opened the
  dialog and any entered code is cleared from state (never logged/persisted).
AC-003.6 Keyboard — Given the dialog is open, Then OTP cells auto-advance on
  digit entry, backspace moves to the previous cell, and Confirm/Resend/Close
  are all reachable via Tab with a visible focus ring; focus is trapped
  within the dialog while open.
AC-003.7 Responsive — Given a 320px viewport, Then the dialog and OTP cells
  render without horizontal scroll or cell overlap.
```

### UC-004: OTP dialog — wrong-code error

```
AC-004.1 Error — Given the user submits a code that iam rejects with
  USER_INVALID_OTP, Then the dialog shows inline error text using
  --edu-error-text, sets aria-invalid="true" + aria-describedby on the OTP
  group, and the copy is textually distinct from the expired-code (UC-005)
  and lockout (UC-006) messages.
AC-004.2 Editable — Given the wrong-code error is shown, Then the OTP cells
  remain editable (not disabled/cleared) so the user can correct the code
  in place.
AC-004.3 Resend still available — Given the wrong-code error is shown, Then
  the Resend action remains available (subject to the shared cooldown,
  UC-008), not gated behind exhausting attempts.
AC-004.4 Non-color-only — Given the wrong-code error is shown, Then the error
  is conveyed by icon/text, not by color alone, and is announced to assistive
  tech via aria-describedby linkage.
```

### UC-005: OTP dialog — expired-code error (with resend affordance)

```
AC-005.1 Error — Given the user submits a syntactically valid code whose
  15-minute validity window has elapsed (iam returns USER_OTP_EXPIRED), Then
  the dialog shows the expired-code message (distinct copy from AC-004.1 and
  UC-006's lockout copy), styled per AC-004.1's contrast/aria treatment.
AC-005.2 Resend emphasized — Given the expired-code error is shown, Then the
  Resend action is surfaced/emphasized alongside the error text.
AC-005.3 Resend available immediately — Given the shared cooldown has already
  elapsed, When the user activates Resend, Then a new code is requested, the
  60s cooldown restarts (UC-008), and the expired-code error clears.
AC-005.4 Resend still cooling down — Given the shared cooldown has NOT
  elapsed, Then the Resend control shows the live countdown and stays
  disabled until it reaches 0, with the expired-code error still visible.
```

### UC-006: OTP dialog — too-many-attempts lockout (defensive)

```
AC-006.1 Error (lockout) — Given the user's 5th (or later) failed OTP attempt
  against the same outstanding code returns 429 USER_TOO_MANY_ATTEMPTS, Then
  the dialog shows a message distinct from both wrong-code (UC-004) and
  expired-code (UC-005) — framed as "too many attempts, request a new code"
  (vi/en) — mapped from the existing {type: "too-many-requests"} AuthFailure.
AC-006.2 Cells locked — Given the lockout state is shown, Then the OTP input
  cells are disabled (not left editable) since resubmitting the same code is
  guaranteed to fail, and Resend is surfaced/emphasized.
AC-006.3 Unlock via resend — Given the lockout state is shown, When the user
  activates Resend and a new code is successfully requested, Then the
  lockout message clears, OTP cells re-enable for the new code, and the 60s
  cooldown restarts (UC-008). [OPEN QUESTION → ba-lead/iam confirm this is
  the actual BE behavior — see UC-006 body.]
AC-006.4 Distinct from resend-endpoint rate limit — Given a 429 occurs on the
  SEND/RESEND endpoint (UC-002 AC-002.5) rather than the CONFIRM endpoint,
  Then the copy and AC of AC-002.5 apply instead of this UC's — the two 429
  sources are never merged into one message.
```

### UC-007: Profile personal-info row — verified vs unverified + entry point

```
AC-007.1 Loading — Given the Profile screen's personal-info tab is
  rendering before verification status resolves, Then the row shows the
  existing email value WITHOUT any badge (neutral, not a stale/wrong status).
AC-007.2 Empty (n/a) — Not applicable; the row always has an email value once
  the Profile screen has loaded (US-E08.5 baseline).
AC-007.3 Error — Given the verification-status fetch fails, Then the row
  behaves identically to AC-007.1 (email shown, no badge) rather than
  showing an incorrect status.
AC-007.4 Success (unverified) — Given emailVerified === false, Then the row
  shows a "Chưa xác thực" badge (warning tone + icon) and a "Xác thực ngay"
  CTA adjacent to the existing email Field.
AC-007.5 Success (verified) — Given emailVerified === true, Then the row
  shows a "Đã xác thực" badge (success tone + check icon) and NO CTA.
AC-007.6 Entry point — Given the unverified row is shown, When the user
  activates "Xác thực ngay", Then EmailVerifyDialog opens (UC-003) sharing
  the cooldown clock with the banner entry point (UC-008).
AC-007.7 Reactive update — Given the user verifies via the banner entry
  point instead, Then this row's badge flips to "Đã xác thực" without a page
  reload.
AC-007.8 Immutable email — Given the row is shown in any state, Then the
  adjacent email Field remains disabled/read-only exactly as before this
  feature (no edit affordance added).
```

### UC-008: Resend-cooldown countdown — shared clock + accessibility

```
AC-008.1 Start — Given a send/resend request just succeeded (204, non-429),
  Then a 60s cooldown starts; the Resend/"Gửi lại" control is disabled and
  shows live countdown text.
AC-008.2 Announced (not just visual) — Given the cooldown is running, Then
  the countdown text is exposed via an aria-live="polite" region such that a
  screen reader announces at minimum the start of the countdown and the
  re-enabled/actionable transition at 0 (per-second announcement is not
  required).
AC-008.3 Re-enable — Given the cooldown reaches 0, Then the control
  re-enables and the live region announces the control is now actionable
  (e.g. "Bạn có thể gửi lại mã").
AC-008.4 Shared clock across surfaces — Given a cooldown was started from the
  banner, When the user opens the dialog before it elapses, Then the
  dialog's Resend shows the SAME remaining time (not a fresh 60s), and vice
  versa (dialog-started cooldown reflected in the banner).
AC-008.5 Persists across dialog close/reopen — Given a cooldown is running
  and the user closes then reopens the dialog within the same page load,
  Then the remaining time is preserved (not reset).
AC-008.6 Not started by errors — Given a send/resend/confirm call returns any
  error (429, 5xx, transport failure), Then the cooldown SHALL NOT start or
  restart from that response.
AC-008.7 Reload resets (documented, not a defect) — Given the user performs a
  full page reload mid-cooldown, Then the client-side timer MAY reset to
  inactive (no BE-provided nextResendAt exists) — this is expected behavior,
  not a bug.
AC-008.8 Keyboard — Given the cooldown is active or elapsed, Then the
  Resend control remains reachable via Tab in both states (disabled state
  still focus-visible per WCAG, or at minimum documented in the surrounding
  copy) and never relies on color alone to convey disabled/enabled.
```

## 5. Edge Case Matrix

| Feature / UC | Empty | Max-length / boundary | Concurrent (2nd tab/session) | Auth-expired (401) | Network-error | Wrong-role |
|---|---|---|---|---|---|---|
| UC-001 Banner unverified/dismiss | No user data yet → banner hidden (AC-001.1) | n/a | Dismiss is per-session/tab (sessionStorage/in-memory) — a 2nd tab shows the banner independently (not synced) | Deferred to existing session/refresh flow (decision 0018), not a new banner-specific error | Fetch fails → fail-closed, no banner (AC-001.3) | n/a — identical across all 4 roles |
| UC-002 Banner send/cooldown | n/a | n/a | Cooldown clock is per active dialog/banner instance in the SAME session (shared clock per FR-004); a 2nd browser tab has its own independent client timer (no cross-tab sync — not required by contract) | Deferred to existing session/refresh flow | AC-002.4 stable error, no cooldown start | n/a |
| UC-003 OTP open/confirm success | 6 empty cells on open, Confirm disabled (AC-003.2) | Exactly 6 digits enforced by OtpInput pattern (`^[0-9]{6}$`); non-numeric/over-length rejected client-side before submit | If verified in another tab mid-dialog, local confirm still attempts submit; iam's idempotent-204-like behavior for confirm is not documented — falls to AC-003.4 success path if 204, or generic error otherwise | AC E2 — deferred to session/refresh flow | Generic retryable error, code preserved (UC-003 E1) | n/a |
| UC-004 Wrong-code | n/a | Code has correct length but wrong value | Two tabs racing to submit the same code: first succeeds, second (already-used) also maps to USER_INVALID_OTP ("already used" per ERROR_CODES.md) → AC-004.1 applies | Deferred | Falls to UC-003 E1 generic bucket instead | n/a |
| UC-005 Expired-code | n/a | Submitted just past the 15-minute window | n/a | Deferred | Resend itself can fail → falls back to UC-002 exceptions | n/a |
| UC-006 Too-many-attempts lockout | n/a | Exactly the 5th failed attempt triggers 429 | n/a | Deferred | Resend itself can fail → falls back to UC-002 exceptions | n/a |
| UC-007 Profile row | Status unresolved → no badge (AC-007.1) | n/a | Verified in another tab → this tab's row updates reactively only if it re-reads session data (see [OPEN QUESTION] below on refetch vs. cross-tab sync) | Deferred | No badge shown (AC-007.3) | n/a |
| UC-008 Cooldown accessibility | n/a | Boundary at exactly 60s→0 transition (AC-008.3) | Cross-tab NOT synced (client-only timer, no BE nextResendAt) — documented limitation | n/a (cooldown itself has no auth dependency) | A cooldown never "errors" itself; the triggering send/resend call can (AC-008.6) | n/a |

## 6. Open Questions

- `[OPEN QUESTION → ba-lead / iam BE team]` (carried from integration.md) Does
  `POST /users/me/email/verification` (send/resend) enforce its own
  server-side rate limit distinct from the UI's 60s cooldown? AC-002.5 is
  modeled defensively; confirm so the copy/Retry-After handling isn't dead
  code or, conversely, isn't missing a real BE hint.
- `[OPEN QUESTION → ba-lead / iam BE team]` For UC-006 (too-many-attempts
  lockout): is the lockout scoped to the specific outstanding code (cleared
  by requesting a new one via Resend, as AC-006.3 assumes) or to the
  account/time-window (a resend would NOT unlock it)? This changes whether
  AC-006.3's "unlock via resend" is correct or whether the dialog instead
  needs a longer-form "try again later" state with no immediate Resend path.
- `[OPEN QUESTION → ba-lead]` (carried from integration.md) Pre-existing
  field-name drift between the web's `UserProfileResponseDto` and iam's
  documented `UserProfileResponse` schema — out of scope for this story's
  AC, but the Profile-row/banner correctness (UC-001, UC-007) depends on
  `emailVerified`/`isEmailVerified` actually round-tripping correctly through
  whatever transform `auth.repository.ts` currently applies.
- `[OPEN QUESTION → fe-state-engineer / fe-component-architect]` Whether
  UC-003's success propagation (AC-003.4, "banner disappears, badge flips")
  is implemented as an optimistic local flip or a `/users/me` refetch does
  not change any AC in this document (both satisfy the observable behavior),
  but affects whether AC-007.7 ("reactive update" across the banner and
  Profile row) is trivially true (shared client state) or requires an
  explicit refetch/invalidation — flag for the implementer to ensure AC-007.7
  is actually satisfied by their chosen mechanism.
- `[OPEN QUESTION → ba-lead]` Cross-tab synchronization is explicitly NOT
  required by any AC in this document (cooldown, banner-dismiss, and
  verified-status are all single-tab/session concerns per the assumptions in
  requirements.md) — confirm this is acceptable UX (a user verifying in Tab A
  will still see "unverified" in Tab B until Tab B's own session data
  refreshes) or whether a follow-up story should add BroadcastChannel/storage
  event sync.
