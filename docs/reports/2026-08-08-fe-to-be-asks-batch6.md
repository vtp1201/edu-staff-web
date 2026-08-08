# FE → BE (2026-08-08, batch 6): 4/4 asks tiêu thụ xong (US-E18.56→59) + 1 ask mới

> Trả lời cho `2026-08-08-be-to-fe-response.md` (edu-api main HEAD `b5a13cc1`).
> FE đã tiêu thụ xong toàn bộ batch: asks #47/#48/#32(b′)/#49 đóng qua
> **4 US wiring US-E18.56→59, tất cả merged `main` 2026-08-08** (suite
> 522 files / 4111+ unit tests xanh, `bunx tsc --noEmit` sạch, `bun run build`
> xanh cả mock lẫn real mode). Deploy-order checklist (core migration 051,
> Kong reload) đã hợp nhất vào `EPIC-OVERVIEW.md` §"Deploy notes (go-live
> real mode)".

## Phần 1 — Batch 6 đã đóng (đối chiếu report 2026-08-08 §1)

| Ask | BE US | FE US | Ghi chú tiêu thụ |
| --- | --- | --- | --- |
| #47 | US-204 | US-E18.56 | `academicYear` (wire key, `omitempty`) giờ nằm trên mỗi record row ⇒ xoá hoàn toàn enrollment-year point-read fan-out (chưa từng hoạt động cho PARENT). `buildAcademicRecord()` group thẳng theo field. `makeSealRepository()` cùng file byte-identical (verify bằng `git diff` rỗng). |
| #48 | US-206 (ADR 0136) | US-E18.57 | BE cấp quyền TEACHER lọc theo homeroom (GVCN); `records:[]` khi không GVCN lớp nào (KHÔNG 403). Pipeline hiện có không cần đổi code (RBAC hoàn toàn phía BE, empty-state đã tách khỏi error-state từ US-E18.54) — delta thật là copy empty-state riêng cho teacher + regression guard + sửa `docs/product/screens.md`. |
| #32(b′) | US-205 | US-E18.58 | `senderName` pin board giờ resolve thật; sender chưa project → literal `"Member"` (không còn `""`). Mapper coi `"Member"` như absent, tái dùng fallback i18n có sẵn — không branch UI mới. History/search/edit xác nhận không đụng (mapper khác). |
| #49 | US-207 | US-E18.59 | Chuyển `lookup`+`redeem` sang gọi thẳng từ browser (ADR **0072** — lần đầu một BE call phát trực tiếp từ Client Component trong repo này). Session-write vẫn server-side qua Server Action mới, hẹp (`finalizeRedeemAction`, không gọi lại IAM — proven bằng test). Cảm ơn BE đã tự phát hiện + fix blocker gateway (route public chưa từng qua được Kong) trong lúc verify ask này. |

## Phần 2 — Ask MỚI (phát sinh khi implement #49)

21. **CORS preflight (`OPTIONS`) của `POST /iam/api/v1/invitations/{redeem,lookup}`
    chưa được verify qua Kong thật.** US-207 §5.2 verify `POST` trực tiếp
    (đúng, đã fix blocker route-chưa-reachable), nhưng **không** verify
    `OPTIONS` — và giờ FE gọi cả hai route này **trực tiếp từ browser**
    (US-E18.59, ADR 0072), nên mọi request thật sẽ có preflight CORS đi
    trước: `Content-Type: application/json` không nằm trong safelisted
    header nên trigger `OPTIONS`, và `redeem` còn gửi thêm header
    `X-Client-Id` (audit metadata, không mang token). Nếu route public
    (anchored regex + `methods: [POST]`) không match preflight `OPTIONS`
    giống cách nó match `POST`, MỌI browser sẽ block cả hai call **trước cả
    khi request rời máy khách** — không phải lỗi 500/503 dễ thấy trong log
    BE, mà một lỗi generic phía client (FE sẽ hiện thẳng bucket
    `network-error`). Đây là gate go-live THỨ BA cho luồng invitation, sau
    migration 051 và Kong reload.

    Đề nghị BE verify trên stack thật:
    - `OPTIONS /iam/api/v1/invitations/lookup` và `.../redeem` qua Kong (không
      gọi trực tiếp service) → mong đợi 2xx/204 (không phải 401 — nếu route
      match chỉ đúng `POST` mà không match `OPTIONS`, `edu-edge-auth` có thể
      lại chặn preflight ở edge như blocker cũ của US-207 §5.2).
    - Response header `Access-Control-Allow-Headers` của preflight đó có bao
      gồm `Content-Type` VÀ `X-Client-Id` không.
    - Nếu Kong hiện tại route `OPTIONS` qua một route riêng (CORS thường xử
      lý ở edge plugin, không phải per-route) thì xin xác nhận plugin đó áp
      dụng cho đúng 2 path/method mới, không chỉ path cũ.

    Contingency có sẵn phía FE nếu BE không kịp mở `X-Client-Id` trong
    `Access-Control-Allow-Headers`: bỏ header đó khỏi call `redeem` (chỉ là
    audit metadata, một dòng code) — không cần trả lời gấp nếu chọn phương
    án này, chỉ cần xác nhận `Content-Type` đủ.

## Phần 3 — Còn treo (không đổi)

- **#21 (còn lại)** — audit-trail seal/unseal đa cycle: vị trí BE không đổi.
  FE chưa có nhu cầu cụ thể hơn — giữ treo, không ask lại.
- `senderName` cho history/search/edit (report 2026-08-08 §4) — FE xác nhận
  chưa có nhu cầu, không ask.

## Tham chiếu

| Thứ | Ở đâu |
| --- | --- |
| ADR 0072 (invitation browser-direct fetch, amends 0071) | `docs/decisions/0072-invitation-browser-direct-fetch.md` |
| Story packets | `docs/stories/epics/E18-be-wiring/US-E18.56-academic-year-denorm-wiring/`, `US-E18.57-teacher-homeroom-scoped-record-read/`, `US-E18.58-pin-board-sender-name/`, `US-E18.59-invitation-browser-direct-fetch/` |
| Deploy notes | `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` §"Deploy notes (go-live real mode)" — gate #3 mới (CORS preflight) |
