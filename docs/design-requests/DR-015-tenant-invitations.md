# DR-015 — Tenant Invitations & Accept Onboarding

- **US**: US-E21.1 (admin invite management) + US-E21.2 (public accept flow)
  — new epic E21.
- **Route(s)**: `(app)/admin/invitations` (admin); `/invitations/accept?token=...`
  (public, no tenant/auth shell — layout like `login.jsx`).
- **Mockup**: `design_src/edu/invitations.jsx` — `InvitationsScreen` (admin),
  `InviteAcceptScreen` (public).
- **Type**: **RECONCILE** — mockup generated + audited (P4 in
  `PROMPTS-group-b-ui-gen.md`; P8 fix-pass items 1–4 specifically targeted
  this file — hex→token fixes and 2 missing states — already applied per the
  merged v2.2 baseline). Verify (not redesign) that the P8 fixes landed.
- **Already-implemented check**: no `invitations` feature/route in `src/`; no
  matching i18n namespace → net-new.

## Scope

**Admin "Mời thành viên"**: "Gửi lời mời" dialog (multi-email chip input +
validation, role select with `--edu-role-*` badge, expiry select 7/14/30
days), invitation table (email, role badge, inviter, sent date, expiry
countdown — **`--edu-warning-text`** when <3 days per P8 fix, muted when
expired, status badge+icon: Pending/Accepted/Expired/Revoked, actions: Resend
(expired only)/Revoke (destructive confirm)/Copy link), status-tab + email
search filter, empty state + CTA.

**Public "Chấp nhận lời mời"** (`/invitations/accept?token=...`, auth-style
2-col layout): invited-school card (logo, school name, invited role badge,
inviter, expiry); two user states — no account (shortened signup form, email
locked) vs. already logged in (single "Join" button + "switch account"
line); three error states (expired/used/invalid token, each with its own
illustration + guidance); success confirmation + role-based redirect CTA.

## States (per prompt-pack note: Invitations admin was the ONLY screen
missing 2 of the 4 required states — P8 item 4 fixed this)

- Confirm in reconcile: loading skeleton (table) + error+retry now present in
  `InvitationsScreen` using `EduSkeleton`/`EduError` (pattern `failedOnce` like
  `reports.jsx`) — verify, don't re-add if already there.
- Empty + success already present.
- Accept screen: 4 states (form / already-logged-in / 3 error variants /
  success) — confirmed present per P8.

## Design-spec entry

`docs/product/design-spec.jsonc` → `screens.invitations` (admin table +
dialog) and `screens.inviteAccept` (public card, both states, error variants)
— added by `uiux-designer`.

## UX copy (i18n keys)

Namespace: `invitations` (net-new, covers both admin + public accept screen
under `invitations.accept.*`).

<!-- UX-WRITER: insert invitations.* key block here -->

## A11y (WCAG 2.1 AA)

- Full form labels + `aria-invalid`/`aria-describedby`.
- Expiry countdown not color-only (text + icon), amber threshold uses
  `--edu-warning-text` (large/bold only per decision 0046 — verify usage
  matches the ≥14px/bold constraint in the mockup).
- Email chips removable by keyboard.

## BE contract

Service `iam`. `GET/POST /api/v1/tenants/{id}/invitations`, `DELETE
/api/v1/tenants/{id}/invitations/{invitationId}`, `POST
/api/v1/invitations/accept`.

## Dependencies

None blocking.

## Status

- [ ] delivered
