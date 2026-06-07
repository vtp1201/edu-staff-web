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
});
