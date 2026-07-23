import { describe, expect, it } from "vitest";
import { parseEvent, type RealtimeEvent, shouldHandle } from "./event";
import { queryKeysFor } from "./event-invalidation";

function frame(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: "attendance.updated",
    eventId: "evt-1",
    tenantId: "acme",
    occurredAt: "2026-06-06T10:00:00Z",
    payload: { classId: "c1", periodId: "p1", date: "2026-06-06", period: 2 },
    ...over,
  });
}

/**
 * A FLAT real-wire messaging frame (US-E18.18) — fields at the top level, no
 * `payload` wrapper, no `eventId`. `tenantId` is included for the message.*
 * / unread frames (the real wire carries it); the `typing` frame supplies its
 * own body without `type`/`tenantId`.
 */
function flatMsg(
  type: string,
  fields: Record<string, unknown>,
  tenantId: string | undefined = "acme",
): string {
  return JSON.stringify({
    type,
    ...(tenantId !== undefined ? { tenantId } : {}),
    ...fields,
  });
}

describe("parseEvent", () => {
  it("parses a well-formed frame into a typed event", () => {
    const e = parseEvent(frame());
    expect(e?.type).toBe("attendance.updated");
    expect(e?.tenantId).toBe("acme");
  });

  it("returns null for malformed JSON", () => {
    expect(parseEvent("{not json")).toBeNull();
  });

  it("returns null for an unknown event type", () => {
    expect(parseEvent(frame({ type: "mystery.event" }))).toBeNull();
  });

  it("accepts a missing eventId (optional across the union — US-E18.18)", () => {
    expect(parseEvent(frame({ eventId: undefined }))?.type).toBe(
      "attendance.updated",
    );
  });

  it("returns null when a non-typing frame's tenantId is missing/invalid", () => {
    expect(parseEvent(frame({ tenantId: undefined }))).toBeNull();
    expect(parseEvent(frame({ tenantId: 123 }))).toBeNull();
  });

  it("returns null when payload is absent", () => {
    expect(parseEvent(frame({ payload: undefined }))).toBeNull();
  });
});

describe("shouldHandle (tenant scoping)", () => {
  const event = parseEvent(frame()) as RealtimeEvent;

  it("keeps events for the current tenant", () => {
    expect(shouldHandle(event, "acme")).toBe(true);
  });

  it("drops events for another tenant", () => {
    expect(shouldHandle(event, "beta")).toBe(false);
  });
});

describe("queryKeysFor (taxonomy)", () => {
  it("invalidates the notification list on notification.created", () => {
    const e = parseEvent(
      frame({
        type: "notification.created",
        payload: { notificationId: "n1", title: "t", body: "b", level: "info" },
      }),
    ) as RealtimeEvent;
    expect(queryKeysFor(e)).toEqual([["notifications"]]);
  });

  it("invalidates roster + history for the class on attendance.updated", () => {
    const e = parseEvent(frame()) as RealtimeEvent;
    expect(queryKeysFor(e)).toEqual([
      ["attendance", "roster", "c1"],
      ["attendance", "history", "c1"],
    ]);
  });

  it("returns no query keys for session.revoked (handled as forced logout)", () => {
    const e = parseEvent(
      frame({ type: "session.revoked", payload: { sessionId: "s1" } }),
    ) as RealtimeEvent;
    expect(queryKeysFor(e)).toEqual([]);
  });

  // US-E18.18: real messaging frames invalidate the conversations list + the
  // room message thread (when a roomId is present).
  it("invalidates conversations + the room thread on message.new", () => {
    const e = parseEvent(
      flatMsg("message.new", {
        roomId: "room-9",
        messageId: "m-1",
        senderId: "u4",
        senderName: "Hoa",
        preview: "hi",
        createdAt: "2026-07-20T08:00:00Z",
        roomType: "class_chat",
      }),
    ) as RealtimeEvent;
    expect(queryKeysFor(e)).toEqual([
      ["messaging", "conversations"],
      ["messaging", "messages", "room-9"],
    ]);
  });

  it("invalidates conversations + the room thread on unread.updated", () => {
    const e = parseEvent(
      flatMsg("unread.updated", { roomId: "room-9", unreadCount: 3 }),
    ) as RealtimeEvent;
    expect(queryKeysFor(e)).toEqual([
      ["messaging", "conversations"],
      ["messaging", "messages", "room-9"],
    ]);
  });

  it("invalidates on message.edited and message.deleted", () => {
    const edited = parseEvent(
      flatMsg("message.edited", {
        roomId: "r1",
        messageId: "m1",
        editedAt: "2026-07-20T08:00:00Z",
      }),
    ) as RealtimeEvent;
    const deleted = parseEvent(
      flatMsg("message.deleted", {
        roomId: "r1",
        messageId: "m1",
        deletedAt: "2026-07-20T08:00:00Z",
      }),
    ) as RealtimeEvent;
    expect(queryKeysFor(edited)).toContainEqual([
      "messaging",
      "messages",
      "r1",
    ]);
    expect(queryKeysFor(deleted)).toContainEqual([
      "messaging",
      "messages",
      "r1",
    ]);
  });

  it("returns no query keys for typing (dispatched via onTyping, never cache)", () => {
    const e = parseEvent(
      JSON.stringify({ roomId: "r1", userId: "u2", typing: true }),
      "typing",
    ) as RealtimeEvent;
    expect(queryKeysFor(e)).toEqual([]);
  });

  // US-E10.6: presence.changed invalidates the conversations list + presence prefix
  it("invalidates conversations + presence prefix on presence.changed", () => {
    const e = parseEvent(
      frame({
        type: "presence.changed",
        payload: {
          memberId: "u5",
          status: "online",
          lastActiveAt: "2026-07-14T10:00:00Z",
        },
      }),
    ) as RealtimeEvent;
    const keys = queryKeysFor(e);
    expect(keys).toContainEqual(["messaging", "conversations"]);
    expect(keys).toContainEqual(["messaging", "presence"]);
  });

  // US-E10.2: notification.new invalidates list variants + unread count
  it("invalidates all/unread list caches and unread-count on notification.new", () => {
    const e = parseEvent(
      frame({
        type: "notification.new",
        payload: {
          notificationId: "n-99",
          type: "grade",
          titleVi: "Điểm mới",
          titleEn: "New grade",
          bodyVi: "Điểm đã cập nhật",
          bodyEn: "Score updated",
          ts: "2025-11-20T09:00:00.000Z",
        },
      }),
    ) as RealtimeEvent;
    const keys = queryKeysFor(e);
    expect(keys).toContainEqual(["notifications", "list", "all"]);
    expect(keys).toContainEqual(["notifications", "list", "unread"]);
    expect(keys).toContainEqual(["notifications", "list", "grade"]);
    expect(keys).toContainEqual(["notifications", "unread-count"]);
  });
});

describe("parseEvent — notification.new", () => {
  function newFrame(over: Record<string, unknown> = {}): string {
    return JSON.stringify({
      type: "notification.new",
      eventId: "evt-new-1",
      tenantId: "school-a",
      occurredAt: "2025-11-20T09:00:00.000Z",
      payload: {
        notificationId: "n-99",
        type: "grade",
        titleVi: "Điểm mới",
        titleEn: "New grade",
        bodyVi: "Điểm đã cập nhật",
        bodyEn: "Score updated",
        ts: "2025-11-20T09:00:00.000Z",
      },
      ...over,
    });
  }

  it("parses a well-formed notification.new frame", () => {
    const e = parseEvent(newFrame());
    expect(e?.type).toBe("notification.new");
    expect(e?.tenantId).toBe("school-a");
  });

  it("carries the enriched payload fields", () => {
    const e = parseEvent(newFrame()) as RealtimeEvent;
    if (e?.type !== "notification.new") throw new Error("wrong type");
    expect(e.payload.notificationId).toBe("n-99");
    expect(e.payload.titleVi).toBe("Điểm mới");
    expect(e.payload.type).toBe("grade");
  });

  it("returns null when the payload is missing", () => {
    expect(parseEvent(newFrame({ payload: undefined }))).toBeNull();
  });

  it("tenant-scoping: drops event from a different tenant", () => {
    const e = parseEvent(newFrame()) as RealtimeEvent;
    expect(shouldHandle(e, "school-b")).toBe(false);
    expect(shouldHandle(e, "school-a")).toBe(true);
  });
});

describe("parseEvent — message.new (US-E18.18 real flat wire)", () => {
  const richFields = {
    roomId: "room-42",
    messageId: "m-1",
    senderId: "u4",
    senderName: "Lê Thị Hoa",
    preview: "Chào cả lớp",
    createdAt: "2026-07-08T09:00:00.000Z",
    roomType: "class_chat",
  };

  it("normalises the flat wire frame into the payload-wrapped shape", () => {
    const e = parseEvent(flatMsg("message.new", richFields, "school-a"));
    expect(e?.type).toBe("message.new");
    expect(e?.tenantId).toBe("school-a");
    if (e?.type !== "message.new") throw new Error("wrong type");
    expect(e.payload.roomId).toBe("room-42");
    expect(e.payload.senderName).toBe("Lê Thị Hoa");
    expect(e.payload.roomType).toBe("class_chat");
    // Real frames never carry an eventId.
    expect(e.eventId).toBeUndefined();
  });

  it("returns null when roomId is missing", () => {
    const { roomId, ...noRoom } = richFields;
    void roomId;
    expect(parseEvent(flatMsg("message.new", noRoom, "school-a"))).toBeNull();
  });

  it("returns null when tenantId is missing (non-typing frame)", () => {
    expect(
      parseEvent(JSON.stringify({ type: "message.new", ...richFields })),
    ).toBeNull();
  });

  it("tenant-scoping: drops message.new from a different tenant", () => {
    const e = parseEvent(
      flatMsg("message.new", richFields, "school-a"),
    ) as RealtimeEvent;
    expect(shouldHandle(e, "school-b")).toBe(false);
    expect(shouldHandle(e, "school-a")).toBe(true);
  });
});

describe("parseEvent — typing (US-E18.18: no type/tenantId on the wire)", () => {
  const body = JSON.stringify({ roomId: "room-7", userId: "u9", typing: true });

  it("resolves the type from the listener event name when the body omits it", () => {
    const e = parseEvent(body, "typing");
    expect(e?.type).toBe("typing");
    if (e?.type !== "typing") throw new Error("wrong type");
    expect(e.payload.roomId).toBe("room-7");
    expect(e.payload.userId).toBe("u9");
    expect(e.payload.typing).toBe(true);
    expect(e.tenantId).toBeUndefined();
  });

  it("returns null without a knownType and no body type", () => {
    expect(parseEvent(body)).toBeNull();
  });

  it("is kept by shouldHandle despite carrying no tenantId (server-scoped)", () => {
    const e = parseEvent(body, "typing") as RealtimeEvent;
    expect(shouldHandle(e, "any-tenant")).toBe(true);
  });

  it("returns null when a mandatory typing field is malformed", () => {
    expect(
      parseEvent(JSON.stringify({ roomId: "r", userId: "u" }), "typing"),
    ).toBeNull();
    expect(
      parseEvent(JSON.stringify({ roomId: "r", typing: true }), "typing"),
    ).toBeNull();
  });
});

describe("parseEvent — presence.changed (US-E10.6)", () => {
  function presFrame(over: Record<string, unknown> = {}): string {
    return JSON.stringify({
      type: "presence.changed",
      eventId: "evt-pres-1",
      tenantId: "school-a",
      occurredAt: "2026-07-14T10:00:00Z",
      payload: {
        memberId: "u5",
        status: "online",
        lastActiveAt: "2026-07-14T10:00:00Z",
      },
      ...over,
    });
  }

  it("parses a well-formed presence.changed frame", () => {
    const e = parseEvent(presFrame());
    expect(e?.type).toBe("presence.changed");
    expect(e?.tenantId).toBe("school-a");
  });

  it("carries the presence payload fields", () => {
    const e = parseEvent(presFrame()) as RealtimeEvent;
    if (e?.type !== "presence.changed") throw new Error("wrong type");
    expect(e.payload.memberId).toBe("u5");
    expect(e.payload.status).toBe("online");
    expect(e.payload.lastActiveAt).toBe("2026-07-14T10:00:00Z");
  });

  it("returns null for a malformed frame (payload not an object)", () => {
    expect(parseEvent(presFrame({ payload: "nope" }))).toBeNull();
  });

  it("accepts a missing eventId (optional across the union — US-E18.18)", () => {
    expect(parseEvent(presFrame({ eventId: undefined }))?.type).toBe(
      "presence.changed",
    );
  });

  it("returns null when tenantId is missing/invalid (non-typing frame)", () => {
    expect(parseEvent(presFrame({ tenantId: 42 }))).toBeNull();
    expect(parseEvent(presFrame({ tenantId: undefined }))).toBeNull();
  });

  it("tenant-scoping: drops presence.changed from a different tenant", () => {
    const e = parseEvent(presFrame()) as RealtimeEvent;
    expect(shouldHandle(e, "school-b")).toBe(false);
    expect(shouldHandle(e, "school-a")).toBe(true);
  });
});
