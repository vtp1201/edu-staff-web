"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import {
  parseEvent,
  REALTIME_EVENT_TYPES,
  type RealtimeEvent,
  shouldHandle,
} from "./event";
import { queryKeysFor } from "./event-invalidation";

type Options = {
  /** Tenant the client is scoped to; cross-tenant events are dropped. */
  tenantId: string;
  /** Forced logout when this session is revoked elsewhere. */
  onSessionRevoked?: (sessionId: string) => void;
  /** Disable the connection (e.g. while logged out). */
  enabled?: boolean;
};

/**
 * Subscribe to the same-origin SSE proxy (decision `0009`). Parses each frame
 * into a typed event, drops events from other tenants, and invalidates the
 * mapped TanStack Query keys (`event-invalidation.ts`). `EventSource` handles
 * auto-reconnect and replays `Last-Event-ID` natively.
 */
export function useRealtimeEvents({
  tenantId,
  onSessionRevoked,
  enabled = true,
}: Options): void {
  const queryClient = useQueryClient();
  const locale = useLocale();

  useEffect(() => {
    if (!enabled) return;

    const url = `/${locale}/api/stream?tenant=${encodeURIComponent(tenantId)}`;
    const source = new EventSource(url, { withCredentials: true });

    const handle = (raw: string) => {
      const event = parseEvent(raw);
      if (!event || !shouldHandle(event, tenantId)) return;
      dispatch(event);
    };

    const dispatch = (event: RealtimeEvent) => {
      if (event.type === "session.revoked") {
        onSessionRevoked?.(event.payload.sessionId);
        return;
      }
      for (const queryKey of queryKeysFor(event)) {
        queryClient.invalidateQueries({ queryKey });
      }
    };

    // Frames carry a named `event:` line, so they dispatch to per-type
    // listeners (not `onmessage`). `onmessage` stays as a fallback for any
    // unnamed frame.
    const listener = (e: MessageEvent) => handle(e.data);
    source.onmessage = listener;
    for (const type of REALTIME_EVENT_TYPES) {
      source.addEventListener(type, listener as EventListener);
    }

    return () => source.close();
  }, [enabled, tenantId, locale, queryClient, onSessionRevoked]);
}
