# 0035 VNeID SSO — Client-Only / Coming-Soon Until BE Adds Provider

Date: 2026-06-14

## Status

Accepted

## Context

US-E01.2 requires a "Đăng nhập VNeID" SSO button per the 1406 design handoff (ADR 0034).
The IAM `POST /auth/social` endpoint is **live** but its `provider` enum only contains
`google` and `facebook` — `vneid` is not yet a supported value. Sending `provider: "vneid"`
to the current BE would return an unknown-provider error.

VNeID OAuth requires a separate integration agreement with the Vietnamese government portal
(OAuth 2.0 + digital-identity-verification scope) that the BE team has not yet started.
There is no estimated date for BE readiness.

## Decision

Render the VNeID button on the login screen **exactly as designed** (shield-star icon,
Vietnamese flag red/gold colors, label "Đăng nhập VNeID") but mark it as **disabled** at
the UI level with a "Coming soon" tooltip. The button is keyboard-focusable and
`aria-disabled="true"` (not `disabled` attribute) so screen-reader users receive context
(`aria-describedby` pointing to tooltip text). No server action is wired for VNeID in
this story.

When the BE adds `vneid` to the provider enum, a follow-up story will:
1. Add `socialSignin` to `IAuthRepository` with `provider: "google" | "vneid"`.
2. Implement `SocialAuthUseCase`.
3. Wire the Google OAuth flow (popup + token exchange).
4. Re-enable the VNeID button by removing the `aria-disabled` flag and wiring its action.

Google SSO **is** wired in this story because `provider: "google"` is live in BE.
The Google button is fully functional: opens the Google identity popup, exchanges the
`credential` (id_token) for an IAM session, then runs the multi-role routing.

## Alternatives Considered

1. **Hide VNeID entirely** — breaks design-spec alignment (ADR 0034 says both buttons must
   appear). Re-enabling later would be a design-visible change.
2. **Show VNeID as enabled but display an error on click** — misleads users; creates
   support burden; fails WCAG 2.1 AA (users can't know in advance the button does nothing).
3. **Mock the VNeID flow client-only** — adds mock code that diverges from real flow,
   increasing risk when BE lands.

## Consequences

Positive:
- Design parity with 1406 handoff is maintained — both buttons are visible.
- Users clearly understand VNeID is not yet available (no surprise 500 error).
- WCAG 2.1 AA maintained: `aria-disabled` + tooltip + keyboard focus-ring.
- Follow-up wiring story is straightforward: remove `aria-disabled`, add use-case + action.

Tradeoffs:
- Google SSO requires `@react-oauth/google` or similar client-side Google Identity
  Services library. This adds a third-party bundle (tree-shaken, ~18 kB gzip). Decision:
  use `@react-oauth/google` (official Google library, Typescript types, minimal surface).
- Google OAuth client ID must be injected as `NEXT_PUBLIC_GOOGLE_CLIENT_ID` env var.
  For local dev, a placeholder value disables the actual flow with a graceful inline error
  (same `sso-unavailable` failure key).

## Follow-Up

- BE story: IAM add `vneid` to `SocialRequest.provider` enum + VNeID OAuth adapter.
- FE follow-up story: remove `aria-disabled`, implement `SocialAuthUseCase` for VNeID,
  wire Google flow if not already done end-to-end by then.
- Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to `.env.example` and deployment config.
