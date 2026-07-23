import "server-only";
import type { RealtimeEvent } from "./event";
import { SSE_PING, toSseFrame } from "./sse";

/**
 * Serialise a FLAT real-wire messaging frame (fields at the top level, no
 * `payload` wrapper, no `eventId`) exactly as the `notification` cmd/server SSE
 * surface emits it (US-E18.18). Used only by the mock upstream so the real
 * inbound-wiring path (`parseEvent` flat-frame normalisation → dispatch) is
 * demoable/testable in mock mode too.
 */
function flatFrame(eventName: string, body: Record<string, unknown>): string {
  return `event: ${eventName}\ndata: ${JSON.stringify(body)}\n\n`;
}

/**
 * Mock SSE upstream for development / tests before BE `noti` exists
 * (decision `0014` mock-first, `0009` transport). Emits a couple of sample
 * frames scoped to `tenantId`, then heartbeats — so the route proxy and the
 * `useRealtimeEvents` hook can be exercised end-to-end with no backend.
 */
export function createMockUpstream(
  tenantId: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const samples: RealtimeEvent[] = [
    {
      type: "notification.created",
      eventId: "mock-1",
      tenantId,
      occurredAt: "2026-06-06T10:00:00Z",
      payload: {
        notificationId: "n-1",
        title: "EduPortal",
        body: "mock notification",
        level: "info",
      },
    },
    {
      type: "attendance.updated",
      eventId: "mock-2",
      tenantId,
      occurredAt: "2026-06-06T10:00:05Z",
      payload: {
        classId: "c-1",
        periodId: "p-1",
        date: "2026-06-06",
        period: 2,
      },
    },
    {
      // US-E10.6 INT-402 mock — flip a seeded contact offline → online a few
      // seconds after connect, exercising the presence.changed invalidation path.
      type: "presence.changed",
      eventId: "mock-3",
      tenantId,
      occurredAt: "2026-06-06T10:00:08Z",
      payload: {
        memberId: "u5",
        status: "online",
        lastActiveAt: "2026-06-06T10:00:08Z",
      },
    },
  ];

  // US-E18.18 — sample REAL-shaped flat frames so the new messaging inbound
  // wiring (conversations/message-thread invalidation + the inbound typing
  // indicator) is exercisable in mock mode. `u1`/`g1` are seeded mock room ids
  // (mock conversation id === contact id); `typing` targets the direct
  // conversation `u1` since the indicator only renders for non-group rooms.
  const realSamples: string[] = [
    flatFrame("message.new", {
      type: "message.new",
      tenantId,
      roomId: "g1",
      messageId: "m-mock-1",
      senderId: "u4",
      senderName: "Lê Thị Hoa",
      preview: "mock: tin nhắn mới",
      createdAt: "2026-06-06T10:00:10Z",
      roomType: "class_chat",
    }),
    flatFrame("unread.updated", {
      type: "unread.updated",
      tenantId,
      roomId: "g1",
      unreadCount: 4,
    }),
    // No `type`/`tenantId` on the typing wire (matches the real frame) — the
    // listener's event name supplies the type, and the server has already
    // scoped delivery to the caller.
    flatFrame("typing", { roomId: "u1", userId: "u1", typing: true }),
  ];

  let timer: ReturnType<typeof setInterval> | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of samples) {
        controller.enqueue(encoder.encode(toSseFrame(event)));
      }
      for (const frame of realSamples) {
        controller.enqueue(encoder.encode(frame));
      }
      timer = setInterval(() => {
        controller.enqueue(encoder.encode(SSE_PING));
      }, 15_000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
}
