# Validation — US-E01.1 Auth Endpoint Alignment

## Proof Strategy

Story xong khi: signin/refresh/signout gọi đúng endpoint IAM; token shape map
đúng; rotation giữ phiên qua 401; signout revoke + xóa cookie; lỗi map theo
`error.code`.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | mapper `TokenResponse → AuthSession`; `LoginUseCase` validate rỗng; map `error.code` → `AuthFailure` |
| Integration | repo gọi đúng path (`/auth/signin` …); refresh nhận cặp mới & ghi đè cookie; signout 204 + clear cookie |
| E2E | login → gọi protected → access hết hạn → tự refresh → vẫn vào được; signout → bị chặn |
| Platform | `bun build` xanh |
| Performance | single-flight refresh: nhiều request 401 đồng thời chỉ refresh 1 lần |
| Logs/Audit | log `requestId`, không lộ token trong log |

## Fixtures

- User hợp lệ: `a@school.vn` / `Secret12!`.
- Token hết hạn (giả lập `TOKEN_EXPIRED`).
- refreshToken cũ đã bị rotate (giả lập reuse → revoke).

## Commands

```text
TBD — bun vitest run ; bun build
```

## Acceptance Evidence

Add results after verification.
