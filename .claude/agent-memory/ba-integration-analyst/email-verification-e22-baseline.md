---
name: email-verification-e22-baseline
description: iam email-verification endpoints (US-E22.1) — contract shapes, error mapping, emailVerified DTO gap
metadata:
  type: project
---

iam already ships all 3 endpoints for email verification (REAL, not mock-first):
`GET /users/me` (now documented with `isEmailVerified: boolean` in
`edu-api/services/iam/docs/openapi.yaml` line 1386), `POST
/users/me/email/verification` (send/resend, 204 no body, idempotent no-op if
already verified), `POST /users/me/email/verification/confirm` (`{otp}` →
204 no body, no fresh user object returned).

**Why this matters:** the web's `UserProfileResponseDto`
(`src/features/auth/infrastructure/dtos/user-profile-response.dto.ts`) does
NOT yet have an `emailVerified`/`isEmailVerified` field, even though iam's
contract already exposes it — this is a **web-side gap to close in
implementation**, not a BE contract gap (no ADR needed).

**Error mapping already exists — no new AuthFailure types needed.** iam's
`USER_INVALID_OTP` (400, wrong/unknown/reused) and `USER_OTP_EXPIRED` (400,
window elapsed) are ALREADY distinct codes in `auth-failure.mapper.ts`'s
`CODE_MAP` → `{type:"invalid-otp"}` / `{type:"otp-expired"}` (added for the
forgot-password OTP flow, US-030). `USER_TOO_MANY_ATTEMPTS` (429, 5-attempt
lockout) also already maps → `{type:"too-many-requests"}`. This is a THIRD
distinct dialog state beyond wrong/expired that requirements docs sometimes
only name two of — flag to use-case-modeler when a story only mentions
wrong/expired.

**How to apply:** when integration-mapping any OTP-style iam flow (password
reset, email verify, future 2FA), check `CODE_MAP` in
`src/features/auth/infrastructure/mappers/auth-failure.mapper.ts` first —
the wrong/expired/too-many-attempts triad is almost certainly already wired,
reuse `mapAuthError()` rather than proposing new failure types.

**Pre-existing drift flagged (not fixed):** web's `UserProfileResponseDto`
field names (`id`/`name`/`avatar`/`roles[]`) don't 1:1 match iam's documented
`UserProfileResponse` schema (`userId`/`fullName`/`avatarUrl`/`role`/`status`/
`isEmailVerified`/`mfaEnabled`/`dob`/timestamps) — worth a follow-up
check/ADR, out of scope for single-field additions like this one.

**No explicit 429 documented on the send/resend endpoint's openapi entry**
(only 204/401) — unlike reset-password which explicitly documents 429
TOO_MANY_ATTEMPTS. Server-side rate-limiting on resend beyond the 60s
client cooldown is [INFERRED], flagged as open question for iam team per
US-E22.1's own open question.

Packet: `docs/stories/epics/E22-email-verification/US-E22.1-email-verification/integration.md`.
