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
bun vitest run        # 27 pass / 9 files
bunx tsc --noEmit     # clean
bun run build         # green
```

## Acceptance Evidence

Verified 2026-06-06 (decision `0019`):

- **Unit**: `auth.mapper` (tokens/profile/session), `auth-failure.mapper`
  (error.code → AuthFailure + network/unknown), `login`/`refresh`/`logout`
  use-cases (validate + forward), `jwt` (decodeJwtExp + isAccessExpired,
  nowMs injected → deterministic).
- **Integration**: `auth.repository` — signin posts `/auth/signin` then GETs
  `/users/me` with fresh bearer; refresh posts `/auth/refresh` and returns
  rotated triple; signout posts `/auth/signout` (no body) + swallows revoke
  errors; error envelope → typed failure.
- **Platform**: `bun run build` green; `tsc --noEmit` clean.
- **Deferred**: E2E browser flow + reactive 401/single-flight refresh
  (follow-up story); needs live IAM or mock harness.
- Vitest aliases `server-only` → stub (`src/test/server-only-stub.ts`) so the
  server-only repository is testable in node env.
