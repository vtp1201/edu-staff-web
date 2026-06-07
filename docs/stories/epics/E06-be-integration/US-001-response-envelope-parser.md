# US-E06.1 Response Envelope Parser

## Status

implemented

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

- `bootstrap/lib/api-envelope.ts`: `ApiEnvelope<T>` / `ApiErrorShape` / `Pagination`
  types + class `ApiError` (code/message/retryable/status/requestId/fields) +
  pure helpers `unwrapResponse` (success→`envelope.data`, raw passthrough,
  success:false→throw), `normalizeError` (non-2xx/transport→`ApiError`),
  `errorCodeOf`/`statusOf` (ApiError + raw axios fallback), `parseEnvelope`
  (list `meta.pagination`).
- `bootstrap/lib/http.ts` interceptor delegates to those helpers; `{ raw: true }`
  + `/health` + jwks bypass unwrap (axios `AxiosRequestConfig.raw` augmented).
- `auth.repository.ts` migrated: receives payload directly, maps `ApiError`→
  `AuthFailure` via existing mapper.
- Proof: 11 new unit (`api-envelope.test.ts`) + auth repo integration updated;
  **38 vitest pass**, `tsc --noEmit` clean, `bun run build` green.
