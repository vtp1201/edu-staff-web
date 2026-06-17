import type { RealtimeEvent } from "./event";

/**
 * TanStack Query keys to invalidate per event type (taxonomy in
 * `docs/product/realtime-events.md`). Web reacts by invalidating — never by
 * hand-patching cache — so a single source of truth (the query) stays correct.
 *
 * `session.revoked` returns no keys: it forces a client logout, handled by the
 * hook's `onSessionRevoked` callback rather than a cache invalidation.
 */
export type QueryKey = readonly unknown[];

export function queryKeysFor(event: RealtimeEvent): QueryKey[] {
  switch (event.type) {
    case "notification.created":
      return [["notifications"]];
    case "notification.new":
      // Invalidate ALL notification list variants + unread count.
      // The container also subscribes directly via useNotificationNewEvent to
      // prepend the item optimistically and show a Sonner toast (US-E10.2 AC-7).
      return [
        ["notifications", "list", "all"],
        ["notifications", "list", "unread"],
        ["notifications", "list", event.payload.type],
        ["notifications", "unread-count"],
      ];
    case "attendance.updated":
      return [
        ["attendance", "roster", event.payload.classId],
        ["attendance", "history", event.payload.classId],
      ];
    case "session.revoked":
      return [];
  }
}
