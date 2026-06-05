# API Conventions — EduPortal

Quy ước tiêu thụ REST API riêng (base mặc định `http://localhost:8080/api/v1`,
qua `NEXT_PUBLIC_API_URL`). Backend do **cùng team sở hữu** → contract đồng bộ
chủ động hai chiều; đổi shape response phải cập nhật DTO song song và ghi
decision nếu đụng public contract.

## Tầng dữ liệu: DTO → Mapper → Entity

Dữ liệu API là *unknown* cho tới khi qua mapper. Không để DTO thô lọt vào
domain/presentation.

```text
API JSON
  -> DTO        infrastructure/dtos/<name>-response.dto.ts   (shape API thô)
  -> mapper     infrastructure/mappers/<name>.mapper.ts      (DTO -> Entity)
  -> Entity     domain/entities/<name>.entity.ts             (product type)
```

## Response envelope (chuẩn BE — decision 0008)

Mọi response `/api/v1` bọc trong envelope ổn định:

```jsonc
{ "success": bool, "data": <payload>|null,
  "error": { "code": "UPPER_SNAKE", "message", "retryable", "fields"? } | null,
  "meta": { "requestId", "timestamp", "pagination"? } }
```

- Wire fields **camelCase**. List dùng cursor pagination (`meta.pagination =
  { nextCursor, hasMore }`). `/health`, `/.well-known/jwks.json` trả raw.
- Branch lỗi theo `error.code`, KHÔNG theo `message`. Chỉ retry khi
  `error.retryable === true`.
- Chi tiết + mismatch hiện tại: `.claude/rules/api-integration.md`.

## HTTP client

- `bootstrap/lib/http.ts` — `createHttpClient(token?)`: Axios factory.
- `bootstrap/lib/http.server.ts` — `createServerHttpClient()` (server-only):
  đọc `auth_token` từ cookie httpOnly. Chỉ dùng trong `bootstrap/di/`.
- ⚠️ Interceptor hiện chỉ unwrap `response.data` (lớp axios) → repository nhận
  **cả envelope**, chưa unwrap `envelope.data`. Cần parser envelope dùng chung
  trước khi wiring real repo (xem decision 0008 Follow-Up).

## Endpoint constants

Không dùng magic string trong repository. Khai báo trong
`bootstrap/endpoint/<feature>.endpoint.ts`:

```text
AUTH_EP        = { login, logout, refresh, me }
ATTENDANCE_EP  = { myClasses, roster(classId), save(periodId), history(classId) }
```

Endpoint có tham số dùng dạng function trả URL (vd `roster(classId)`).

## Lỗi: typed failure, không throw cho lỗi nghiệp vụ

- Mỗi feature định nghĩa `<name>.failure.ts` là union các `{ type, ... }`.
- Use-case trả `Result`-style (`{ data } | { error }`) cho lỗi nghiệp vụ
  (vd `AuthResult`), hoặc trả failure union — **không** ném exception cho lỗi
  domain dự đoán được.
- Lỗi hạ tầng (network) cũng được map về một failure type
  (`network-error`) thay vì để lộ axios error ra ngoài.

## Wiring (DI)

```text
app/.../actions.ts ('use server')
  -> makeXxxUseCase()  (bootstrap/di, server-only, tạo mới per-request)
  -> new XxxUseCase(new XxxRepository(http))
```

Đổi giữa **mock repository** và **real repository** chỉ là việc của DI factory —
use-case và presentation không đổi.

## Client caching

- Dùng **TanStack Query v5** cho remote data ở client. Không dùng `useState` cho
  dữ liệu từ API.

## Chưa chốt

- **Response envelope chuẩn** (success/error wrapper, pagination, mã lỗi) — hiện
  suy từ từng feature; nên thống nhất khi backend cố định contract, rồi cập nhật
  file này.
