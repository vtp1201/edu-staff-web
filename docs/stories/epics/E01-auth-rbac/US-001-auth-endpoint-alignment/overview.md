# Overview — US-E01.1 Auth Endpoint Alignment

## Current Behavior

`bootstrap/endpoint/auth.endpoint.ts` đang lệch với contract IAM thật
(`edu-api/services/iam/docs/INTEGRATION.md`):

| Web hiện tại | IAM thật |
| --- | --- |
| `/auth/login` | `/auth/signin` |
| `/auth/logout` | `/auth/signout` |
| `/auth/token/refresh` | `/auth/refresh` |
| `/auth/me` | `/users/me` |
| (thiếu) | `/auth/register`, `/auth/social` |

- Web bọc `accessToken` vào cookie httpOnly; **không** lưu/dùng `refreshToken`,
  `sessionId`.
- Refresh-token rotation chưa wiring — interceptor `http.ts` mới có TODO ở 401.

## Target Behavior

- Endpoint constants khớp IAM: `signin`, `signout`, `refresh`, `register`,
  `social`, `/users/me`.
- Login đọc `{ accessToken, refreshToken, tokenType, sessionId }` từ
  `TokenResponse`; lưu access + refresh an toàn (cookie httpOnly).
- 401 `TOKEN_EXPIRED` → gọi `/auth/refresh` với refreshToken; **rotation**: lưu
  cặp mới, bỏ cũ. Thất bại refresh → về `/login`.
- Signout gọi `/auth/signout` (server đọc session từ token; không gửi body) +
  xóa cookie.
- Branch lỗi theo `error.code` (UPPER_SNAKE) theo `.claude/rules/api-integration.md`.

## Affected Users

- Mọi user (đăng nhập/đăng xuất/giữ phiên).

## Affected Product Docs

- `docs/product/auth.md`
- `.claude/rules/api-integration.md`

## Non-Goals

- UI register/social mới (chỉ wiring endpoint + flow tối thiểu nếu cần).
- Multi-tenant resolution (E05.1).
