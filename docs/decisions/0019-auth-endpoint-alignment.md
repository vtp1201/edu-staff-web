# 0019 Auth Endpoint Alignment (IAM signin/refresh/signout)

Date: 2026-06-06

## Status

Accepted

## Context

`bootstrap/endpoint/auth.endpoint.ts` lệch tên với contract IAM thật
(`/auth/login` vs `/auth/signin`, …) và web chỉ lưu `accessToken`, bỏ
`refreshToken`/`sessionId`. IAM `POST /auth/signin` trả `TokenResponse`
(**không** kèm `user`/`roles`), trong khi điều hướng sau login dựa vào `roles`.
Story US-E01.1 (hard gate Auth) yêu cầu auth hoạt động khi tắt mock.

## Decision

- `AUTH_EP` khớp IAM: `register`, `signin`, `social`, `refresh`, `signout`,
  `me` (`/users/me`).
- Sau signin, repository **chain `GET /users/me`** với access token mới để dựng
  `AuthSession = AuthTokens + AuthUser` (giữ redirect-by-role).
- Lưu token đầy đủ trong cookie httpOnly riêng: `auth_token`, `refresh_token`,
  `session_id`, cộng sibling `auth_token_exp` (decode `exp` từ JWT access).
- Refresh-token rotation theo hướng **proactive server-side** (decision `0018`):
  `ensureFreshSession()` trong DI pre-refresh khi `isAccessExpired(exp, skew=30)`;
  lưu cặp token mới, bỏ cũ. Reactive 401-interceptor refresh **defer** (httpOnly
  cookie không ghi được trong RSC render).
- Lỗi map theo `error.code` (UPPER_SNAKE) qua `mapAuthError`, không theo message.

## Alternatives Considered

1. Token-only login, defer profile — bỏ: phá redirect-by-role hiện có.
2. Reactive client-side refresh trong `http.ts` — defer: cookie httpOnly không
   đọc/ghi được ở client; refresh phải chạy server-side.
3. Lưu refresh token ở store phía web — bỏ: web không có store.

## Consequences

Positive:

- Auth khớp contract IAM, sẵn sàng tắt mock.
- Token shape đầy đủ + exp sibling cho proactive refresh.
- Failure map theo code ổn định (independent của E06.1 envelope parser; dùng
  type envelope tối thiểu ở `bootstrap/lib/api-envelope.ts`).

Tradeoffs:

- Mỗi lần signin tốn thêm 1 round-trip `/users/me`.
- Reactive 401 safety net chưa có; single-flight refresh chưa cần (proactive
  server-side per-request).
- Vitest alias `server-only` → stub để test được repository server-only.

## Follow-Up

- Reactive 401→refresh→retry + single-flight (follow-up story).
- E06.1 Response Envelope Parser thay type tối thiểu hiện tại.
- UI `/select-role`, register/social (ngoài scope story này).
- Đối chiếu `UserProfileResponse` thật khi IAM `openapi.yaml` truy cập được
  (xác nhận chứa `roles[]`).
