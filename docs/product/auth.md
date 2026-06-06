# Auth — EduPortal

Hợp đồng đăng nhập / phiên làm việc. Đây là **hard gate** (high-risk) trong
intake — mọi thay đổi luồng này cần decision. Endpoint khớp IAM (decision `0019`,
`edu-api/services/iam/docs/INTEGRATION.md`).

## Định danh

```text
AuthUser    = { id, email, name, avatar | null, roles: UserTenantRole[] }
AuthTokens  = { accessToken, refreshToken, sessionId }
AuthSession = AuthTokens & { user: AuthUser }
```

IAM `POST /auth/signin` trả `TokenResponse` (**không** kèm user) → repository
chain `GET /users/me` bằng access token mới để dựng `AuthSession`.

## Endpoint (AUTH_EP — khớp IAM)

```text
POST /auth/register  -> 201 (không login)
POST /auth/signin    -> 200 TokenResponse
POST /auth/refresh   -> 200 TokenResponse   (refreshToken ROTATED)
POST /auth/social    -> 200 TokenResponse
POST /auth/signout   -> 204 (Bearer; không body)
GET  /users/me       -> 200 UserProfileResponse
```

`TokenResponse = { accessToken, refreshToken, tokenType:"Bearer", sessionId }`
(camelCase).

## Luồng đăng nhập

```text
login form (email, password)
  -> Server Action loginAction
  -> makeLoginUseCase() (DI, server-only)
  -> LoginUseCase.execute  (validate rỗng -> invalid-credentials)
  -> AuthRepository.signin -> POST /auth/signin -> GET /users/me
  -> setAuthCookies(session)  // auth_token, refresh_token, session_id, auth_token_exp
  -> redirect: 1 role -> /{role}; nhiều role -> /select-role
```

## Cookie / session

- Cookie httpOnly, `sameSite=lax`, `secure` ở production, `path=/`:
  - `auth_token` (access, maxAge 7d), `refresh_token` (30d), `session_id` (30d),
    `auth_token_exp` (sibling — `exp` decode từ JWT access).
- Token chỉ đọc server-side qua `createServerHttpClient()` /
  `bootstrap/lib/auth-token.server.ts`; **không bao giờ** lộ ra client bundle.

## Refresh token (proactive, server-side — decision `0018`/`0019`)

- `ensureFreshSession()` (DI) pre-refresh khi `isAccessExpired(exp, skew=30)`:
  `POST /auth/refresh` → lưu cặp token mới (rotation), bỏ cũ.
- Reactive 401→refresh→retry + single-flight: **defer** (follow-up). httpOnly
  cookie không ghi được trong RSC render → refresh chạy server-side.

## Đăng xuất

```text
logoutAction -> LogoutUseCase -> POST /auth/signout (best-effort revoke)
             -> clearAuthCookies() -> redirect /login
```

## Thất bại đăng nhập (typed — branch theo error.code)

| Failure type | IAM error.code | Thông điệp (vi) |
| --- | --- | --- |
| `invalid-credentials` | `USER_INVALID_CREDENTIALS` | "Email hoặc mật khẩu không đúng" |
| `account-suspended` | `USER_SUSPENDED`/`ACCOUNT_SUSPENDED` | "Tài khoản đã bị tạm ngừng" |
| `email-already-exists` | `USER_EMAIL_ALREADY_EXISTS` | "Email đã được đăng ký" |
| `token-expired` | `TOKEN_EXPIRED` | "Phiên đăng nhập đã hết hạn…" |
| `invalid-token` | `INVALID_TOKEN` | "Phiên không hợp lệ…" |
| `unauthorized` | `UNAUTHORIZED_ACCESS` | "Bạn không có quyền truy cập" |
| `network-error` | (không response) | "Không thể kết nối đến máy chủ" |
| `unknown` | khác | "Có lỗi xảy ra, vui lòng thử lại" |

Failure trả về dạng union (`AuthResult = { data } | { error }`), không throw cho
lỗi nghiệp vụ.

## Quy tắc

- Validate input rỗng ở use-case trước khi gọi repo.
- Điều hướng sau login dựa trên `roles` (xem `docs/product/roles-permissions.md`).
- Logout luôn xóa cookie kể cả khi revoke server thất bại.

## Chưa chốt / cần story

- Reactive 401 safety net + single-flight refresh (follow-up).
- Màn `/select-role` cho user nhiều role — chưa có route.
- UI register/social — ngoài scope E01.1.
- Bảo vệ route theo role (RBAC guard ở middleware) — xem roles-permissions.
- E06.1 Response Envelope Parser thay type envelope tối thiểu hiện tại.
