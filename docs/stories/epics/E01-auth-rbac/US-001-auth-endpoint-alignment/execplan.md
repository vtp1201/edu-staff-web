# Exec Plan — US-E01.1 Auth Endpoint Alignment

## Goal

Đồng bộ luồng auth của web với contract IAM thật để auth hoạt động khi tắt mock:
endpoint đúng tên, refresh-token rotation, signout revoke session.

## Scope

In scope:

- Sửa `AUTH_EP` khớp IAM (`signin`/`signout`/`refresh`/`register`/`social`,
  `/users/me`).
- DTO `TokenResponse` (`accessToken`, `refreshToken`, `tokenType`, `sessionId`)
  + mapper → `AuthSession`.
- Lưu refreshToken an toàn (cookie httpOnly riêng); rotation ở 401.
- Wiring signout revoke + clear cookie.

Out of scope:

- UI màn register/social.
- Multi-tenant scope (E05.1), `/select-role` UI.

## Risk Classification

Risk flags:

- Auth (login/refresh/signout/session).
- Public contracts (endpoint + token shape).
- Existing behavior (login đã chạy).
- Weak proof (auth chưa có test).

Hard gates:

- Auth.

## Work Phases

1. Discovery — đối chiếu `openapi.yaml` IAM cho `TokenResponse`/`*Request`.
2. Design — vị trí lưu refreshToken; cơ chế rotation; clear-on-fail.
3. Validation planning — test login/refresh/signout + failure codes.
4. Implementation — endpoint → DTO/mapper → action → interceptor refresh.
5. Verification — `bun vitest run`, `bun build`; thử token hết hạn → refresh.
6. Harness update — cập nhật `docs/product/auth.md` + rule integration.

## Stop Conditions

Pause for human confirmation if:

- Cách lưu refreshToken cần đổi mô hình cookie/session hiện tại.
- IAM `openapi.yaml` khác giả định về token shape.
- Rotation đụng concurrency (nhiều tab refresh cùng lúc).
