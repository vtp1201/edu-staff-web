# 0009 Realtime Transport — SSE via Next.js Route-Handler Proxy

Date: 2026-06-06

## Status

Accepted

## Context

Sẽ có nhu cầu đẩy dữ liệu **server → client** (thông báo, cập nhật điểm danh,
sự kiện). BE có service `noti` (event fan-out + delivery, theo `edu-api`
`AGENTS.md` + `docs/product`), nội bộ dùng RabbitMQ typed events (BE decision
`0019-shared-rabbitmq-typed-events`). Hiện `noti` **chưa tồn tại** (mới có
`iam`), và web **chưa có** hạ tầng realtime nào.

Ràng buộc kỹ thuật chi phối lựa chọn:

- Web giữ token trong **cookie httpOnly** (không đọc được ở client JS).
- `EventSource` (SSE chuẩn) **không set được header `Authorization`** → không
  gắn Bearer trực tiếp từ client.
- Kiến trúc Clean: presentation (client) không import infrastructure; token chỉ
  dùng được server-side.
- Đa tenant (decision `0007`): luồng realtime phải scope theo tenant.

## Decision

**Dùng SSE** làm transport server→client, **qua một Next.js Route Handler đóng
vai proxy**:

```text
client (EventSource, same-origin)
  -> app/.../stream/route.ts  (server: đọc cookie auth_token + tenant)
  -> upstream SSE tới BE noti  (Authorization: Bearer <token>)
  -> pipe sự kiện về client
```

Lý do chọn SSE thay vì WebSocket: luồng một chiều server→client, hợp HTTP/2,
auto-reconnect + `Last-Event-ID` sẵn có, đơn giản hơn WS cho fan-out thông báo.

Proxy route-handler giải quyết auth: client connect same-origin nên cookie
httpOnly tự gửi; token **không bao giờ lộ ra client**; route scope tenant được.

Tích hợp state: sự kiện SSE **invalidate TanStack Query** (`invalidateQueries`)
thay vì sửa cache thủ công — giữ một nguồn chân lý.

## Alternatives Considered

1. **EventSource thẳng tới BE + token qua query string** (`?access_token=`) —
   bỏ: token lọt vào access log/proxy, rủi ro bảo mật.
2. **fetch-based SSE** (`@microsoft/fetch-event-source`) để set header Bearer ở
   client — bỏ ở phase này: token httpOnly không đọc được ở client; thêm lib.
3. **WebSocket** — bỏ: cần hai chiều mới đáng; nặng hơn cho nhu cầu fan-out.

## Consequences

Positive:

- Token server-side, hợp mô hình cookie hiện có; client dùng `EventSource` chuẩn.
- Auto-reconnect/resume sẵn; scope tenant ở route.
- Một điểm tích hợp (route proxy) dễ thêm auth/tenant/logging.

Tradeoffs:

- Thêm một hop (route handler giữ kết nối mở) — cần cân nhắc giới hạn connection
  của host (vd serverless có limit streaming → liên quan decision deployment).
- SSE frame **không** dùng envelope `{success,data,error,meta}` (decision `0008`)
  — đó là response cho request/response; stream có shape sự kiện riêng, parse ở
  boundary.

## Contract-first

BE `noti` chưa tồn tại. Theo chỉ đạo, **web định nghĩa contract trước, BE
follow**: frame format, event taxonomy, auth/lifecycle được chốt ở
`docs/product/realtime-events.md`. Khi BE build noti, đối chiếu và đồng bộ
`openapi.yaml`/`INTEGRATION.md`; lệch thì ghi decision.

## Follow-Up

- ✅ Contract `docs/product/realtime-events.md` (web-defined).
- ✅ Story scaffold `docs/stories/epics/E06-be-integration/US-002-sse-realtime-foundation.md`.
- Auth-over-stream chi tiết (refresh khi stream sống lâu) — hard gate, decision
  bổ sung khi wiring thật (liên quan US-E01.1).
- Ảnh hưởng **deployment** (open decision): host phải hỗ trợ long-lived
  streaming response.
