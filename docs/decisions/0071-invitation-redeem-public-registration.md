# 0071 Invitation redeem là public registration flow (amends ADR 0059)

Date: 2026-08-07

## Status

Accepted — amends `0059` (which itself amended `0051`)

## Context

ADR `0059` (2026-07-18) kết luận: **không có** guest account-creation —
`POST /invitations/accept` yêu cầu Bearer auth, body `{token}` only, và web
không được mô phỏng flow đăng ký công khai không tồn tại trên BE. Kết luận đó
đúng với contract IAM tại thời điểm viết.

BE US-191 (ADR 0130 + 0131 phía `edu-api`, main `e2a3a445`, 2026-08-07) đổi
tiền đề: IAM ship **hai endpoint public mới**, tách khỏi accept-flow cũ:

- `POST /iam/api/v1/invitations/lookup` (public, 200) — body `{token}` only;
  preview `{email, tenantName, role, …}` để build form.
- `POST /iam/api/v1/invitations/redeem` (public, 201) — body
  `{token, password, fullName}` (KHÔNG có email — email lấy từ invitation);
  tạo account + membership + **tenant-scoped session ngay** (không cần signin
  lại). 410 cho token hết hạn/đã dùng/replay; 409 `INVITATION_ACCOUNT_EXISTS`
  khi email đã có account. Rate limit per-IP 10/phút cho cả hai route. Token
  chỉ đi trong POST body.

## Decision

1. Kết luận "no guest account-creation" của `0059` **hết hiệu lực cho redeem
   flow**: US-E18.53 wire màn public `/[locale]/invitations/redeem`
   (lookup-preview → form password+fullName → redeem → cookie qua
   `setAuthCookies` dùng chung → redirect theo `member.tenantId`+`roles[0]`).
2. **Accept-flow cũ giữ nguyên** đúng `0059`: user đã đăng nhập accept
   invitation qua `POST /invitations/accept` (`{token}` only). Hai flow cùng
   tồn tại; 409 `INVITATION_ACCOUNT_EXISTS` ở redeem chính là cầu route sang
   sign-in + accept.
3. Ràng buộc an ninh giữ nguyên tính chất của `0059`/decision `0018`: token
   không bao giờ vào query string/log; session cookie set server-side qua
   `setAuthCookies` (không fork); redirect target chỉ derive từ response BE
   (không nhận `next`/`returnTo` từ client).

## Consequences

- `src/features/auth/` có invitation-redeem slice riêng (use-case + repo +
  screen); password policy tái dùng của register flow, không đẻ policy song song.
- Ask gửi BE (từ review US-E18.53): rate-limit 10/min per-IP hiện bucket theo
  IP của Next server (không forward XFF) — một abuser có thể 429 mọi invitee;
  cần quyết định platform-wide, không tự ý thêm XFF phía FE.
- `0059` vẫn binding cho accept-flow; ADR này chỉ mở nhánh redeem.

## Liên quan

- US-E18.53 (`docs/stories/epics/E18-be-wiring/US-E18.53-invitation-redeem-registration/`).
- edu-api ADR 0130/0131, BE US-191; report `docs/reports/2026-08-07-be-to-fe-response.md` §1 #31.
