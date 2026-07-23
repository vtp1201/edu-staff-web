/**
 * Realtime event contract (SSE) — decision `0009`, `docs/product/realtime-events.md`.
 *
 * Two frame families share this typed union (US-E18.18):
 *
 *  1. REAL messaging frames — ground-truthed against the `notification` service
 *     `cmd/server` SSE surface (`services/notification/docs/INTEGRATION.md`):
 *     `message.new`, `message.edited`, `message.deleted`, `unread.updated`,
 *     `typing`. On the wire these are FLAT objects (fields at the top level, no
 *     `payload` wrapper) and carry NO `eventId`; `typing` additionally carries
 *     NO `type` field (the SSE `event:` line is the type) and NO `tenantId`.
 *     `parseEvent` normalises the flat wire into the `payload`-wrapped internal
 *     shape below so the dispatch/invalidation code stays uniform.
 *
 *  2. MOCK-ONLY legacy frames — `notification.created`, `notification.new`,
 *     `attendance.updated`, `presence.changed`, `session.revoked`. These were
 *     invented contract-first (ADR `0009`) and have **NO real BE equivalent**;
 *     the real wire never emits them. They are kept permanently for the mock
 *     upstream + Storybook/demo and stay `payload`-wrapped as authored. Do NOT
 *     remove — real mode simply never emits them (zero regression).
 *
 * Frames are NOT the REST envelope (decision `0008`); they carry their own event
 * shape, parsed at the client boundary into this typed union before invalidating
 * TanStack Query.
 */

export type RealtimeEvent =
  // ── Mock-only legacy frames (no real BE equivalent — permanent) ─────────────
  | {
      /** MOCK-ONLY (US-E18.18): no real BE frame — kept for demo/Storybook. */
      type: "notification.created";
      eventId?: string;
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
       * MOCK-ONLY (US-E18.18): no real BE frame — kept for demo/Storybook.
       * US-E10.2 — enriched notification event; carries full localised copy so
       * the client can prepend the item and show a Sonner toast without a round-trip.
       * Payload mirrors the REST DTO for NotificationResponseDto.
       */
      type: "notification.new";
      eventId?: string;
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
      /** MOCK-ONLY (US-E18.18): no real BE frame — kept for demo/Storybook. */
      type: "attendance.updated";
      eventId?: string;
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
      /**
       * MOCK-ONLY (US-E18.18): no real BE frame today — a separately-justified,
       * mock-safe future capability. Stays dormant on the real wire.
       */
      type: "session.revoked";
      eventId?: string;
      tenantId: string;
      occurredAt: string;
      payload: { sessionId: string };
    }
  | {
      /**
       * MOCK-ONLY (US-E18.18): the real wire has NO `presence.changed` frame —
       * presence is polled via `GET /api/v1/presence`, not pushed. Kept for the
       * US-E10.6 mock live-update demo path only.
       */
      type: "presence.changed";
      eventId?: string;
      tenantId: string;
      occurredAt: string;
      payload: {
        memberId: string;
        status: "online" | "recent" | "offline";
        lastActiveAt: string;
      };
    }
  // ── Real messaging frames (ground-truthed, `notification` cmd/server) ───────
  | {
      /**
       * REAL (US-E18.18) — a new chat message arrived. Rich flat wire payload;
       * no `eventId`. Renamed from the speculative `{conversationId}` shape.
       */
      type: "message.new";
      eventId?: string;
      tenantId: string;
      payload: {
        roomId: string;
        messageId: string;
        senderId: string;
        senderName: string;
        preview: string;
        createdAt: string;
        roomType: string;
      };
    }
  | {
      /** REAL (US-E18.18) — a message was edited in a room. */
      type: "message.edited";
      eventId?: string;
      tenantId: string;
      payload: { roomId: string; messageId: string; editedAt: string };
    }
  | {
      /** REAL (US-E18.18) — a message was deleted in a room. */
      type: "message.deleted";
      eventId?: string;
      tenantId: string;
      payload: { roomId: string; messageId: string; deletedAt: string };
    }
  | {
      /** REAL (US-E18.18) — a room's unread counter changed. */
      type: "unread.updated";
      eventId?: string;
      tenantId: string;
      payload: { roomId: string; unreadCount: number };
    }
  | {
      /**
       * REAL (US-E18.18) — a member is typing in a room. Transient, best-effort.
       * The wire body carries NO `type` (the SSE `event:` line supplies it) and
       * NO `tenantId` (server-scoped) — both tolerated by `parseEvent`.
       */
      type: "typing";
      eventId?: string;
      tenantId?: string;
      payload: { roomId: string; userId: string; typing: boolean };
    };

export type RealtimeEventType = RealtimeEvent["type"];

/** All known event names — also the set of SSE `event:` listeners to register. */
export const REALTIME_EVENT_TYPES: readonly RealtimeEventType[] = [
  // mock-only legacy
  "notification.created",
  "notification.new",
  "attendance.updated",
  "session.revoked",
  "presence.changed",
  // real messaging
  "message.new",
  "message.edited",
  "message.deleted",
  "unread.updated",
  "typing",
];

const KNOWN_TYPES = new Set<RealtimeEventType>(REALTIME_EVENT_TYPES);

/** Real messaging frames arrive flat on the wire (no `payload` wrapper). */
const FLAT_WIRE_TYPES = new Set<RealtimeEventType>([
  "message.new",
  "message.edited",
  "message.deleted",
  "unread.updated",
  "typing",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/**
 * Lift a FLAT real-wire messaging frame into the internal `payload`-wrapped
 * shape. Returns `null` when the mandatory fields for the type are missing.
 */
function parseFlatFrame(
  type: RealtimeEventType,
  json: Record<string, unknown>,
): RealtimeEvent | null {
  const tenantId = str(json.tenantId);
  const roomId = str(json.roomId);
  if (roomId === undefined) return null; // every real frame is room-scoped

  switch (type) {
    case "message.new": {
      if (tenantId === undefined) return null;
      return {
        type,
        tenantId,
        payload: {
          roomId,
          messageId: str(json.messageId) ?? "",
          senderId: str(json.senderId) ?? "",
          senderName: str(json.senderName) ?? "",
          preview: str(json.preview) ?? "",
          createdAt: str(json.createdAt) ?? "",
          roomType: str(json.roomType) ?? "",
        },
      };
    }
    case "message.edited": {
      if (tenantId === undefined) return null;
      return {
        type,
        tenantId,
        payload: {
          roomId,
          messageId: str(json.messageId) ?? "",
          editedAt: str(json.editedAt) ?? "",
        },
      };
    }
    case "message.deleted": {
      if (tenantId === undefined) return null;
      return {
        type,
        tenantId,
        payload: {
          roomId,
          messageId: str(json.messageId) ?? "",
          deletedAt: str(json.deletedAt) ?? "",
        },
      };
    }
    case "unread.updated": {
      if (tenantId === undefined) return null;
      const unreadCount =
        typeof json.unreadCount === "number" ? json.unreadCount : 0;
      return { type, tenantId, payload: { roomId, unreadCount } };
    }
    case "typing": {
      const userId = str(json.userId);
      if (userId === undefined || typeof json.typing !== "boolean") return null;
      // `tenantId` is intentionally absent on the typing wire (server-scoped).
      return {
        type,
        ...(tenantId !== undefined ? { tenantId } : {}),
        payload: { roomId, userId, typing: json.typing },
      };
    }
    default:
      return null; // legacy types are never flat
  }
}

/**
 * Parse one SSE `data:` payload (JSON string) into a typed event. `knownType`
 * is the SSE `event:` line name the listener was registered for — it supplies
 * the type when the wire body omits it (the real `typing` frame). Returns `null`
 * for malformed JSON, an unknown type, or a frame missing mandatory fields —
 * parse-first at the boundary, never trust the wire shape.
 *
 *  - `eventId` is optional across the whole union (real frames never send it).
 *  - `tenantId` is optional specifically for `typing` (server-scoped).
 */
export function parseEvent(
  raw: string,
  knownType?: string,
): RealtimeEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(json)) return null;

  const rawType = str(json.type) ?? knownType;
  if (rawType === undefined || !KNOWN_TYPES.has(rawType as RealtimeEventType)) {
    return null;
  }
  const type = rawType as RealtimeEventType;

  // Flat real-wire messaging frame (no `payload` wrapper).
  if (FLAT_WIRE_TYPES.has(type) && !isRecord(json.payload)) {
    return parseFlatFrame(type, json);
  }

  // Payload-wrapped frame (mock/legacy + round-tripped internal shape).
  if (!isRecord(json.payload)) return null;
  // tenantId is required for every type except `typing`.
  if (type !== "typing" && str(json.tenantId) === undefined) return null;

  return json as RealtimeEvent;
}

/**
 * Drop events that don't belong to the tenant the client is scoped to. Frames
 * with no `tenantId` (the real `typing` frame) are always kept — the server has
 * already scoped delivery to the caller's session.
 */
export function shouldHandle(
  event: RealtimeEvent,
  currentTenantId: string,
): boolean {
  return event.tenantId === undefined || event.tenantId === currentTenantId;
}
