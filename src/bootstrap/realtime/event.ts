/**
 * Realtime event contract (SSE) — decision `0009`, `docs/product/realtime-events.md`.
 * Web defines this contract first; BE `noti` follows. Frames are NOT the REST
 * envelope (decision `0008`); they carry their own event shape, parsed at the
 * client boundary into this typed union before invalidating TanStack Query.
 */

export type RealtimeEvent =
  | {
      type: "notification.created";
      eventId: string;
      tenantId: string;
      occurredAt: string;
      payload: {
        notificationId: string;
        title: string;
        body: string;
        level: string;
      };
    }
  | {
      /**
       * US-E10.2 — enriched notification event; carries full localised copy so
       * the client can prepend the item and show a Sonner toast without a round-trip.
       * Payload mirrors the REST DTO for NotificationResponseDto.
       */
      type: "notification.new";
      eventId: string;
      tenantId: string;
      occurredAt: string;
      payload: {
        notificationId: string;
        /** Notification category: grade | attendance | discipline | announcement | system */
        type: string;
        titleVi: string;
        titleEn: string;
        bodyVi: string;
        bodyEn: string;
        /** ISO 8601 timestamp */
        ts: string;
      };
    }
  | {
      type: "attendance.updated";
      eventId: string;
      tenantId: string;
      occurredAt: string;
      payload: {
        classId: string;
        periodId: string;
        date: string;
        period: number;
      };
    }
  | {
      type: "session.revoked";
      eventId: string;
      tenantId: string;
      occurredAt: string;
      payload: { sessionId: string };
    };

export type RealtimeEventType = RealtimeEvent["type"];

/** All known event names — also the set of SSE `event:` listeners to register. */
export const REALTIME_EVENT_TYPES: readonly RealtimeEventType[] = [
  "notification.created",
  "notification.new",
  "attendance.updated",
  "session.revoked",
];

const KNOWN_TYPES = new Set<RealtimeEventType>(REALTIME_EVENT_TYPES);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Parse one SSE `data:` payload (JSON string) into a typed event. Returns `null`
 * for malformed JSON, unknown `type`, or a frame missing `eventId`/`tenantId` —
 * parse-first at the boundary, never trust the wire shape.
 */
export function parseEvent(raw: string): RealtimeEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(json)) return null;

  const { type, eventId, tenantId } = json;
  if (typeof type !== "string" || !KNOWN_TYPES.has(type as RealtimeEventType)) {
    return null;
  }
  if (typeof eventId !== "string" || typeof tenantId !== "string") return null;
  if (!isRecord(json.payload)) return null;

  return json as RealtimeEvent;
}

/** Drop events that don't belong to the tenant the client is scoped to. */
export function shouldHandle(
  event: RealtimeEvent,
  currentTenantId: string,
): boolean {
  return event.tenantId === currentTenantId;
}
