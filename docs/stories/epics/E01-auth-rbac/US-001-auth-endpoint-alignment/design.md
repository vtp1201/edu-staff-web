# Design — US-E01.1 Auth Endpoint Alignment

## Domain Model

Giữ entity hiện có (`AuthUser`, `AuthSession`, `UserTenantRole`). `AuthSession`
mở rộng để mang token đầy đủ:

```text
AuthSession = { user: AuthUser, accessToken, refreshToken, sessionId }
```

## Application Flow

- `LoginUseCase` giữ nguyên chữ ký; repo gọi `POST /auth/signin`.
- Thêm `RefreshSessionUseCase` (gọi `/auth/refresh`, nhận cặp token mới —
  rotation) và `LogoutUseCase` (gọi `/auth/signout`).

## Interface Contract (theo IAM INTEGRATION.md)

```text
POST /auth/register  -> 201 RegisterResponse        (không login)
POST /auth/signin    -> 200 TokenResponse
POST /auth/refresh   -> 200 TokenResponse           (refreshToken ROTATED)
POST /auth/social    -> 200 TokenResponse
POST /auth/signout   -> 204                          (Bearer; không body)
GET  /users/me       -> 200 UserProfileResponse
```

`TokenResponse = { accessToken, refreshToken, tokenType:"Bearer", sessionId }`
(camelCase). Lỗi branch theo `error.code`:
`USER_INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `INVALID_TOKEN`,
`UNAUTHORIZED_ACCESS`, `USER_EMAIL_ALREADY_EXISTS`, … (xem ERROR_CODES.md).

## Data Model

Không có DB web. Lưu trữ token:

- `auth_token` (access) — cookie httpOnly hiện có.
- `refresh_token` — cookie httpOnly **riêng**, `sameSite=lax`, secure ở prod,
  maxAge dài hơn access.
- `sessionId` — đính kèm khi cần (không bắt buộc gửi lên signout).

## UI / Platform Impact

- Server Action `loginAction`: redirect theo `roles` giữ nguyên; set cả 2 cookie.
- Thêm `logoutAction`. Interceptor `http.ts` (client) hoặc layer server xử lý
  401 → refresh; ở SSR ưu tiên refresh trong server flow để giữ token httpOnly.

## Observability

- Log `requestId` (echo `X-Request-Id`) cho mọi auth call; không log token.

## Alternatives Considered

1. Lưu refreshToken trong DB/session store phía web — bỏ: web không có store,
   thêm hạ tầng.
2. Refresh ở client qua fetch — bỏ: token httpOnly không đọc được ở client;
   refresh nên chạy server-side.

## Open Questions

1. Concurrency: nhiều tab cùng 401 → rotation race. Cần single-flight refresh.
2. `UserProfileResponse` từ `/users/me` có chứa `UserTenantRole[]` không (liên
   quan E05.1)? — đối chiếu `openapi.yaml`.
