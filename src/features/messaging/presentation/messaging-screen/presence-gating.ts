/**
 * US-E10.6 AC-10.6.3.2 — the group member-panel presence fetch is an INDEPENDENT
 * network call that must occur ONLY when the group-info panel is actually open,
 * never merely from selecting (rendering the header of) a group conversation.
 *
 * Pure predicate so the gating contract is unit-testable without a React render
 * (mirrors `pane-visibility.ts`). Wired into the `groupPresence` query's
 * `enabled` in `messaging-screen.tsx`.
 */
export function isGroupPresenceQueryEnabled(params: {
  /** A conversation is currently selected. */
  hasActiveConversation: boolean;
  /** The active conversation is a group (member panel exists). */
  isGroup: boolean;
  /** The group-info panel is actually open. */
  isPanelOpen: boolean;
  /** Number of members whose presence would be fetched. */
  memberCount: number;
}): boolean {
  const { hasActiveConversation, isGroup, isPanelOpen, memberCount } = params;
  return hasActiveConversation && isGroup && isPanelOpen && memberCount > 0;
}
