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

> ⚠️ **Mismatch hiện tại** — `bootstrap/endpoint/auth.endpoint.ts` đang lệch tên
> với IAM `INTEGRATION.md`:
> | Web hiện tại | IAM thật |
> |---|---|
> | `/auth/login` | `/auth/signin` |
> | `/auth/logout` | `/auth/signout` |
> | `/auth/token/refresh` | `/auth/refresh` |
> | `/auth/me` | `/users/me` |
> | (thiếu) | `/auth/register`, `/auth/social` |
>
> Web bọc accessToken vào cookie httpOnly (server-side). Refresh-token rotation
> CHƯA wiring (interceptor mới chỉ có TODO ở 401). Đồng bộ khi chạm auth thật.

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
