import { describe, expect, it } from "vitest";
import type { RealtimeEvent } from "./event";
import { parseEvent } from "./event";
import { SSE_PING, toSseFrame } from "./sse";

const event: RealtimeEvent = {
  type: "notification.created",
  eventId: "evt-9",
  tenantId: "acme",
  occurredAt: "2026-06-06T10:00:00Z",
  payload: { notificationId: "n1", title: "t", body: "b", level: "info" },
};

describe("toSseFrame", () => {
  it("emits id/event/data lines terminated by a blank line", () => {
    const frame = toSseFrame(event);
    expect(frame).toContain("id: evt-9\n");
    expect(frame).toContain("event: notification.created\n");
    expect(frame.endsWith("\n\n")).toBe(true);
  });

  it("round-trips: the data line parses back to the same event", () => {
    const frame = toSseFrame(event);
    const dataLine = frame
      .split("\n")
      .find((l) => l.startsWith("data: "))
      ?.slice("data: ".length);
    expect(dataLine).toBeDefined();
    expect(parseEvent(dataLine as string)).toEqual(event);
  });

  it("ping is a valid SSE comment", () => {
    expect(SSE_PING.startsWith(":")).toBe(true);
    expect(SSE_PING.endsWith("\n\n")).toBe(true);
  });
});
