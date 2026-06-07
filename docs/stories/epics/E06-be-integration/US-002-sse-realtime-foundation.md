# US-E06.2 SSE Realtime Foundation

## Status

implemented

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

- `bootstrap/realtime/`: `event.ts` (typed `RealtimeEvent` union +
  `parseEvent` parse-first guard + `shouldHandle` tenant drop +
  `REALTIME_EVENT_TYPES`), `event-invalidation.ts` (`queryKeysFor` taxonomy →
  TanStack query keys; `session.revoked` → no keys / forced logout), `sse.ts`
  (`toSseFrame` + `SSE_PING` heartbeat), `mock-upstream.server.ts` (mock SSE
  `ReadableStream`, decision `0014`), `use-realtime-events.ts` (client hook:
  same-origin `EventSource` + per-type listeners → `invalidateQueries`;
  `onSessionRevoked`; native auto-reconnect + `Last-Event-ID`).
- Route proxy `app/[locale]/api/stream/route.ts`: reads httpOnly `auth_token`
  (401 if absent), `text/event-stream` + `no-cache` headers; `USE_MOCK`/no
  `NOTI_SERVICE_URL` → mock upstream, else fetch BE noti with Bearer +
  forwarded `Last-Event-ID` (502 on bad upstream). Endpoint `NOTI_EP.stream`.
- Tenant scope interim: `?tenant=` query (cookie `tenant_id` fallback) until
  E05.1 wires the tenant segment; cross-tenant events dropped client-side.
- Proof: **13 new unit** (`event.test.ts` ×10, `sse.test.ts` ×3) — parse/guard,
  tenant drop, taxonomy, frame round-trip; **61 vitest pass**, `tsc --noEmit`
  clean, `bun run build` green (`ƒ /[locale]/api/stream`).
- Env: `NOTI_SERVICE_URL` (unset → mock). Dev runs mock via `NEXT_PUBLIC_USE_MOCK=true`.
