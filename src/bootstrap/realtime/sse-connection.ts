/**
 * Framework-free SSE connection state-machine (US-E08.6).
 *
 * The EventSource lifecycle (open → connected, error → disconnected + 4s
 * auto-reconnect, manual reconnect, teardown) and the frame dispatch (tenant
 * scoping, query-cache invalidation, message.new counting, forced logout) are
 * extracted out of `useRealtimeEvents` into this pure controller so the whole
 * state machine is unit-testable in this repo's Vitest `node` env with a
 * FakeEventSource stub + fake timers (there is no `@testing-library/react` /
 * `react-test-renderer` here, so `renderHook` is unavailable). The hook
 * (`use-realtime-events.ts`) is a thin React binding over this controller.
 */

import {
  parseEvent,
  REALTIME_EVENT_TYPES,
  type RealtimeEvent,
  shouldHandle,
} from "./event";
import { type QueryKey, queryKeysFor } from "./event-invalidation";
import { scheduleReconnect } from "./schedule-reconnect";

export type SseStatus = "connected" | "connecting" | "disconnected";

export interface SseConnectionOptions {
  /** Tenant the client is scoped to; cross-tenant frames are dropped. */
  tenantId: string;
  /** Locale segment of the same-origin SSE proxy URL. */
  locale: string;
  /** Report a connection-lifecycle transition. */
  onStatus: (status: SseStatus) => void;
  /** Invalidate the mapped TanStack Query keys for a dispatched event. */
  onInvalidate: (keys: QueryKey[]) => void;
  /** A `message.new` arrived while the user is NOT on the messages route. */
  onMessageNew: () => void;
  /** Forced logout when this session is revoked elsewhere. */
  onSessionRevoked?: (sessionId: string) => void;
  /** Read (live, at dispatch time) whether the user is on `/messages`. */
  isOnMessagesRoute: () => boolean;
  /** Auto-reconnect delay; defaults to the schedule-reconnect constant. */
  reconnectDelayMs?: number;
}

export interface SseConnection {
  /** Immediate manual reconnect (AC-2) — cancels any pending auto-reconnect. */
  reconnect: () => void;
  /** Teardown: clear any pending timer + close the live source. */
  close: () => void;
}

/**
 * Derived banner-visibility rule (AC-1 / AC-3): never on the very first
 * 'connecting' (fresh page load), always on 'disconnected', and on every
 * 'connecting' that follows an actual disconnect.
 */
export function deriveShowBanner(
  status: SseStatus,
  hasEverConnected: boolean,
): boolean {
  return (
    status === "disconnected" || (status === "connecting" && hasEverConnected)
  );
}

/**
 * Open a managed SSE connection. Returns handles for manual reconnect and
 * teardown. All lifecycle transitions are reported via `onStatus`.
 */
export function openSseConnection(
  options: SseConnectionOptions,
): SseConnection {
  let source: EventSource;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const handle = (raw: string) => {
    const event = parseEvent(raw);
    if (!event || !shouldHandle(event, options.tenantId)) return;
    dispatch(event);
  };

  const dispatch = (event: RealtimeEvent) => {
    if (event.type === "session.revoked") {
      options.onSessionRevoked?.(event.payload.sessionId);
      return;
    }
    if (event.type === "message.new") {
      if (!options.isOnMessagesRoute()) options.onMessageNew();
      return; // no query keys to invalidate (queryKeysFor returns [])
    }
    options.onInvalidate(queryKeysFor(event));
  };

  const listener = (e: MessageEvent) => handle(e.data);

  function connect() {
    const url = `/${options.locale}/api/stream?tenant=${encodeURIComponent(
      options.tenantId,
    )}`;
    source = new EventSource(url, { withCredentials: true });

    source.onopen = () => {
      options.onStatus("connected");
    };

    source.onerror = () => {
      // Close before scheduling to avoid a second live connection racing the
      // explicit 4s re-instantiate loop (we do not rely on native retry).
      source.close();
      options.onStatus("disconnected");
      timeoutHandle = scheduleReconnect({
        onReconnect: () => {
          if (disposed) return;
          options.onStatus("connecting");
          connect();
        },
        previousTimer: timeoutHandle,
        delayMs: options.reconnectDelayMs,
      });
    };

    // Frames carry a named `event:` line → per-type listeners. `onmessage`
    // stays as a fallback for any unnamed frame.
    source.onmessage = listener;
    for (const type of REALTIME_EVENT_TYPES) {
      source.addEventListener(type, listener as EventListener);
    }
  }

  connect();

  return {
    reconnect() {
      if (disposed) return;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      source.close();
      options.onStatus("connecting");
      connect();
    },
    close() {
      disposed = true;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      source.close();
    },
  };
}
