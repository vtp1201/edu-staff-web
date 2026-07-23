import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryKey } from "./event-invalidation";
import { SSE_RECONNECT_DELAY_MS } from "./schedule-reconnect";
import {
  deriveShowBanner,
  openSseConnection,
  type SseConnectionOptions,
  type SseStatus,
} from "./sse-connection";

/**
 * The SSE connection state-machine is extracted into a framework-free
 * controller (`openSseConnection`) precisely so it can be exhaustively tested
 * in this repo's Vitest `node` env — there is NO `@testing-library/react` /
 * `react-test-renderer` here (confirmed), so `renderHook` is not available.
 * This test uses a local `FakeEventSource` stub + `vi.useFakeTimers()` to cover
 * every behavioural case the state-architecture doc §5 listed (status
 * transitions, 4s auto-reconnect, manual reconnect cancels the pending timer,
 * message.new gating, invalidation regression, malformed-frame drop, no-leak
 * teardown). The thin React binding lives in `use-realtime-events.ts`.
 */

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  withCredentials: boolean;
  closed = false;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.withCredentials = init?.withCredentials ?? false;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: EventListener) {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(cb);
  }

  removeEventListener(type: string, cb: EventListener) {
    this.listeners.get(type)?.delete(cb);
  }

  close() {
    this.closed = true;
  }

  // test-only helpers (not part of the real EventSource API)
  emitOpen() {
    this.onopen?.();
  }
  emitError() {
    this.onerror?.();
  }
  /** Dispatch a well-formed frame of `type` carrying `payload`. */
  emit(type: string, payload: unknown) {
    this.emitRaw(
      type,
      JSON.stringify({
        type,
        eventId: `evt-${type}`,
        tenantId: TENANT,
        occurredAt: "2026-07-08T09:00:00.000Z",
        payload,
      }),
    );
  }
  emitRaw(type: string, raw: string) {
    const event = { data: raw } as MessageEvent;
    for (const cb of this.listeners.get(type) ?? []) {
      cb(event);
    }
  }
}

const TENANT = "school-a";

function frame(
  type: string,
  payload: unknown,
  over: Record<string, unknown> = {},
) {
  return {
    type,
    eventId: `evt-${type}`,
    tenantId: TENANT,
    occurredAt: "2026-07-08T09:00:00.000Z",
    payload,
    ...over,
  };
}

function setup(overrides: Partial<SseConnectionOptions> = {}) {
  const statusLog: SseStatus[] = [];
  const invalidated: QueryKey[][] = [];
  const messageNew = vi.fn();
  const typing = vi.fn();
  const sessionRevoked = vi.fn();
  let onMessages = false;

  const options: SseConnectionOptions = {
    tenantId: TENANT,
    locale: "vi",
    onStatus: (s) => statusLog.push(s),
    onInvalidate: (keys) => invalidated.push(keys),
    onMessageNew: messageNew,
    onTyping: typing,
    onSessionRevoked: sessionRevoked,
    isOnMessagesRoute: () => onMessages,
    ...overrides,
  };

  const conn = openSseConnection(options);
  return {
    conn,
    statusLog,
    invalidated,
    messageNew,
    typing,
    sessionRevoked,
    setOnMessages: (v: boolean) => {
      onMessages = v;
    },
    last: () => {
      const src = FakeEventSource.instances.at(-1);
      if (!src) throw new Error("no EventSource instance created");
      return src;
    },
  };
}

describe("openSseConnection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("opens a single EventSource with the tenant + locale in its URL (withCredentials)", () => {
    setup();
    expect(FakeEventSource.instances).toHaveLength(1);
    const src = FakeEventSource.instances[0];
    expect(src.url).toContain(`tenant=${TENANT}`);
    expect(src.url).toContain("/vi/api/stream");
    expect(src.withCredentials).toBe(true);
  });

  it("emits 'connected' on open", () => {
    const t = setup();
    t.last().emitOpen();
    expect(t.statusLog).toEqual(["connected"]);
  });

  it("on error: closes the source, emits 'disconnected', schedules a 4s reconnect", () => {
    const t = setup();
    t.last().emitOpen();
    t.last().emitError();

    expect(FakeEventSource.instances[0].closed).toBe(true);
    expect(t.statusLog).toEqual(["connected", "disconnected"]);

    // Before 4s: no new instance.
    vi.advanceTimersByTime(SSE_RECONNECT_DELAY_MS - 1);
    expect(FakeEventSource.instances).toHaveLength(1);

    // At 4s: 'connecting' + exactly one new instance.
    vi.advanceTimersByTime(1);
    expect(t.statusLog).toEqual(["connected", "disconnected", "connecting"]);
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it("completes a full disconnect -> connecting -> connected cycle", () => {
    const t = setup();
    t.last().emitOpen();
    t.last().emitError();
    vi.advanceTimersByTime(SSE_RECONNECT_DELAY_MS);
    // Second instance opens.
    t.last().emitOpen();
    expect(t.statusLog).toEqual([
      "connected",
      "disconnected",
      "connecting",
      "connected",
    ]);
  });

  it("manual reconnect() cancels the pending auto-reconnect timer (no double connect)", () => {
    const t = setup();
    t.last().emitOpen();
    t.last().emitError(); // schedules the 4s auto-reconnect

    // Manual reconnect before the 4s elapses.
    t.conn.reconnect();
    expect(t.statusLog).toEqual(["connected", "disconnected", "connecting"]);
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.instances[0].closed).toBe(true);

    // The stale auto-reconnect timer must NOT also fire.
    vi.advanceTimersByTime(SSE_RECONNECT_DELAY_MS);
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it("close() clears the pending timer and closes the source (no leak)", () => {
    const t = setup();
    t.last().emitOpen();
    t.last().emitError(); // schedules a reconnect
    t.conn.close();

    expect(FakeEventSource.instances[0].closed).toBe(true);
    vi.advanceTimersByTime(SSE_RECONNECT_DELAY_MS * 2);
    // No new instance after teardown.
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("reconnect() after close() is a safe no-op (stale reference guard)", () => {
    const t = setup();
    t.conn.close();
    expect(() => t.conn.reconnect()).not.toThrow();
    // close() opened exactly one instance; a disposed reconnect opens none.
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("increments the pending counter on message.new while NOT on /messages", () => {
    const t = setup();
    t.setOnMessages(false);
    t.last().emit("message.new", { conversationId: "c1" });
    t.last().emit("message.new", { conversationId: "c2" });
    expect(t.messageNew).toHaveBeenCalledTimes(2);
  });

  it("does NOT increment on message.new while already on /messages", () => {
    const t = setup();
    t.setOnMessages(true);
    t.last().emit("message.new", { conversationId: "c1" });
    expect(t.messageNew).not.toHaveBeenCalled();
  });

  it("reads the /messages gate live at dispatch time", () => {
    const t = setup();
    t.setOnMessages(true);
    t.last().emit("message.new", { conversationId: "c1" }); // suppressed
    t.setOnMessages(false);
    t.last().emit("message.new", { conversationId: "c2" }); // counted
    expect(t.messageNew).toHaveBeenCalledTimes(1);
  });

  it("drops a malformed message.new frame silently", () => {
    const t = setup();
    t.setOnMessages(false);
    // Non-JSON body → parseEvent returns null.
    t.last().emitRaw("message.new", "{not json");
    // Frame missing its payload → parseEvent returns null (structural check).
    t.last().emitRaw(
      "message.new",
      JSON.stringify({
        type: "message.new",
        eventId: "evt-x",
        tenantId: TENANT,
        occurredAt: "2026-07-08T09:00:00.000Z",
      }),
    );
    expect(t.messageNew).not.toHaveBeenCalled();
    expect(t.statusLog).toEqual([]);
  });

  it("drops cross-tenant events", () => {
    const t = setup();
    t.setOnMessages(false);

    // Same-tenant message.new is counted.
    t.last().emit("message.new", { conversationId: "c1" });
    expect(t.messageNew).toHaveBeenCalledTimes(1);

    // A frame for another tenant is dropped by shouldHandle.
    const cross = frame(
      "message.new",
      { conversationId: "c2" },
      {
        tenantId: "other-tenant",
      },
    );
    t.last().emitRaw("message.new", JSON.stringify(cross));
    expect(t.messageNew).toHaveBeenCalledTimes(1);
  });

  // Regression guard: existing invalidation behaviour (US-E06.2/US-E10.2)
  it("invalidates the notifications key on notification.created", () => {
    const t = setup();
    t.last().emit("notification.created", {
      notificationId: "n1",
      title: "t",
      body: "b",
      level: "info",
    });
    expect(t.invalidated).toEqual([[["notifications"]]]);
  });

  it("invalidates roster + history on attendance.updated", () => {
    const t = setup();
    t.last().emit("attendance.updated", {
      classId: "c1",
      periodId: "p1",
      date: "2026-07-08",
      period: 2,
    });
    expect(t.invalidated).toEqual([
      [
        ["attendance", "roster", "c1"],
        ["attendance", "history", "c1"],
      ],
    ]);
  });

  it("calls onSessionRevoked (no invalidation) on session.revoked", () => {
    const t = setup();
    t.last().emit("session.revoked", { sessionId: "s1" });
    expect(t.sessionRevoked).toHaveBeenCalledExactlyOnceWith("s1");
    expect(t.invalidated).toEqual([]);
  });

  // US-E18.18 — a real `message.new` bumps the pending pill (when not on
  // /messages) AND falls through to invalidate the messaging queries.
  it("both counts and invalidates on message.new (flat real wire)", () => {
    const t = setup();
    t.setOnMessages(false);
    t.last().emitRaw(
      "message.new",
      JSON.stringify({
        type: "message.new",
        tenantId: TENANT,
        roomId: "room-9",
        messageId: "m-1",
        senderId: "u4",
        senderName: "Hoa",
        preview: "hi",
        createdAt: "2026-07-20T08:00:00Z",
        roomType: "class_chat",
      }),
    );
    expect(t.messageNew).toHaveBeenCalledTimes(1);
    expect(t.invalidated).toEqual([
      [
        ["messaging", "conversations"],
        ["messaging", "messages", "room-9"],
      ],
    ]);
  });

  // US-E18.18 — a `typing` frame (no `type`/`tenantId` on the wire) dispatches
  // via onTyping and never invalidates the cache.
  it("dispatches typing via onTyping and never invalidates", () => {
    const t = setup();
    t.last().emitRaw(
      "typing",
      JSON.stringify({ roomId: "room-3", userId: "u9", typing: true }),
    );
    expect(t.typing).toHaveBeenCalledExactlyOnceWith("room-3", "u9", true);
    expect(t.invalidated).toEqual([]);
    expect(t.messageNew).not.toHaveBeenCalled();
  });

  it("invalidates the messaging queries on unread.updated", () => {
    const t = setup();
    t.last().emitRaw(
      "unread.updated",
      JSON.stringify({
        type: "unread.updated",
        tenantId: TENANT,
        roomId: "room-5",
        unreadCount: 2,
      }),
    );
    expect(t.invalidated).toEqual([
      [
        ["messaging", "conversations"],
        ["messaging", "messages", "room-5"],
      ],
    ]);
  });
});

describe("deriveShowBanner", () => {
  it("hides the banner on the first-ever 'connecting' (AC-1)", () => {
    expect(deriveShowBanner("connecting", false)).toBe(false);
  });

  it("hides the banner while 'connected'", () => {
    expect(deriveShowBanner("connected", true)).toBe(false);
  });

  it("shows the banner while 'disconnected'", () => {
    expect(deriveShowBanner("disconnected", false)).toBe(true);
    expect(deriveShowBanner("disconnected", true)).toBe(true);
  });

  it("shows the banner on a post-disconnect 'connecting' (AC-3)", () => {
    expect(deriveShowBanner("connecting", true)).toBe(true);
  });
});
