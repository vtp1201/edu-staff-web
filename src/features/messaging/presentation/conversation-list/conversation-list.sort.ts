import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";

/**
 * US-E24.15 — ordering for the merged (direct + group) inbox list.
 *
 * Rows sort by the RAW `lastMessageAt` descending (newest first). A row without
 * a usable timestamp (absent on the wire, or unparsable) ranks BELOW every row
 * that has one — a known-recent message outranks an unknown one — and keeps its
 * original relative position, because `Array.prototype.sort` is spec-stable
 * (ES2019). That stability IS the "fallback design order" (today's array order:
 * direct block then group block); no synthetic tiebreaker is invented, so the
 * result is deterministic for identical input.
 */
const timeOf = (c: ConversationEntity): number | null => {
  if (!c.lastMessageAt) return null;
  const ms = Date.parse(c.lastMessageAt);
  return Number.isNaN(ms) ? null : ms;
};

export function compareByLastMessageDesc(
  a: ConversationEntity,
  b: ConversationEntity,
): number {
  const at = timeOf(a);
  const bt = timeOf(b);
  if (at === null && bt === null) return 0;
  if (at === null) return 1;
  if (bt === null) return -1;
  return bt - at;
}

/** Non-mutating sort — the one export `conversation-list.tsx` consumes. */
export function sortConversations(
  conversations: readonly ConversationEntity[],
): ConversationEntity[] {
  return [...conversations].sort(compareByLastMessageDesc);
}
