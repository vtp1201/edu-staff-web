# US-E22.1 — Email Verification (banner + OTP dialog + Profile row) — Requirements

Source design: `docs/design-requests/DR-016-email-verification.md` (delivered
2026-07-12), `docs/product/design-spec.jsonc` → `screens.emailVerify` (line
~1727), mockup `design_src/edu/email-verify.jsx`.

## 1. Requirements Summary

The system SHALL let any authenticated user verify their account email via an
app-shell banner, a status row on the existing Profile screen, and a 6-digit
OTP confirmation dialog. This is an **extension** of the implemented Profile
screen (`src/features/user/presentation/profile/`, US-E08.5) plus a new
shell-level banner mounted in `AppShell`. Actors: all 4 roles (teacher,
principal, student, parent) — account-level, not role-gated. Key constraints:
60s resend cooldown (stateful, must survive dialog close/reopen within the
same page load per the mockup's `useEVCooldown` hook), reuse of the existing
auth OTP cell pattern (do not build a second OTP component), WCAG 2.1 AA
(`role="status"` not `alert`, cooldown announced via `aria-live=polite`, no
color-only status), i18n vi/en, and the actual email-sending being entirely a
BE (`iam`) concern.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-221",
  "title": "Email Verification (shell banner + Profile row + OTP dialog)",
  "status": "Draft",
  "actors": [
    { "role": "teacher", "capabilities": ["view verification status", "request verification email", "submit OTP", "dismiss banner (session)"] },
    { "role": "principal", "capabilities": ["view verification status", "request verification email", "submit OTP", "dismiss banner (session)"] },
    { "role": "student", "capabilities": ["view verification status", "request verification email", "submit OTP", "dismiss banner (session)"] },
    { "role": "parent", "capabilities": ["view verification status", "request verification email", "submit OTP", "dismiss banner (session)"] }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL render an app-shell banner below the Header and above route content on every route when the current user's email is unverified.",
      "trigger": "Authenticated session render, user.emailVerified === false",
      "preconditions": ["User authenticated", "Verification status resolved (not loading)"],
      "postconditions": ["Banner visible with role=\"status\", warning tone, mail icon, unverified message + inline send CTA"],
      "errorConditions": ["Verification status unresolved/unknown → banner SHALL NOT render (fail closed, avoid flashing incorrect state)"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL allow the user to dismiss the banner for the current session only (not persisted across sessions/reloads).",
      "trigger": "User activates the banner's close (X) control",
      "preconditions": ["Banner is visible"],
      "postconditions": ["Banner hidden for the remainder of the session/tab; reappears on next full session (e.g. new login or page reload per [ASSUMPTION] below) while still unverified"],
      "errorConditions": []
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL send a verification email when the user activates the banner's \"Gửi mail xác thực\" CTA, calling POST /api/v1/users/me/email/verification (service iam).",
      "trigger": "User clicks send CTA in banner (unverified/default state)",
      "preconditions": ["User authenticated", "Email unverified", "Resend cooldown not active"],
      "postconditions": ["Banner switches to \"sent\" state (updated text referencing the user's email) and starts a 60s cooldown before \"Gửi lại\" becomes active"],
      "errorConditions": ["Send request fails (network/5xx) → banner SHALL show a stable error state via a translated errorKey, cooldown SHALL NOT start", "Rate-limited by BE → surface the BE-provided retry hint if present, else generic retry error"]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL enforce a 60-second resend cooldown, client-visible as a live countdown, before the \"Gửi lại\" (banner) / \"Gửi lại mã\" (dialog) affordance becomes actionable again.",
      "trigger": "Successful send/resend response",
      "preconditions": ["A send or resend call has just succeeded"],
      "postconditions": ["Countdown decrements each second; control is disabled while counting; control re-enables at 0; countdown text is exposed via aria-live=\"polite\" per FR-011"],
      "errorConditions": ["User navigates away and returns within the same session/tab before cooldown elapses → cooldown state SHALL persist consistently for banner and dialog per FR-005 (shared clock)] "
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL open the EmailVerifyDialog (OTP confirmation) when the user activates \"Xác thực ngay\" from the Profile row, and SHALL share the same in-flight cooldown state as the banner (one 60s clock per pending verification request, not two independent timers).",
      "trigger": "User clicks \"Xác thực ngay\" on the Profile personal-info row",
      "preconditions": ["Email unverified"],
      "postconditions": ["Dialog opens with a 6-digit OTP input (reused auth OtpInput pattern), Confirm + Resend (respecting the shared cooldown) actions, and the target email shown in the description"],
      "errorConditions": []
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL submit the entered 6-digit code to POST /api/v1/users/me/email/verification/confirm and, on success, SHALL show a success state (check icon + confirmation copy) and update the verified status everywhere it is displayed (banner disappears, Profile badge flips to \"Đã xác thực\").",
      "trigger": "User activates \"Xác nhận\" with all 6 OTP cells filled",
      "preconditions": ["Dialog open", "6 digits entered"],
      "postconditions": ["verified=true propagated to Profile VM and shell banner visibility check", "Dialog shows success state with \"Hoàn tất\" to close"],
      "errorConditions": [
        "Wrong code → BE error mapped to a stable failure-union type (e.g. errorKey \"wrong-code\"); dialog SHALL show inline error text using --edu-error-text + aria-invalid on the OTP group, code input SHALL remain editable",
        "Expired code → errorKey \"expired-code\"; dialog SHALL show the expired message and surface the Resend action",
        "Transport/5xx failure → generic retryable error state, code preserved for resubmission"
      ]
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL display a verification-status row on the Profile screen's existing personal-info tab, immediately adjacent to the existing profile.personal.email field: status badge (\"Đã xác thực\" success+check / \"Chưa xác thực\" warning+icon) plus, when unverified, a \"Xác thực ngay\" CTA.",
      "trigger": "Profile screen render, personal-info tab active",
      "preconditions": ["Profile screen loaded (US-E08.5 baseline)"],
      "postconditions": ["Row renders next to the email Field component in profile-screen.tsx's personal TabsContent; verified state hides the CTA"],
      "errorConditions": ["Verification status fetch fails → row SHALL show the existing email value without a stale/incorrect badge (render neutral/loading, not a wrong status)"]
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL treat the account email as read-only/immutable in this flow — verification never implies an email-change capability.",
      "trigger": "N/A (constraint on FR-007/FR-005)",
      "preconditions": [],
      "postconditions": ["Email field remains disabled as today (US-E08.5); no edit affordance is added by this feature"],
      "errorConditions": []
    },
    {
      "id": "FR-009",
      "priority": "Should",
      "description": "The system SHOULD reuse the existing OTP cell component (`src/features/auth/presentation/forgot-password/otp-input.tsx`, `OtpInput`) for the EmailVerifyDialog rather than building a new one, adapting only the aria-label copy (\"Chữ số thứ N\") and error-state styling per the emailVerify dialog spec.",
      "trigger": "Implementation of EmailVerifyDialog",
      "preconditions": ["OtpInput component exists and matches the 46x52/radius-10 cell spec"],
      "postconditions": ["One canonical OTP cell component used by both forgot-password and email-verify flows (decision 0026, component-organization.md) — promote to components/shared/ if the two call sites need to diverge in props"],
      "errorConditions": []
    },
    {
      "id": "FR-010",
      "priority": "Won't",
      "description": "The system SHALL NOT implement or configure the underlying email-delivery infrastructure (SMTP/provider, template rendering, deliverability) — this is entirely owned by the iam BE service.",
      "trigger": "N/A",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    { "id": "NFR-001", "category": "Accessibility", "requirement": "Banner uses role=\"status\" (non-urgent), not role=\"alert\".", "measurableTarget": "axe/impeccable audit: no role misuse; matches decision 0013" },
    { "id": "NFR-002", "category": "Accessibility", "requirement": "OTP group has role=\"group\" with a labelled group aria-label and per-cell aria-label \"Chữ số thứ N\"; cooldown countdown text is exposed via aria-live=\"polite\" (not color/visual-only).", "measurableTarget": "Screen reader announces each cooldown tick or at minimum start/end of countdown; WCAG 4.1.3" },
    { "id": "NFR-003", "category": "Accessibility", "requirement": "Warning-tone banner text uses --edu-warning-foreground on the warning background, never white; error text in the dialog uses --edu-error-text, never a background-only destructive color.", "measurableTarget": "Contrast ≥4.5:1 text / ≥3:1 large text&icons (WCAG AA)" },
    { "id": "NFR-004", "category": "Accessibility", "requirement": "Dialog is fully keyboard-operable: OTP cell auto-advance on digit entry, backspace-to-previous-cell, Confirm/Resend/Close reachable by Tab, focus trapped within dialog while open, focus returns to the invoking control on close.", "measurableTarget": "Keyboard-only manual walkthrough passes; focus ring always visible (--ring)" },
    { "id": "NFR-005", "category": "Responsive", "requirement": "Banner and dialog do not break layout at 320px width; dialog remains usable (no horizontal scroll, OTP cells wrap/shrink per design-spec, not overlap).", "measurableTarget": "No layout break at 320/375/768/1280px" },
    { "id": "NFR-006", "category": "Performance", "requirement": "Verification-status check (needed to decide banner visibility) SHALL NOT block first paint of the shell; use existing session/user data already fetched for the shell rather than an additional blocking round-trip.", "measurableTarget": "No added blocking request before shell first paint; perceived banner mount ≤ next paint after user/session data resolves" },
    { "id": "NFR-007", "category": "i18n", "requirement": "All banner/dialog copy lives under a new emailVerify namespace; all Profile-row copy extends the existing profile.personal namespace (no duplicate keys) in both vi.json (source) and en.json (mirror).", "measurableTarget": "bunx tsc --noEmit passes (typed messages); no hardcoded Vietnamese diacritics in .tsx outside messages/mock" },
    { "id": "NFR-008", "category": "Security", "requirement": "OTP confirm/resend calls SHALL be authenticated (Authorization: Bearer <accessToken>) server-action-mediated; no OTP code or verification token is logged or persisted client-side beyond the input field state.", "measurableTarget": "No PII/secret in client console logs; code cleared from state on dialog close" }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    { "source": "iam", "entity": "user.emailVerified (status flag, likely part of /users/me)", "sensitivity": "Internal" },
    { "source": "iam", "entity": "POST /users/me/email/verification (send/resend verification email)", "sensitivity": "Internal" },
    { "source": "iam", "entity": "POST /users/me/email/verification/confirm (OTP confirm)", "sensitivity": "Confidential (OTP code)" }
  ],
  "scope": {
    "inScope": [
      "App-shell banner (unverified + sent states, session-scoped dismiss, 60s cooldown)",
      "Profile personal-info row: status badge + \"Xác thực ngay\" CTA next to existing email field",
      "EmailVerifyDialog: 6-digit OTP entry (reusing existing auth OtpInput pattern), Confirm, Resend with shared cooldown, error state (wrong/expired), success state",
      "i18n keys: net-new emailVerify namespace (vi+en) + additive profile.personal.* keys (vi+en)",
      "Client-side integration with iam's two verification endpoints via a server action + repository, mapped to a stable failure-union type"
    ],
    "outOfScope": [
      "Email-delivery infrastructure itself (SMTP/provider/template) — iam BE concern",
      "Designing a new OTP component — MUST reuse src/features/auth/presentation/forgot-password/otp-input.tsx pattern",
      "Changing the email value itself (no edit/change-email flow)",
      "Role-gating (feature is account-level, applies identically to all 4 roles)",
      "Demo-only helper text seen in the mockup (\"Demo: mã đúng 123456...\") — explicitly excluded from production copy per DR-016"
    ],
    "externalDependencies": [
      "iam service: POST /api/v1/users/me/email/verification, POST /api/v1/users/me/email/verification/confirm",
      "iam service: source of the emailVerified flag (likely surfaced via existing GET /users/me — ba-integration-analyst to confirm exact field/shape)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] Banner dismiss is scoped to the browser tab/session (e.g. sessionStorage or in-memory state), reappearing on next login/full reload while still unverified — DR-016 says \"dismissible per session\" but does not specify the exact persistence mechanism.",
    "[ASSUMPTION] The banner and Profile-row/dialog share one 60s cooldown clock per outstanding verification request (not two independent timers), since both ultimately hit the same iam endpoint for the same user.",
    "[ASSUMPTION] emailVerified status is available from data already loaded for the authenticated shell (e.g. GET /users/me) rather than requiring a new dedicated endpoint — to be confirmed by ba-integration-analyst against iam's INTEGRATION.md.",
    "[ASSUMPTION] Wrong-code and expired-code are distinguishable BE error codes (not a single generic error), enabling the two distinct dialog messages specified in the mockup/design-spec."
  ],
  "openQuestions": [
    "Does iam's GET /users/me already return an emailVerified/emailVerifiedAt field, or does verification status require a separate call? (for ba-integration-analyst)",
    "Is there a BE-side rate limit/lockout beyond the 60s client cooldown (e.g. max resend attempts per hour) that the UI should surface distinctly from a generic error?"
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
|---|---|---|---|
| FR-001 | Shell banner renders when unverified | Must | Core discovery mechanism; without it users have no prompt outside Profile |
| FR-002 | Session-scoped dismiss | Must | DR-016 explicit UX requirement; avoids nagging every route load |
| FR-003 | Send verification email (banner CTA) | Must | Primary trigger of the whole flow |
| FR-004 | 60s resend cooldown | Must | DR-016 explicit; prevents email-send abuse/spam |
| FR-005 | OTP dialog opens from Profile row, shared cooldown | Must | Core confirmation UX; shared clock avoids confusing double-cooldowns |
| FR-006 | OTP confirm + success/error states | Must | Core value delivery (the actual verification) |
| FR-007 | Profile row status badge + CTA | Must | DR-016 explicit; second entry point besides the banner |
| FR-008 | Email remains immutable | Must | Prevents scope creep into email-change, keeps security model simple |
| FR-009 | Reuse existing OtpInput | Should | Component-organization rule (decision 0026); avoids duplicate OTP component |
| FR-010 | No email infra work | Won't | Explicitly out of scope — iam BE responsibility |

## 4. Handoff Notes

**For `ba-integration-analyst`:**
- Confirm exact shape/location of the `emailVerified` flag — check if it's already on the `GET /users/me` DTO (iam `INTEGRATION.md`/`openapi.yaml`) or needs a dedicated read. This determines whether `ProfileScreenVM` gets a new field or a separate fetch is needed.
- Map `POST /api/v1/users/me/email/verification` and `.../confirm` request/response shapes, and the distinct error codes for wrong-code vs expired-code vs rate-limited, per `.claude/rules/api-integration.md` envelope conventions (server action returns a stable `errorKey`, presentation translates via the new `emailVerify.dialog.error*` keys).
- Note existing precedent: `AppShell` (`src/components/layout/app-shell/app-shell.tsx`) already mounts a similar shell-level status banner (`SseDisconnectBanner`, between `<Header>` and `<main>`) — the email-verify banner should mount in the same slot.

**For `ba-use-case-modeler`:**
- Build Given/When/Then AC per FR above, covering all 4 UI states (loading/empty/error/success) for both the banner and the dialog, plus the two entry points (banner CTA vs Profile row CTA) converging on the same dialog/cooldown state.
- Cover the session-dismiss re-appearance behavior explicitly (labeled assumption above) since it's the one behavior not pinned down by DR-016.
- No role-variant AC needed — this feature is identical across teacher/principal/student/parent (account-level, not RBAC-gated).

## Dependencies

- Depends on the Profile screen (**US-E08.5, implemented**) for the row mount point (`src/features/user/presentation/profile/profile-screen.tsx`, personal-info `TabsContent`, next to the existing `Field` for `profile.personal.email`) and the existing `ProfileScreenVM` (`profile-screen.i-vm.ts`) which will need an `emailVerified: boolean` addition.
- No blocking dependency otherwise. Per DR-016: "no shared-file contention with DR-012→015/017/018/019 in this batch."

## Findings on OTP component reuse

Confirmed: a reusable 6-digit OTP component already exists at
`src/features/auth/presentation/forgot-password/otp-input.tsx` (`OtpInput`),
matching the design-spec's cell dimensions (46x52, radius 10) almost exactly.
It currently has generic `aria-label={`OTP digit ${i + 1}`}` (English) — the
new dialog needs the Vietnamese `emailVerify.dialog.digitAriaLabel` copy, so
either the component takes an `ariaLabel` prop/render-prop, or (per
`component-organization.md`) it is promoted to `components/shared/otp-input/`
if forgot-password and email-verify need genuinely different label copy. This
is a decision for `fe-component-architect`/`fe-nextjs-engineer`, not this
requirements doc — flagged here as FR-009 for visibility.
