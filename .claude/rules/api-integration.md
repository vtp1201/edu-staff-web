# Rule: BE API Integration (edu-api)

Web tiêu thụ REST API của `edu-api` (cùng team). Khi viết DTO / repository / xử
lý lỗi, TUÂN THEO contract dưới đây.

## Source of truth

| Thứ | Vị trí (repo edu-api) |
| --- | --- |
| Response standard | `.claude/rules/response-standards.md` |
| Integration guide | `services/<svc>/docs/INTEGRATION.md` (vd `iam`) |
| Authoritative contract | `services/<svc>/docs/openapi.yaml` — import vào Bruno |
| Error code catalogue | `services/<svc>/docs/ERROR_CODES.md` |

Mỗi service có một `INTEGRATION.md`. **Trước khi wiring một feature với BE, đọc
`INTEGRATION.md` + `openapi.yaml` của service đó.**

## Service map (5 service — decision `0017`)

BE tách 5 microservice; web đặt `endpoint`/`di`/feature folder theo service đích.
Tên service chuẩn theo `edu-api` — **`chat` (gọi nội bộ) map → `social`**.

| Service BE | Bounded context | Web tiêu thụ |
| --- | --- | --- |
| `iam` | user, member, tenant, auth | auth, tenant, member, profile |
| `core` | school, class, conduct, academic records | dữ liệu gv/hs/hiệu trưởng, lớp, hạnh kiểm, học bạ |
| `lms` | dạy học số | bài giảng, assignment, nội dung học |
| `noti` | event fan-out + delivery (email, push) | thông báo/realtime (SSE proxy — decision `0009`) |
| `social` | messaging + social network | chat/tin nhắn, social feed |

- Một service ↔ một nhóm endpoint; repository KHÔNG gộp nhiều service (ghép
  cross-service ở tầng use-case/presentation).
- BE mới có `iam` + `notification`; `core`/`lms`/`social` **chưa tồn tại** →
  mock-first (decision `0014`) hoặc contract-first (như `0009`) tới khi service lên.

## Response envelope (BẮT BUỘC)

Mọi response `/api/v1` bọc trong envelope ổn định — `success`, `data`, `error`,
`meta` luôn có mặt:

```jsonc
// Success
{ "success": true,  "data": { ... }, "error": null,
  "meta": { "requestId": "req-abc", "timestamp": "..." } }

// Error (HTTP status đúng category — KHÔNG bao giờ 200 + success:false)
{ "success": false, "data": null,
  "error": { "code": "USER_NOT_FOUND", "message": "...", "retryable": false },
  "meta": { "requestId": "req-abc", "timestamp": "..." } }

// Validation (422): error.fields[] = [{ field, message }]
```

- List endpoints thêm `meta.pagination = { nextCursor, hasMore }` (cursor-based).
- `/health` và `/.well-known/jwks.json` trả **raw** (không envelope).

### Hệ quả cho web HTTP client

> ⚠️ **Mismatch hiện tại**: `bootstrap/lib/http.ts` interceptor chỉ unwrap
> `response.data` (lớp axios) → repository nhận **cả envelope** `{success, data,
> error, meta}`, KHÔNG phải payload. Khi wiring real repo với BE:
> - unwrap đúng tới `envelope.data` cho success;
> - đọc `envelope.error` (branch theo `error.code`, KHÔNG theo `message`) và map
>   về failure union của feature;
> - tôn trọng HTTP status cho category; chỉ retry khi `error.retryable === true`
>   (408/429/502/503/504).

## camelCase (BẮT BUỘC)

Mọi field trên wire (response, request body, JWT claim) là **camelCase**:
`userId`, `tenantName`, `nextCursor`, `hasMore`, `accessToken`. DTO web
(`*-response.dto.ts`) phải khai báo đúng camelCase — không snake_case.

## Auth flow (IAM)

Bearer-token, KHÔNG phải cookie ở phía BE:

```text
register → signin/social → { accessToken, refreshToken, tokenType:"Bearer", sessionId }
protected: Authorization: Bearer <accessToken>
401 TOKEN_EXPIRED → POST /auth/refresh (refresh token ROTATED — lưu cái mới, bỏ cái cũ)
signout → revoke session (server đọc session từ token; không gửi trong body)
```

> ✅ **Đã đồng bộ** (US-E01.1, decision `0019`) — `AUTH_EP` khớp IAM:
> `register`, `signin`, `social`, `refresh`, `signout`, `me` (`/users/me`).
> `signin` trả `TokenResponse` (không có user) → repo chain `GET /users/me`.
> Web lưu access + refresh + sessionId trong cookie httpOnly riêng, cộng sibling
> `auth_token_exp`. Rotation chạy **proactive server-side** (`ensureFreshSession`);
> reactive 401-interceptor refresh **defer** (follow-up). Xem `docs/product/auth.md`.

### Token hết hạn — Hybrid (decision `0018`)

Token nằm trong cookie httpOnly → **chỉ check được exp ở server**, client không
đọc được. Chiến lược **hybrid**:

- **Reactive (BẮT BUỘC):** interceptor `http.ts` bắt `401` `TOKEN_EXPIRED` →
  `/auth/refresh` → **retry đúng 1 lần** với token mới. Safety net không bỏ được
  (session có thể revoke sớm theo BE reuse-detection + clock skew).
- **Proactive (tối ưu, server-side):** set sibling cookie `auth_token_exp` khi
  set `auth_token`; helper `bootstrap/lib/auth-token.server.ts` →
  `getAccessToken()` + `isAccessExpired(exp, skew = 30)`; DI factory pre-refresh
  nếu sắp hết hạn để tránh round-trip 401 thừa.
- Refresh phải **single-flight** (gộp request đồng thời vào 1 refresh) tránh
  rotation đá nhau. KHÔNG check exp ở client; KHÔNG lưu token/exp nơi client đọc.

> Trạng thái (US-E01.1, decision `0019`): **proactive** đã wiring
> (`bootstrap/lib/auth-token.server.ts` + `ensureFreshSession` trong
> `bootstrap/di/auth.di.ts`). **Reactive** + **single-flight** còn defer
> (follow-up) — httpOnly cookie không ghi được trong RSC render.

## Headers nên gửi

| Header | Khi |
| --- | --- |
| `Authorization: Bearer <accessToken>` | endpoint protected |
| `Content-Type: application/json` | request có body |
| `Accept-Language: vi`\|`en` | luôn nên gửi — chọn locale của message lỗi |
| `X-Request-Id: <uuid>` | tùy chọn — echo lại ở `meta.requestId`, log để trace |

## Khi BE đổi contract

BE regenerate `openapi.yaml` cùng code. Khi tích hợp/đổi feature: pull
`openapi.yaml` mới, đối chiếu DTO web, ghi decision nếu đụng public contract.
