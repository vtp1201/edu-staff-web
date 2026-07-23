# Realtime Events (SSE) — EduPortal

> **Contract-first → ground-truthed (US-E18.18).** Contract ban đầu do web định
> nghĩa trước (decision `0009`); BE `notification` service nay đã ship
> `cmd/server` SSE surface. Vocabulary THỰC TẾ hoàn toàn messaging-scoped
> (`message.new`/`message.edited`/`message.deleted`/`unread.updated`/`typing`) —
> xem `edu-api/services/notification/docs/INTEGRATION.md`. Các frame cũ web tự
> nghĩ ra (`notification.*`/`attendance.updated`/`presence.changed`/
> `session.revoked`) **KHÔNG có tương đương thực** → giữ **mock-only vĩnh viễn**
> cho demo/Storybook (real mode không bao giờ emit chúng).
>
> ⚠️ **Live verification hoãn (US-E18.18)**: Kong chưa route `notification`, VÀ
> proxy direct-bypass (ADR `0009`/`0030`) gửi `Bearer` nhưng service chỉ tin
> `X-Edu-Claims` do Kong ký (edu-api ADR `0047`) → real stream sẽ 401 tới khi
> proxy đi qua Kong. Path đã sửa (`/api/v1/stream`) đúng bất kể điều đó.

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
// REAL messaging frame — FLAT (fields ở top level, KHÔNG có `payload` wrapper,
// KHÔNG có `eventId`). Ví dụ message.new:
{
  "type": "message.new",
  "tenantId": "acme",
  "roomId": "...", "messageId": "...", "senderId": "...",
  "senderName": "...", "preview": "...", "createdAt": "...",
  "roomType": "class_chat"
}
// typing: KHÔNG có `type` (event: line là type) và KHÔNG có `tenantId`:
{ "roomId": "...", "userId": "...", "typing": true }
```

Quy tắc:

- Mọi field **camelCase**.
- `tenantId`: có ở mọi real messaging frame TRỪ `typing` (server đã scope) →
  client giữ `typing` dù thiếu `tenantId`; các frame khác thiếu/ sai `tenantId`
  bị drop.
- `eventId`: **optional** trên toàn union — real frame KHÔNG gửi. `Last-Event-ID`
  resume vẫn dùng khi BE cấp `id:`.
- Real messaging frame đi **flat** trên wire; client `parseEvent(data, knownType)`
  normalize về shape `payload`-wrapped nội bộ (knownType = tên `event:` line, cấp
  type cho `typing`).
- Client parse ở boundary (parse-first) rồi **invalidate TanStack Query** tương
  ứng (không tự sửa cache); `typing` là ngoại lệ — dispatch qua callback
  `onTyping`, không invalidate.

## Event taxonomy

### Real frames (ground-truthed — `notification` cmd/server, US-E18.18)

| `type` | Khi | Payload (camelCase, flat trên wire) | Web phản ứng |
| --- | --- | --- | --- |
| `message.new` | Tin nhắn mới trong room | `{ roomId, messageId, senderId, senderName, preview, createdAt, roomType }` | bump pending-pill (nếu không ở `/messages`) + invalidate `["messaging","conversations"]` + `["messaging","messages",roomId]` |
| `message.edited` | Tin nhắn được sửa | `{ roomId, messageId, editedAt }` | invalidate `conversations` + `messages[roomId]` |
| `message.deleted` | Tin nhắn bị xoá | `{ roomId, messageId, deletedAt }` | invalidate `conversations` + `messages[roomId]` |
| `unread.updated` | Bộ đếm unread của room đổi | `{ roomId, unreadCount }` | invalidate `conversations` + `messages[roomId]` |
| `typing` | Thành viên đang gõ (transient) | `{ roomId, userId, typing }` (không `type`/`tenantId`) | drive chat-window `isTyping` cho ĐÚNG conversation đang mở (frame room khác bị bỏ qua); không invalidate |

### Mock-only frames (không có tương đương BE — giữ vĩnh viễn cho demo)

| `type` | Payload (payload-wrapped) | Web phản ứng | Ghi chú |
| --- | --- | --- | --- |
| `notification.created` | `{ notificationId, title, body, level }` | invalidate `["notifications"]`; toast | mock-only |
| `notification.new` | `{ notificationId, type, titleVi/En, bodyVi/En, ts }` | invalidate list variants + unread-count; prepend + toast | mock-only |
| `attendance.updated` | `{ classId, periodId, date, period }` | invalidate roster/history của lớp | mock-only |
| `presence.changed` | `{ memberId, status, lastActiveAt }` | invalidate `["messaging","conversations"]` + prefix `["messaging","presence"]` | mock-only (presence THỰC là poll `GET /api/v1/presence`, không push) |
| `session.revoked` | `{ sessionId }` | ép logout client | mock-only (future capability) |

> `createMockUpstream` phát cả legacy frame VÀ sample real-shaped flat frame
> (`message.new`/`unread.updated`/`typing`) để đường inbound mới demoable ở mock.

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
