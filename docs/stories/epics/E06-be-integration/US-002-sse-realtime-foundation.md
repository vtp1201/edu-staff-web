# US-E06.2 SSE Realtime Foundation

## Status

planned

## Lane

normal

## Product Contract

Dựng nền realtime server→client bằng SSE qua Next.js route-handler proxy
(decision `0009`), theo contract `docs/product/realtime-events.md` (web định
nghĩa trước, BE follow). Scaffold chạy được end-to-end với một mock upstream;
sẵn sàng nối BE `noti` khi có.

## Relevant Product Docs

- `docs/product/realtime-events.md`
- `docs/decisions/0009-realtime-transport-sse.md`
- `docs/decisions/0007-multi-tenancy-resolution.md` (scope theo tenant)

## Acceptance Criteria

- Route handler SSE proxy (`app/.../api/stream/route.ts`): đọc cookie auth +
  tenant, set `Content-Type: text/event-stream`, pipe từ upstream (mock được).
- Client hook `useRealtimeEvents()`: mở `EventSource` same-origin, parse frame →
  typed event union, **invalidate TanStack Query** theo bảng taxonomy.
- Sự kiện không thuộc tenant hiện tại bị drop.
- Reconnect tự động + gửi `Last-Event-ID`.
- Mock upstream/event source để test khi BE chưa có.

## Design Notes

- API: SSE frame `id/event/data` (camelCase) — xem `realtime-events.md`.
- Domain rules: event union typed; parse ở boundary; `tenantId` bắt buộc.
- UI surfaces: hook client trong `components/shared` hoặc presentation; route
  handler ở `app/`.
- Tables: không.
- Auth: cookie tại proxy; token không ra client. Refresh khi stream lâu → phụ
  thuộc US-E01.1.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | parser frame → typed event; drop sai tenant; map type → invalidate key |
| Integration | route proxy stream từ mock upstream; client nhận & invalidate đúng query |
| E2E | mock event `attendance.updated` → roster tự refetch |
| Platform | `bun build` xanh; route handler streaming chạy ở dev |
| Release | `bun vitest run` |

## Harness Delta

- Tạo `docs/product/realtime-events.md` (contract web-defined).
- Khi BE noti có thật: đối chiếu taxonomy, đồng bộ `openapi.yaml`, cập nhật rule
  integration.

## Evidence

Add after validation.
