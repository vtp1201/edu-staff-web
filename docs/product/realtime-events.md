# Realtime Events (SSE) — EduPortal

> **Contract-first**: contract này do **web định nghĩa trước**; BE (`noti`
> service) sẽ follow khi build. Transport & kiến trúc: decision `0009`.
> Khi BE implement, đối chiếu lại và đồng bộ `openapi.yaml`/`INTEGRATION.md`.

## Transport

Server → client một chiều bằng **SSE**, qua **Next.js Route Handler proxy**
(client connect same-origin; cookie httpOnly tự gửi; route đọc token + tenant
rồi mở upstream SSE tới BE noti bằng Bearer).

```text
client EventSource  ──►  /{tenant}/{locale}/api/stream   ──►  BE noti SSE (Bearer)
       ▲  (same-origin, cookie)        (server proxy)              (upstream)
       └──────────────── events piped back ──────────────────────────┘
```

## Frame format (SSE)

Mỗi sự kiện là một SSE frame. **Không** dùng envelope request/response
(`{success,data,error,meta}` — đó là cho REST). Shape sự kiện:

```text
id: <eventId>            # dùng cho Last-Event-ID khi reconnect
event: <eventType>       # tên sự kiện, xem taxonomy
data: <JSON payload>     # camelCase
```

```jsonc
// ví dụ frame data
{
  "eventId": "evt-123",
  "type": "attendance.updated",
  "tenantId": "acme",
  "occurredAt": "2026-06-06T10:00:00Z",
  "payload": { /* tuỳ type, camelCase */ }
}
```

Quy tắc:

- Mọi field **camelCase**.
- `tenantId` luôn có — client/route phải drop sự kiện không thuộc tenant hiện tại.
- `eventId` đơn điệu để resume bằng `Last-Event-ID`.
- Client parse `data` ở boundary thành typed event union (parse-first), rồi
  **invalidate TanStack Query** tương ứng (không tự sửa cache).

## Event taxonomy (khởi tạo — BE follow, RabbitMQ typed events là nguồn)

Bám theo typed events nội bộ của BE (BE decision `0019-shared-rabbitmq-typed-events`).

| `type` | Khi | Payload (camelCase) | Web phản ứng |
| --- | --- | --- | --- |
| `notification.created` | Có thông báo mới cho user | `{ notificationId, title, body, level }` | invalidate list thông báo; toast |
| `attendance.updated` | Buổi điểm danh thay đổi | `{ classId, periodId, date, period }` | invalidate roster/history của lớp |
| `session.revoked` | Phiên bị thu hồi (signout nơi khác) | `{ sessionId }` | ép logout client |
| `presence.changed` | Trạng thái hoạt động của 1 contact/thành viên đổi (US-E10.6) | `{ memberId, status: online\|recent\|offline, lastActiveAt }` (bucket thô, không precise) | invalidate `["messaging","conversations"]` + prefix `["messaging","presence"]` (refetch, không patch cache). Single-member/event (OQ-3). |

> Danh sách mở rộng dần khi BE thêm typed event. Mỗi `type` mới phải kèm payload
> camelCase và quy tắc phản ứng phía web ở bảng này.

## Auth & lifecycle

- Auth qua cookie httpOnly tại route proxy (không truyền token ra client/URL).
- Reconnect: EventSource tự reconnect; gửi `Last-Event-ID` để resume.
- Token hết hạn khi stream sống lâu → route proxy refresh server-side (liên quan
  US-E01.1) rồi nối lại upstream; chi tiết là hard gate, ghi decision khi wiring.
- Heartbeat: BE nên gửi comment-ping (`: ping`) định kỳ để giữ kết nối qua proxy.

## Open Questions (chốt cùng BE khi noti build)

1. Một stream gộp mọi event của user, hay nhiều stream theo topic?
2. Cơ chế resume/backfill khi client offline lâu (Last-Event-ID giữ được bao xa)?
3. Giới hạn connection của host (liên quan open decision deployment).
