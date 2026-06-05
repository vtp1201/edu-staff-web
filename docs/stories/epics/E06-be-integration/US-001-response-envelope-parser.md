# US-E06.1 Response Envelope Parser

## Status

planned

## Lane

normal

## Product Contract

Web phải đọc đúng envelope chuẩn của BE (`{ success, data, error, meta }` —
decision `0008`) ở một nơi dùng chung, để repository nhận **payload** đã unwrap
và lỗi được map nhất quán theo `error.code`.

## Relevant Product Docs

- `docs/product/api-conventions.md`
- `.claude/rules/api-integration.md`
- `docs/decisions/0008-api-response-envelope.md`

## Acceptance Criteria

- `bootstrap/lib/http.ts` interceptor unwrap tới `envelope.data` cho success
  (thay vì chỉ `response.data` của axios).
- Non-2xx / `success:false` → ném/đẩy một lỗi chuẩn hoá mang `code`
  (UPPER_SNAKE), `message`, `retryable`, `fields?`, và `requestId` (từ `meta`).
- Helper map `error.code` → failure union của feature dùng lại được.
- `meta.pagination` (`nextCursor`, `hasMore`) lấy ra được cho list endpoint.
- `/health`, `/.well-known/jwks.json` (raw, không envelope) vẫn đọc được.

## Design Notes

- API: envelope BE; branch theo `error.code` không theo `message`.
- Domain rules: chỉ retry khi `retryable === true` (408/429/502/503/504).
- UI surfaces: không trực tiếp; nền tảng cho mọi real repository.
- Tách type `ApiEnvelope<T>` + `ApiError` ở `bootstrap/lib`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | unwrap success → data; success:false → ApiError có code/retryable; raw endpoint không bị unwrap |
| Integration | một repo thật (vd auth) nhận payload đúng sau parser |
| E2E | — |
| Platform | `bun build` xanh |
| Release | `bun vitest run` |

## Harness Delta

Củng cố `.claude/rules/api-integration.md` (gỡ cảnh báo mismatch interceptor sau
khi xong).

## Evidence

Add after validation.
