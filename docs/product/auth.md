# Auth — EduPortal

Hợp đồng đăng nhập / phiên làm việc. Đây là **hard gate** (high-risk) trong
intake — mọi thay đổi luồng này cần decision.

## Định danh

```text
AuthUser    = { id, email, name, avatar | null, roles: UserTenantRole[] }
AuthSession = { user: AuthUser, accessToken }
```

## Luồng đăng nhập

```text
login form (email, password)
  -> Server Action loginAction
  -> makeLoginUseCase() (DI, server-only)
  -> LoginUseCase.execute(email, password)
       - validate rỗng tại chỗ -> invalid-credentials
  -> AuthRepository.login -> POST /auth/login
  -> set cookie httpOnly 'auth_token' = accessToken
  -> redirect: 1 role -> /{role}; nhiều role -> /select-role
```

## Cookie / session

- Cookie `auth_token`, **httpOnly**, `sameSite=lax`, `secure` ở production,
  `maxAge` 7 ngày.
- Token chỉ được đọc server-side qua `createServerHttpClient()`; **không bao giờ
  lộ ra client bundle**.
- Endpoint liên quan (`AUTH_EP`): `login`, `logout`, `refresh`
  (`/auth/token/refresh`), `me` (`/auth/me`).

## Thất bại đăng nhập (typed)

| Failure type | Ý nghĩa | Thông điệp hiển thị (vi) |
| --- | --- | --- |
| `invalid-credentials` | Sai email/mật khẩu hoặc input rỗng | "Email hoặc mật khẩu không đúng" |
| `account-suspended` | Tài khoản bị tạm ngừng | "Tài khoản đã bị tạm ngừng" |
| `network-error` | Không kết nối được máy chủ | "Không thể kết nối đến máy chủ" |
| `unknown` | Lỗi khác | "Có lỗi xảy ra, vui lòng thử lại" |

Failure trả về dạng union (`AuthResult = { data } | { error }`), không throw cho
lỗi nghiệp vụ.

## Quy tắc

- Validate input rỗng ở use-case trước khi gọi repo.
- Mọi quyết định điều hướng sau login dựa trên `roles` (xem
  `docs/product/roles-permissions.md`).
- Logout: gọi `/auth/logout` và xóa cookie `auth_token`.

## Chưa chốt / cần story

- Luồng **logout** + **refresh token** end-to-end (interface có sẵn, chưa wiring
  đầy đủ ở UI/action).
- Màn `/select-role` cho user nhiều role — chưa có route.
- Bảo vệ route theo role (RBAC guard ở middleware) — xem roles-permissions.
