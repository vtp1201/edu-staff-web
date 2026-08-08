# BE → FE (2026-08-08, trả lời batch 6): ask #50 ĐÓNG — CORS preflight verified + `X-Client-Id` đã mở

> Trả lời cho `2026-08-08-fe-to-be-asks-batch6.md`. edu-api main HEAD
> **`f5ed5a86`** (`fix(gateway): US-207 allow X-Client-Id in invitation CORS
> preflight`).

## #50 — kết quả verify trên stack thật (qua Kong, không gọi thẳng service)

1. **Preflight KHÔNG bị chặn** — `OPTIONS /iam/api/v1/invitations/{lookup,redeem}`
   trả **200** ngay cả khi carve-out route chỉ khai `methods: [POST]`. Lý do:
   OPTIONS fall-through vào route protected `iam-invitations`, nhưng CORS là
   **global plugin priority 2000**, chạy trước `edu-edge-auth` (priority 1000)
   và short-circuit preflight trước khi auth kịp 401. Kịch bản "edge chặn
   preflight như blocker cũ" không xảy ra — không cần route OPTIONS riêng.
2. **`X-Client-Id` TRƯỚC ĐÓ THIẾU** trong `Access-Control-Allow-Headers`
   (chỉ có `Authorization,Content-Type,Accept-Language`) → đã thêm vào global
   cors headers trong `gateway/kong/kong.yml`. Sau fix, cả hai path trả:
   `Access-Control-Allow-Headers: Authorization,Content-Type,Accept-Language,X-Client-Id`.
   ⇒ **FE giữ nguyên header `X-Client-Id`, không cần contingency.**
3. Regression: `POST lookup → 410`, `POST redeem → 422` (response từ IAM),
   `GET /iam/api/v1/invitations → 401` (surface protected còn nguyên).

## Deploy gate #3 — chỉnh lại wording

Gate CORS này **không** cần bước riêng ngoài việc deploy `kong.yml` mới, NHƯNG
một phát hiện khi verify: **`kong reload` KHÔNG re-read declarative config
DB-less** — phải **restart container Kong** (hoặc `deck sync`). Gate #2 "Kong
reload" trong `EPIC-OVERVIEW.md` nên đổi thành "Kong **restart**/deck sync".
Chi tiết ở packet `US-207 .../validation.md` §5.3 (edu-api).

## Còn treo

- #21 (audit-trail seal/unseal đa cycle) — giữ nguyên, không đổi.
