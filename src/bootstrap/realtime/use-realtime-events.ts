"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "@/bootstrap/i18n/routing";
import {
  deriveShowBanner,
  openSseConnection,
  type SseConnection,
  type SseStatus,
} from "./sse-connection";

export type { SseStatus } from "./sse-connection";

type Options = {
  /** Tenant the client is scoped to; cross-tenant events are dropped. */
  tenantId: string;
  /** Forced logout when this session is revoked elsewhere. */
  onSessionRevoked?: (sessionId: string) => void;
  /** Disable the connection (e.g. while logged out). */
  enabled?: boolean;
};

export interface UseRealtimeEventsResult {
  /** Current EventSource lifecycle state. */
  sseStatus: SseStatus;
  /**
   * Derived: whether `SseDisconnectBanner` should render at all. False on the
   * very first mount's `connecting` (AC-1); true for `disconnected` and for
   * every `connecting` that follows an actual disconnect (AC-3).
   */
  showBanner: boolean;
  /** Count of `message.new` events received while not on `/messages`. */
  pendingMsgCount: number;
  /** Manual reconnect trigger (AC-2's "Kết nối lại" button). */
  reconnect: () => void;
}

/**
 * Subscribe to the same-origin SSE proxy (decision `0009`) and expose the
 * connection state the shell renders (US-E08.6). Parses each frame, drops
 * cross-tenant events, invalidates the mapped TanStack Query keys, and tracks
 * `sseStatus` + `pendingMsgCount`.
 *
 * The imperative state machine lives in `sse-connection.ts` (unit-tested); this
 * hook is the thin React binding: hook-local `useState`/`useRef` for the
 * connection state, a connection effect that owns the EventSource lifecycle,
 * and a separate pathname effect that resets `pendingMsgCount` — deliberately
 * split so navigation never tears down/recreates the connection.
 */
export function useRealtimeEvents({
  tenantId,
  onSessionRevoked,
  enabled = true,
}: Options): UseRealtimeEventsResult {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const pathname = usePathname();

  const [sseStatus, setSseStatus] = useState<SseStatus>("connecting");
  const [pendingMsgCount, setPendingMsgCount] = useState(0);
  const hasConnectedRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const connectionRef = useRef<SseConnection | null>(null);

  const showBanner = deriveShowBanner(sseStatus, hasConnectedRef.current);

  // Effect 1 — connection lifecycle. Deps intentionally EXCLUDE `pathname` so
  // navigation never recreates the EventSource (see Effect 2).
  useEffect(() => {
    if (!enabled) {
      connectionRef.current = null;
      return;
    }

    const connection = openSseConnection({
      tenantId,
      locale,
      onStatus: (status) => {
        if (status === "connected") hasConnectedRef.current = true;
        setSseStatus(status);
      },
      onInvalidate: (keys) => {
        for (const queryKey of keys) {
          queryClient.invalidateQueries({ queryKey });
        }
      },
      onMessageNew: () => setPendingMsgCount((n) => n + 1),
      onSessionRevoked,
      isOnMessagesRoute: () => pathnameRef.current.endsWith("/messages"),
    });
    connectionRef.current = connection;

    return () => {
      connection.close();
      connectionRef.current = null;
    };
  }, [enabled, tenantId, locale, queryClient, onSessionRevoked]);

  // Effect 2 — pathname read/reset. Only dep is `pathname`, keeping it out of
  // Effect 1's dependency array. Updates the ref the dispatch closure reads and
  // clears the counter the moment the user enters the messages route.
  useEffect(() => {
    pathnameRef.current = pathname;
    if (pathname.endsWith("/messages")) {
      setPendingMsgCount(0);
    }
  }, [pathname]);

  const reconnect = useCallback(() => {
    connectionRef.current?.reconnect();
  }, []);

  return { sseStatus, showBanner, pendingMsgCount, reconnect };
}
