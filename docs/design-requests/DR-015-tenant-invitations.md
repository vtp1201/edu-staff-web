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

```jsonc
// vi.json → "invitations"
{
  "invitations": {
    "title": "Mời thành viên",
    "subtitle": "Gửi và quản lý lời mời tham gia trường theo email.",
    "refresh": "Làm mới",
    "sendInvite": "Gửi lời mời",
    "role": {
      "teacher": "Giáo viên",
      "student": "Học sinh",
      "parent": "Phụ huynh",
      "manager": "BGH",
      "admin": "Admin"
    },
    "status": {
      "pending": "Chờ chấp nhận",
      "accepted": "Đã chấp nhận",
      "expired": "Hết hạn",
      "revoked": "Đã thu hồi"
    },
    "tabs": {
      "ariaLabel": "Lọc theo trạng thái",
      "all": "Tất cả",
      "pending": "Chờ chấp nhận",
      "accepted": "Đã chấp nhận",
      "expired": "Hết hạn",
      "revoked": "Đã thu hồi"
    },
    "search": {
      "ariaLabel": "Tìm theo email",
      "placeholder": "Tìm theo email…"
    },
    "table": {
      "email": "Email",
      "role": "Vai trò",
      "invitedBy": "Người mời",
      "sent": "Ngày gửi",
      "expires": "Hết hạn",
      "status": "Trạng thái",
      "actions": "Hành động"
    },
    "expiry": {
      "expired": "Hết hạn {date}",
      "daysLeft": "Còn {count} ngày"
    },
    "rowActions": {
      "copyLink": "Copy link mời",
      "resend": "Gửi lại lời mời",
      "revoke": "Thu hồi lời mời"
    },
    "sendDialog": {
      "title": "Gửi lời mời tham gia",
      "description": "Người nhận sẽ nhận email kèm link tham gia {school}.",
      "close": "Đóng",
      "emailsLabel": "Email người được mời",
      "emailsPlaceholder": "ten@truong.edu.vn, nhấn Enter để thêm…",
      "removeEmail": "Xóa email {email}",
      "invalidEmails": "Một số email không đúng định dạng — xóa hoặc sửa trước khi gửi.",
      "multipleEmailsHint": "Có thể dán nhiều email, phân tách bằng dấu phẩy hoặc khoảng trắng.",
      "roleGroupLabel": "Vai trò được mời",
      "expiryLabel": "Thời hạn lời mời",
      "expiry7": "7 ngày",
      "expiry14": "14 ngày",
      "expiry30": "30 ngày",
      "cancel": "Hủy",
      "submitOne": "Gửi lời mời",
      "submitMany": "Gửi {count} lời mời",
      "toastSentOne": "Đã gửi lời mời tới {email}",
      "toastSentMany": "Đã gửi {count} lời mời ({role})"
    },
    "revokeDialog": {
      "title": "Thu hồi lời mời?",
      "body": "Link mời gửi tới {email} sẽ vô hiệu ngay lập tức. Người nhận không thể dùng lời mời này để tham gia trường; bạn có thể gửi lời mời mới bất cứ lúc nào.",
      "cancel": "Hủy",
      "confirm": "Thu hồi lời mời",
      "toastRevoked": "Đã thu hồi lời mời của {email}"
    },
    "toastResent": "Đã gửi lại lời mời tới {email}",
    "toastLinkCopied": "Đã sao chép link mời",
    "empty": {
      "noMatch": "Không có lời mời nào khớp bộ lọc",
      "noMatchDescription": "Thử từ khóa khác hoặc chuyển tab trạng thái.",
      "none": "Chưa có lời mời nào",
      "noneDescription": "Mời giáo viên, học sinh và phụ huynh tham gia trường bằng email — họ sẽ nhận link kích hoạt tài khoản.",
      "clearFilters": "Xoá bộ lọc"
    },
    "error": {
      "title": "Không tải được danh sách lời mời",
      "description": "Đã xảy ra lỗi khi kết nối. Vui lòng thử lại."
    },
    "count": {
      "invites": "{count} lời mời",
      "filtered": " (đã lọc)"
    },
    "accept": {
      "tagline": "Hệ thống Quản lý Giáo dục",
      "featureTied": "Lời mời gắn với email và vai trò cụ thể",
      "featureTimeLimited": "Link mời có thời hạn, bảo mật cho từng trường",
      "featureFast": "Tham gia trong chưa đầy 1 phút",
      "invitedTitle": "Bạn được mời tham gia {school}",
      "invitedBy": "Được mời bởi {inviter} ({title}) · Còn {days} ngày (đến {date})",
      "signedInAs": "Đang đăng nhập với {email}",
      "switchAccount": "Đổi tài khoản?",
      "joinSchool": "Tham gia {school}",
      "joining": "Đang tham gia…",
      "emailLabel": "Email",
      "emailLockedHint": "Email được khóa theo lời mời — tài khoản sẽ dùng địa chỉ này.",
      "fullNameLabel": "Họ và tên",
      "fullNamePlaceholder": "VD: Phạm Thị Lan",
      "fullNameRequired": "Vui lòng nhập họ tên.",
      "passwordLabel": "Mật khẩu",
      "passwordMinLength": "Mật khẩu tối thiểu 6 ký tự.",
      "passwordHint": "Tối thiểu 6 ký tự.",
      "submit": "Tạo tài khoản & tham gia",
      "submitting": "Đang tạo tài khoản…",
      "alreadyHaveAccount": "Đã có tài khoản?",
      "signInToJoin": "Đăng nhập để tham gia",
      "termsNotice": "Bằng việc tham gia, bạn đồng ý với Điều khoản sử dụng và Chính sách riêng tư của EduPortal.",
      "success": {
        "title": "Chào mừng đến {school}!",
        "roleIntro": "Tài khoản của bạn đã được kích hoạt với vai trò",
        "goToDashboard": "Vào trang chính"
      },
      "error": {
        "expiredTitle": "Lời mời đã hết hạn",
        "expiredBody": "Link mời chỉ có hiệu lực trong thời hạn được cấp. Vui lòng liên hệ nhà trường để được gửi lời mời mới.",
        "usedTitle": "Lời mời đã được sử dụng",
        "usedBody": "Tài khoản cho lời mời này đã được kích hoạt trước đó. Nếu đó là bạn, hãy đăng nhập bằng email được mời; nếu không, liên hệ nhà trường để kiểm tra.",
        "invalidTitle": "Liên kết không hợp lệ",
        "invalidBody": "Link mời bị thiếu hoặc sai token. Hãy mở lại đúng đường link trong email mời, hoặc yêu cầu nhà trường gửi lại lời mời.",
        "contactOffice": "Văn phòng trường: {phone} · {email}"
      }
    }
  }
}
```

```jsonc
// en.json → "invitations" (mirror)
{
  "invitations": {
    "title": "Invitations",
    "subtitle": "Send and manage email invitations to join the school.",
    "refresh": "Refresh",
    "sendInvite": "Send invite",
    "role": {
      "teacher": "Teacher",
      "student": "Student",
      "parent": "Parent",
      "manager": "Board",
      "admin": "Admin"
    },
    "status": {
      "pending": "Pending",
      "accepted": "Accepted",
      "expired": "Expired",
      "revoked": "Revoked"
    },
    "tabs": {
      "ariaLabel": "Filter by status",
      "all": "All",
      "pending": "Pending",
      "accepted": "Accepted",
      "expired": "Expired",
      "revoked": "Revoked"
    },
    "search": {
      "ariaLabel": "Search by email",
      "placeholder": "Search by email…"
    },
    "table": {
      "email": "Email",
      "role": "Role",
      "invitedBy": "Invited by",
      "sent": "Sent",
      "expires": "Expires",
      "status": "Status",
      "actions": "Actions"
    },
    "expiry": {
      "expired": "Expired {date}",
      "daysLeft": "{count} day(s) left"
    },
    "rowActions": {
      "copyLink": "Copy invite link",
      "resend": "Resend invite",
      "revoke": "Revoke invite"
    },
    "sendDialog": {
      "title": "Send invitations",
      "description": "Recipients get an email with a link to join {school}.",
      "close": "Close",
      "emailsLabel": "Invitee emails",
      "emailsPlaceholder": "name@school.edu.vn, press Enter to add…",
      "removeEmail": "Remove email {email}",
      "invalidEmails": "Some emails are invalid — remove or fix them before sending.",
      "multipleEmailsHint": "Paste multiple emails separated by commas or spaces.",
      "roleGroupLabel": "Invited role",
      "expiryLabel": "Invitation validity",
      "expiry7": "7 days",
      "expiry14": "14 days",
      "expiry30": "30 days",
      "cancel": "Cancel",
      "submitOne": "Send invite",
      "submitMany": "Send {count} invites",
      "toastSentOne": "Invite sent to {email}",
      "toastSentMany": "Sent {count} invites ({role})"
    },
    "revokeDialog": {
      "title": "Revoke this invitation?",
      "body": "The link sent to {email} becomes invalid immediately. The recipient can no longer join with this invite; you can always send a new one.",
      "cancel": "Cancel",
      "confirm": "Revoke invite",
      "toastRevoked": "Invite for {email} revoked"
    },
    "toastResent": "Invite resent to {email}",
    "toastLinkCopied": "Invite link copied",
    "empty": {
      "noMatch": "No invites match your filters",
      "noMatchDescription": "Try a different keyword or status tab.",
      "none": "No invitations yet",
      "noneDescription": "Invite teachers, students and parents by email — they receive an activation link.",
      "clearFilters": "Clear filters"
    },
    "error": {
      "title": "Could not load invitations",
      "description": "Something went wrong while connecting. Please try again."
    },
    "count": {
      "invites": "{count} invite(s)",
      "filtered": " (filtered)"
    },
    "accept": {
      "tagline": "Education Management System",
      "featureTied": "Invites are tied to a specific email & role",
      "featureTimeLimited": "Time-limited links, scoped per school",
      "featureFast": "Join in under a minute",
      "invitedTitle": "You're invited to join {school}",
      "invitedBy": "Invited by {inviter} ({title}) · {days} days left (until {date})",
      "signedInAs": "Signed in as {email}",
      "switchAccount": "Switch account?",
      "joinSchool": "Join {school}",
      "joining": "Joining…",
      "emailLabel": "Email",
      "emailLockedHint": "Locked to the invitation — your account will use this address.",
      "fullNameLabel": "Full name",
      "fullNamePlaceholder": "e.g. Pham Thi Lan",
      "fullNameRequired": "Please enter your full name.",
      "passwordLabel": "Password",
      "passwordMinLength": "Password must be at least 6 characters.",
      "passwordHint": "At least 6 characters.",
      "submit": "Create account & join",
      "submitting": "Creating account…",
      "alreadyHaveAccount": "Already have an account?",
      "signInToJoin": "Sign in to join",
      "termsNotice": "By joining you agree to EduPortal’s Terms of Use and Privacy Policy.",
      "success": {
        "title": "Welcome to {school}!",
        "roleIntro": "Your account is now active with the role",
        "goToDashboard": "Go to dashboard"
      },
      "error": {
        "expiredTitle": "This invitation has expired",
        "expiredBody": "Invite links are only valid for a limited time. Please contact the school office to receive a new invitation.",
        "usedTitle": "This invitation was already used",
        "usedBody": "An account was already activated with this invite. If that was you, just sign in with the invited email; otherwise contact the school.",
        "invalidTitle": "This link is not valid",
        "invalidBody": "The invite token is missing or malformed. Re-open the exact link from your invitation email, or ask the school to resend it.",
        "contactOffice": "School office: {phone} · {email}"
      }
    }
  }
}
```

Notes:
- School name (`THPT Nguyễn Du` / mock office phone+email in
  `INVTokenError`) and person names are mock/seed data — excluded, passed as
  `{school}`/`{inviter}` interpolation params instead of baked into the string.
- `{count} invite(s)` / `{count} day(s) left` — same ICU-plural flag as
  DR-014: `/fe` should use next-intl plural blocks, not a literal `(s)`.

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

## Design-review (gate)

Carried over from the P4 audit + P8 fix-pass items 1-4 (hex→token restores,
2 missing states added to the admin table). Verdict: **Pass**. 4/4 states
confirmed on both the admin screen and the public accept screen (3 error
variants + form + logged-in + success). Expiry countdown uses
`--edu-warning-text` correctly at ≥14px/bold per decision 0046's constraint.

## Status

- [x] delivered (2026-07-12)
