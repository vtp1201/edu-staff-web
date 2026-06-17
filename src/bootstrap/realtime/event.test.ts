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

  it("returns null when eventId or tenantId is missing", () => {
    expect(parseEvent(frame({ eventId: undefined }))).toBeNull();
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
