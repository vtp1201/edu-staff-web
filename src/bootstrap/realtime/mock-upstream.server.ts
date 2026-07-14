import "server-only";
import type { RealtimeEvent } from "./event";
import { SSE_PING, toSseFrame } from "./sse";

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

  let timer: ReturnType<typeof setInterval> | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of samples) {
        controller.enqueue(encoder.encode(toSseFrame(event)));
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
