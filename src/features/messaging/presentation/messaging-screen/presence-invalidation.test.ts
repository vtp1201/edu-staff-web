import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { parseEvent, type RealtimeEvent } from "@/bootstrap/realtime/event";
import { queryKeysFor } from "@/bootstrap/realtime/event-invalidation";

/**
 * US-E10.6 AC-10.6.6.1/.5 — a `presence.changed` SSE frame drives an
 * invalidate-and-refetch (never a hand-patched cache). This wires the real
 * `queryKeysFor()` output through a real QueryClient using the SAME key shapes
 * the messaging screen registers (`["messaging","presence","list"]` and
 * `["messaging","presence","group",id]`), proving the mock-mode live-update path.
 */
function presenceFrame(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: "presence.changed",
    eventId: "evt-pres-1",
    tenantId: "acme",
    occurredAt: "2026-07-14T10:00:00Z",
    payload: {
      memberId: "u5",
      status: "online",
      lastActiveAt: "2026-07-14T10:00:00Z",
    },
    ...over,
  });
}

describe("presence.changed → messaging presence query invalidation", () => {
  it("invalidates the list + open-group presence queries and the conversations list", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["messaging", "presence", "list"], []);
    qc.setQueryData(["messaging", "presence", "group", "g1"], []);
    qc.setQueryData(["messaging", "conversations"], []);

    const event = parseEvent(presenceFrame()) as RealtimeEvent;
    // Mirror the hook's onInvalidate loop (use-realtime-events.ts).
    for (const queryKey of queryKeysFor(event)) {
      await qc.invalidateQueries({ queryKey });
    }

    // The ["messaging","presence"] prefix marks BOTH presence queries stale…
    expect(
      qc.getQueryState(["messaging", "presence", "list"])?.isInvalidated,
    ).toBe(true);
    expect(
      qc.getQueryState(["messaging", "presence", "group", "g1"])?.isInvalidated,
    ).toBe(true);
    // …and the conversations list re-derives the DM header presence.
    expect(
      qc.getQueryState(["messaging", "conversations"])?.isInvalidated,
    ).toBe(true);
  });

  it("does not touch unrelated messaging queries (messages stay valid)", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["messaging", "messages", "u1"], []);

    const event = parseEvent(presenceFrame()) as RealtimeEvent;
    for (const queryKey of queryKeysFor(event)) {
      await qc.invalidateQueries({ queryKey });
    }

    expect(
      qc.getQueryState(["messaging", "messages", "u1"])?.isInvalidated,
    ).toBe(false);
  });
});
