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

```jsonc
// vi.json → "emailVerify" (net-new namespace: banner + OTP dialog only)
{
  "emailVerify": {
    "banner": {
      "unverifiedTitle": "Email của bạn chưa được xác thực.",
      "unverifiedBody": "Xác thực để nhận thông báo quan trọng.",
      "sendButton": "Gửi mail xác thực",
      "sentTitle": "Đã gửi.",
      "sentBody": "Kiểm tra hộp thư {email}.",
      "resendIn": "Gửi lại được sau {seconds} giây.",
      "resend": "Gửi lại",
      "dismissAriaLabel": "Đóng thông báo xác thực email"
    },
    "dialog": {
      "title": "Xác thực email",
      "description": "Chúng tôi đã gửi mã 6 số tới {email}.",
      "close": "Đóng",
      "codeGroupAriaLabel": "Mã xác thực 6 chữ số",
      "digitAriaLabel": "Chữ số thứ {n}",
      "errorWrong": "Mã không đúng. Vui lòng kiểm tra lại email và nhập lại.",
      "errorExpired": "Mã đã hết hạn. Bấm \"Gửi lại mã\" để nhận mã mới.",
      "resendIn": "Gửi lại mã được sau {seconds} giây",
      "resend": "Gửi lại mã",
      "confirm": "Xác nhận",
      "confirming": "Đang xác minh…",
      "successTitle": "Email đã được xác thực",
      "successBody": "{email} giờ sẽ nhận đầy đủ thông báo quan trọng từ nhà trường.",
      "done": "Hoàn tất"
    }
  }
}
```

```jsonc
// en.json → "emailVerify" (mirror)
{
  "emailVerify": {
    "banner": {
      "unverifiedTitle": "Your email is not verified yet.",
      "unverifiedBody": "Verify it to receive important notifications.",
      "sendButton": "Send verification mail",
      "sentTitle": "Sent.",
      "sentBody": "Check the inbox of {email}.",
      "resendIn": "Resend available in {seconds} seconds.",
      "resend": "Resend",
      "dismissAriaLabel": "Dismiss email verification notice"
    },
    "dialog": {
      "title": "Verify your email",
      "description": "We sent a 6-digit code to {email}.",
      "close": "Close",
      "codeGroupAriaLabel": "6-digit verification code",
      "digitAriaLabel": "Digit {n}",
      "errorWrong": "Incorrect code. Please check your email and try again.",
      "errorExpired": "This code has expired. Press \"Resend code\" to get a new one.",
      "resendIn": "You can resend the code in {seconds} seconds",
      "resend": "Resend code",
      "confirm": "Confirm",
      "confirming": "Verifying…",
      "successTitle": "Email verified",
      "successBody": "{email} will now receive all important school notifications.",
      "done": "Done"
    }
  }
}
```

### ADD to EXISTING `profile` namespace (do not duplicate — extend `profile.personal.*`)

`profile.personal.email` already exists as the field label ("Email"). Add
these 3 sibling keys for the verification-status row next to it:

```jsonc
// vi.json → profile.personal (ADD to existing block, see line ~2173-2179)
"personal": {
  "email": "Email",                       // unchanged, existing
  "emailVerified": "Đã xác thực",
  "emailUnverified": "Chưa xác thực",
  "emailVerifyNow": "Xác thực ngay",
  "emailImmutableHint": "Email không thể thay đổi",
  "fullName": "Họ và tên",
  "phone": "Số điện thoại",
  "role": "Vai trò",
  "save": "Lưu thay đổi"
}
```

```jsonc
// en.json → profile.personal (ADD, mirror)
"personal": {
  "email": "Email",
  "emailVerified": "Verified",
  "emailUnverified": "Not verified",
  "emailVerifyNow": "Verify now",
  "emailImmutableHint": "Email cannot be changed",
  "fullName": "Full name",
  "phone": "Phone number",
  "role": "Role",
  "save": "Save changes"
}
```

Notes:
- Grepped `src/bootstrap/i18n/messages/vi.json` → `profile` block (lines
  2167–2231) before writing: `profile.personal.email` already exists as a bare
  label; no existing verification-status keys collide, so the 4 additions
  above are safe extensions, not new duplicates.
- The dialog's demo-only helper text ("Demo: mã đúng 123456 · mã hết hạn
  000000") is a design-review aid in the mockup, not production copy —
  excluded from i18n; `/fe` should not ship it.

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

## Design-review (gate)

Carried over from the P5 audit + P8 fix-pass items 2-3 (hex→token restores
for the badge, OTP cell background, and error text). Verdict: **Pass**.
Banner uses `role="status"` (not alert) per a11y notes; OTP cells have
per-digit `aria-label`; warning banner text confirmed as
`--edu-warning-foreground` (never white on yellow, decision 0013). Profile
row copy staged as additive keys under the EXISTING `profile` namespace, not
a duplicate.

## Status

- [x] delivered (2026-07-12)
