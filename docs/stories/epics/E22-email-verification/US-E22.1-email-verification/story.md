# US-E22.1 Email Verification (shell banner + Profile row + OTP dialog)

## Status

in-progress

## Lane

normal

## Dependencies

> Dùng cho parallel branch workflow (decision `0025`). Giúp fe-lead phát hiện ràng
> buộc với US team khác đang làm trước khi claim.

- Depends on: US-E08.5 (Profile screen, **implemented**) — provides the mount
  point (`profile-screen.tsx` personal-info `TabsContent`, next to the
  existing `email` `Field`) and `ProfileScreenVM`/`auth.mapper.ts` chain this
  story extends with `emailVerified: boolean`.
- Blocks: none
- Feature module(s) chạm: `src/features/auth/` (DTO/entity/mapper/repository/
  use-cases), `src/features/user/presentation/profile/` (VM + row UI),
  `src/components/layout/app-shell/` (banner mount), new
  `src/features/auth/presentation/email-verify/` (or promoted
  `components/shared/`) for `EmailVerifyDialog`/`EmailVerifyBanner`.
- Shared contract/file: `UserProfileResponseDto` → `AuthUser` entity →
  `auth.mapper.ts` → `ProfileScreenVM` (extended, not replaced);
  `AUTH_EP` (`bootstrap/endpoint/auth.endpoint.ts`, 2 new entries);
  `AuthFailure` union / `mapAuthError()` (reused, no new types);
  `src/features/auth/presentation/forgot-password/otp-input.tsx` (`OtpInput`,
  reused per FR-009/decision `0026`); `app-shell.tsx` banner slot (same slot
  as `SseDisconnectBanner`, line ~81); `messages/{vi,en}.json` (`emailVerify`
  net-new namespace + `profile.personal.*` additive keys).

## Product Contract

Any authenticated user (all 4 roles — teacher/principal/student/parent,
account-level, not role-gated) whose account email is unverified SHALL be
able to discover and complete email verification through two entry points —
an app-shell banner (visible on every route) and a status row on the
existing Profile screen — both converging on the same 6-digit OTP
confirmation dialog and the same 60-second resend cooldown clock. The
feature never introduces an email-change capability; the account email
stays read-only exactly as it is today (US-E08.5). All three backend calls
(`GET /users/me` extended field, send/resend, confirm) are against the
already-shipped `iam` service — no mock-first plumbing, no BE gap.

## Relevant Product Docs

- `docs/design-requests/DR-016-email-verification.md` (delivered 2026-07-12)
- `docs/product/design-spec.jsonc` → `screens.emailVerify` (~line 1727)
- `design_src/edu/email-verify.jsx` (`EmailVerifyBanner`, `EVEmailField`,
  `EmailVerifyDialog`, `useEVCooldown`)
- `docs/product/screens.md` → `profile` entry (Profile screen, US-E08.5)
- This packet: `requirements.md` (TR-221), `integration.md` (INT-001..003),
  `use-cases.md` (UC-001..008, AC-001.x..AC-008.x), `spec.md` (consolidated)

## Acceptance Criteria

Condensed — full Given/When/Then in `use-cases.md` §4 (AC-001.1 through
AC-008.8, 8 use cases, ≥4 AC each covering loading/empty/error/success).

- **Banner (UC-001/002/008):** renders `role="status"` below Header on every
  route only when `emailVerified === false` AND status is resolved
  (fail-closed while unknown, AC-001.1/1.3); session-scoped dismiss
  (AC-001.5/1.6); send CTA → 204 → "sent" state + 60s shared cooldown
  (AC-002.2); transport/5xx error does not start cooldown (AC-002.4); 429
  handled defensively, no cooldown start (AC-002.5).
- **Profile row (UC-007):** badge next to `profile.personal.email` —
  "Đã xác thực" (success+check) / "Chưa xác thực" (warning+icon) +
  "Xác thực ngay" CTA when unverified (AC-007.4/7.5); fetch-unresolved/error
  renders no badge, not a stale one (AC-007.1/7.3); email stays disabled
  (AC-007.8).
- **OTP dialog (UC-003/004/005/006):** opens from either entry point, reused
  `OtpInput` (6×46×52/radius-10), Confirm/Resend, focus-trapped (AC-003.1,
  AC-003.6); success flips `emailVerified` everywhere without reload
  (AC-003.4); three DISTINCT error copies — wrong code (editable, `USER_INVALID_OTP`,
  AC-004.1-4), expired code (Resend emphasized, `USER_OTP_EXPIRED`, AC-005.1-4),
  too-many-attempts lockout (cells disabled until resend, `USER_TOO_MANY_ATTEMPTS`
  429, AC-006.1-4, defensive per open question).
- **Cooldown (UC-008):** one 60s clock shared between banner and dialog
  (AC-008.4/8.5), never started by an error response (AC-008.6),
  `aria-live="polite"` announces start/re-enable (AC-008.2/8.3), full reload
  mid-cooldown MAY reset the client timer — documented, not a defect
  (AC-008.7).

## Design Notes

- Commands:
  - `requestEmailVerification()` → `POST /iam/api/v1/users/me/email/verification`
    (no body) → `VoidResult`, mirrors `requestPasswordReset` pattern.
  - `confirmEmailVerification(otp: string)` → `POST /iam/api/v1/users/me/email/verification/confirm`
    (`{ otp }`, `^[0-9]{6}$`) → `VoidResult`, mirrors `resetPassword` pattern.
- Queries: none new — reuse the existing `GET /users/me` fetch already made
  for the shell/Profile screen (NFR-006: no added blocking round-trip);
  extend its DTO/entity/VM chain with one boolean field.
- API (all `iam`, all REAL per integration.md, no mock-first):
  1. `GET /iam/api/v1/users/me` — extend consumption: wire field
     `isEmailVerified: boolean` → DTO field (name TBD by implementer:
     literal `isEmailVerified` vs normalized `emailVerified` — keep
     wire-shaped DTO vs domain-shaped entity/VM distinct per
     `auth.mapper.ts` convention) → `AuthUser.emailVerified: boolean` →
     `ProfileScreenVM.emailVerified: boolean`.
  2. `POST /iam/api/v1/users/me/email/verification` — send/resend, 204 no
     body, idempotent if already verified (treat as success).
  3. `POST /iam/api/v1/users/me/email/verification/confirm` — `{ otp }`,
     204 no body. Errors: `USER_INVALID_OTP` (400) → `{type:"invalid-otp"}`,
     `USER_OTP_EXPIRED` (400) → `{type:"otp-expired"}`,
     `USER_TOO_MANY_ATTEMPTS` (429) → `{type:"too-many-requests"}` — all
     three already exist in `AuthFailure`/`CODE_MAP`, no new failure type.
- Tables: none (no new DB/entity beyond the existing `iam` user record).
- Domain rules: email stays immutable (FR-008); cooldown is 100% client-side
  (no `retryAfter`/`nextResendAt` field on the wire — pure client timer,
  shared between banner + dialog); a 429 is always an error state, never a
  cooldown trigger.
- UI surfaces:
  - `EmailVerifyBanner` — new, mounts in `app-shell.tsx` next to
    `SseDisconnectBanner` (same slot, between `<Header>` and `<main>`).
  - Profile personal-info row — extends `profile-screen.tsx`'s existing
    email `Field` (US-E08.5), adds badge + conditional CTA.
  - `EmailVerifyDialog` — new, reuses `OtpInput`
    (`src/features/auth/presentation/forgot-password/otp-input.tsx`); adapt
    only `aria-label` copy (existing English `OTP digit ${i+1}` →
    `emailVerify.dialog.digitAriaLabel`), decide reuse-as-is vs promote to
    `components/shared/otp-input/` per `component-organization.md`
    (decision `0026`) — implementer's call, flagged in requirements.md.
  - `useEVCooldown`-equivalent shared timer state — implementer's choice of
    mechanism (context/hook/query cache); must satisfy AC-008.4/8.5 (shared
    across banner + dialog, survives dialog close/reopen same page load).

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E22.1 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Vitest: DTO→entity→mapper field mapping (`emailVerified`); `AuthFailure` branch coverage for `USER_INVALID_OTP`/`USER_OTP_EXPIRED`/`USER_TOO_MANY_ATTEMPTS` reuse (no new mapper code, but confirm confirm-endpoint wiring hits existing `mapAuthError`); cooldown timer logic (shared clock, start/tick/re-enable, not-started-by-error) |
| Integration | Repository contract tests for the 2 new endpoints (`requestEmailVerification`/`confirmEmailVerification`) against envelope conventions (204/no-body handling, error→failure mapping) |
| E2E | Storybook interaction + Playwright: banner unverified→sent→cooldown, dialog open→wrong-code→expired-code→lockout→success, Profile row badge flip, keyboard-only walkthrough (NFR-004), 320px responsive (NFR-005) |
| Platform | design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable`) — contrast/motion/focus per NFR-001..003 |
| Release | none beyond standard merge-to-main gate (`bun vitest run && bun build`) |

## Harness Delta

- New epic `E22-email-verification` + story `US-E22.1` registered via this
  packet (requirements.md/integration.md/use-cases.md/story.md/spec.md).
- No ADR needed — no new token, no new design-system pattern (reuses
  existing warning/error/success tokens, existing `OtpInput`, existing
  `SseDisconnectBanner` mount slot).
- `docs/TEST_MATRIX.md` — add `US-E22.1` row(s) at `planned` before any code
  lands (per `.claude/rules/tdd.md`).
- Three `[OPEN QUESTION]`s carried forward to `ba-lead`/iam BE team (see
  spec.md §8) — not blocking implementation (all have a safe, documented
  fallback), but should be tracked for confirmation.

## Implementation Plan

See `plan.md` in this packet (fe-planner) — 11 phases (0-10): data plumbing
(DTO/entity/mapper/VM) → new endpoints/repo methods/use-cases/DI →
`OtpInput` promotion to `components/shared/otp-input/` → shared cooldown +
verification-status Context (`EmailVerifyProvider`, mounted in `AppShell`,
NOT TanStack Query — architectural finding: `ReactQueryProvider` only wraps
`AppShell`'s `children`, not `AppShell` itself) → `layout.tsx`/`AppShell`
wiring (first real `GET /users/me`, closes the `[GAP]` in spec.md §8) →
`EmailVerifyBanner` → server actions + i18n → Profile row →
`EmailVerifyDialog` (3 error states + success) → Storybook/a11y pass →
Playwright E2E. Key decisions: extend `IAuthRepository` (no new repo
interface); DTO keeps wire-shaped `isEmailVerified`, entity/VM use
`emailVerified`; INT-003 success = optimistic local flip via context, not a
refetch.

## Evidence

Add commands, reports, screenshots, or links after validation exists.
