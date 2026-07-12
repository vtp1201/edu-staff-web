# DR-016 — Email Verification Flow

- **US**: US-E22.1 (new epic E22 — Email Verification)
- **Route(s)**: no dedicated route — extends app shell (banner, all routes)
  + Profile screen (`(app)/(shared)/profile`, US-E08.5) + a dialog.
- **Mockup**: `design_src/edu/email-verify.jsx` — `EmailVerifyBanner`,
  `EVEmailField`, `EmailVerifyDialog`, `useEVCooldown` hook.
- **Type**: **RECONCILE** — mockup generated + audited (P5 in
  `PROMPTS-group-b-ui-gen.md`; P8 fix-pass items 2–3 targeted this file:
  hex→token fixes for the "Chưa xác thực" badge, OTP cell background, and
  error-text token). Verify these fixes landed; do not redesign.
- **Already-implemented check**: no `email-verify` feature in `src/`; Profile
  (`features/user`) IS implemented (US-E08.5, ✅) — this is an **extension**
  of an already-built screen. Reuse the existing `profile` i18n namespace for
  the inline account-info row (email badge + "Xác thực ngay" button) rather
  than inventing a duplicate; keep the banner + OTP dialog under their own
  `emailVerify.*` namespace since they are shell-level, not Profile-scoped.
  `/fe` must confirm exact `profile` namespace keys before pasting to avoid
  the DR-001 duplication mistake.

## Scope

1. **App-shell banner** (below header, all pages, dismissible per session):
   unverified state — `bg-warning/10`, mail-warning icon, message + inline
   "Gửi mail xác thực" (ghost) + close X; after send — updated text + "Gửi
   lại" link with 60s cooldown countdown.
2. **Profile "Thông tin tài khoản" row**: email value + status badge ("Đã xác
   thực" success+check / "Chưa xác thực" warning+icon) + "Xác thực ngay"
   button — **reuse `profile` namespace**, do not duplicate.
3. **`EmailVerifyDialog`**: OTP 6-cell input (reuse the auth OTP pattern),
   Confirm + Resend (cooldown), wrong/expired-code error state (`--edu-error-text`
   text + `aria-invalid`), success state (large check + confirmation).

## States (4 required)

Loading (send in flight), empty n/a (banner conditional on verified=false),
error (wrong/expired code), success (verified confirmation) — all present in
mockup.

## Design-spec entry

`docs/product/design-spec.jsonc` → `screens.emailVerify` (banner, dialog,
OTP cell dimensions/spacing) + a note that the Profile row entry augments
the EXISTING `screens.profile` entry (do not create a parallel `profile`
block) — added by `uiux-designer`.

## UX copy (i18n keys)

Namespace: `emailVerify` for banner + dialog. Profile row copy goes under the
EXISTING `profile` namespace (`uiux-ux-writer` must grep
`messages/vi.json` → `profile.*` first and extend, not duplicate).

<!-- UX-WRITER: insert emailVerify.* key block + the 2-3 keys to ADD under
     existing profile.* here -->

## A11y (WCAG 2.1 AA)

- Banner: `role="status"` (not `alert` — not urgent).
- OTP input: one cell = one digit, `aria-label` "Chữ số thứ N".
- Cooldown countdown: announced to SR, not visual-only.
- Warning banner text: `--edu-warning-foreground` on the yellow background
  (never white) — confirm mockup matches, per decision 0013.

## BE contract

Service `iam`. `POST /api/v1/users/me/email/verification`, `POST
/api/v1/users/me/email/verification/confirm`.

## Dependencies

Touches the existing (implemented) Profile screen — coordinate with `/ba`/`/fe`
on where exactly the row/dialog mount; no shared-file contention with
DR-012→015/017/018/019 in this batch.

## Status

- [ ] delivered
