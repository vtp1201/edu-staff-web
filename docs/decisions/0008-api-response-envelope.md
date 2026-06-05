# 0008 API Response Envelope & Error Contract

Date: 2026-06-06

## Status

Accepted

## Context

Web tiêu thụ REST API riêng (cùng team sở hữu, base `…/api/v1`). HTTP client có
response interceptor **unwrap `response.data`**, nên repository nhận data trực
tiếp. Mỗi feature hiện tự suy shape response của mình (DTO) và tự map về failure
union (`AuthFailure`, `AttendanceFailure`).

Chưa có **envelope chuẩn** thống nhất cho: bọc success/error, phân trang
(pagination), và mã lỗi/định danh lỗi từ backend. Thiếu chuẩn này dẫn tới mỗi
feature xử lý lỗi và phân trang theo cách riêng, khó tái dùng mapper và khó dịch
mã lỗi backend → failure type nhất quán.

## Decision

**Adopt envelope chuẩn của BE.** Team BE đã có sẵn standard (xem
`edu-api/.claude/rules/response-standards.md` + mỗi service có
`docs/INTEGRATION.md` + `openapi.yaml`):

```jsonc
{ "success": bool, "data": <payload>|null,
  "error": { "code": "UPPER_SNAKE", "message": "...", "retryable": bool, "fields"?: [...] } | null,
  "meta": { "requestId": "...", "timestamp": "...", "pagination"?: { "nextCursor", "hasMore" } } }
```

Quy tắc web phải theo:

- Wire fields **camelCase** (không snake_case ở bất kỳ payload nào).
- HTTP status mang category; chỉ retry khi `error.retryable === true`
  (408/429/502/503/504).
- Branch lỗi theo `error.code` (UPPER_SNAKE), KHÔNG theo `message` (đã localize).
- List dùng cursor-based pagination (`meta.pagination`).
- `/health`, `/.well-known/jwks.json` trả raw — không envelope.

Source of truth của contract là `openapi.yaml` của từng service. Web hoá quy tắc
này thành `.claude/rules/api-integration.md`.

## Alternatives Considered

1. **Envelope tường minh**: `{ data, error, meta }` cho mọi response; lỗi mang
   `code` ổn định để map sang failure type. Phân trang trong `meta`.
2. **Data trần + HTTP status**: backend trả data trực tiếp, dùng HTTP status +
   body lỗi tối giản; mapper mỗi feature tự diễn giải (gần với hiện trạng).
3. **Hybrid**: data trần cho success, body lỗi chuẩn hóa `{ code, message }` cho
   non-2xx.

## Consequences

Positive:

- Một chuẩn → mapper và xử lý lỗi tái dùng được, dịch mã lỗi → failure type
  nhất quán across feature.
- Phân trang thống nhất giúp list view (history, roster, dashboard) dùng chung
  hạ tầng.

Tradeoffs:

- Envelope tường minh: thêm một lớp bọc, phải đồng bộ chặt với backend.
- Data trần: linh hoạt nhưng dễ phân mảnh cách xử lý lỗi.

## Follow-Up

- ✅ `.claude/rules/api-integration.md` tạo (hoá rule contract BE cho web).
- ✅ `docs/product/api-conventions.md` cập nhật theo envelope thật.
- **Mismatch cần xử lý** (đã ghi trong rule): interceptor `bootstrap/lib/http.ts`
  mới unwrap `response.data` (axios) — chưa unwrap `envelope.data` / chưa đọc
  `envelope.error`. Cần một parser envelope dùng chung ở `bootstrap/lib/http`
  trước khi wiring real repo. → ứng viên story riêng (normal).
- ✅ Durable row: `harness-cli decision add`.
