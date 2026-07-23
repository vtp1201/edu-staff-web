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
    // US-E18.18 — real messaging frames refetch the conversations list (unread
    // badges + last-message) and, when a roomId is present, that room's message
    // thread. `message.new` ALSO bumps the shell's hook-local pendingMsgCount in
    // the dispatcher (sse-connection.ts) — that is separate from invalidation.
    case "message.new":
    case "message.edited":
    case "message.deleted":
    case "unread.updated": {
      const keys: QueryKey[] = [["messaging", "conversations"]];
      const { roomId } = event.payload;
      if (roomId) keys.push(["messaging", "messages", roomId]);
      return keys;
    }
    case "typing":
      // US-E18.18 — dispatched via the onTyping callback (drives the chat-window
      // inbound typing indicator), never a cache invalidation.
      return [];
    case "presence.changed":
      // US-E10.6: refetch-driven, no hand-patched cache. The event payload
      // carries only `memberId` (not a conversationId/groupId), so the group
      // panel can't be precisely scoped from the payload alone in v1 — we
      // invalidate the whole `["messaging","presence"]` prefix (covers both the
      // list query and every open group presence query) plus the conversations
      // list key so the DM header re-derives. If BE later adds a conversationId
      // to the payload, add the scoped `["messaging","group", id]` key here.
      return [
        ["messaging", "conversations"],
        ["messaging", "presence"],
      ];
  }
}
