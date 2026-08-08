/**
 * A pinned message on a room's pin board (US-E10.4 mock-era, wired real in
 * US-E18.51 / BE US-192).
 *
 * DELIBERATELY NOT a field of `GroupEntity`. The real contract exposes the pin
 * board as its OWN independently-fetchable resource
 * (`GET /rooms/{roomId}/pinned-messages`, readable by any room member) that is
 * decoupled from room/group detail and has a different authorization gate from
 * the pin/unpin mutations (`moderate_msg`). Embedding it in the group entity
 * would tie a real read to a still-mocked group read — see the US-E18.51
 * Evidence section.
 */
export type PinnedMessage = {
  messageId: string;
  /** Global user id of the message's sender. */
  senderId: string;
  /**
   * Sender display name, server-resolved (US-E18.58 / BE US-205: the pin board
   * resolves it from the member projection — it is a real name, never `""`).
   *
   * Still OPTIONAL: when the sender has not been projected yet BE emits its
   * generic `"Member"` sentinel, which the mapper normalises to absent (as it
   * does a defensive blank). `undefined` therefore means "no name to show" and
   * presentation renders an i18n fallback — never a placeholder minted in the
   * mapper, never the literal English word "Member".
   */
  senderName?: string;
  /** Current message text (the pin board embeds live content, not a snapshot). */
  excerpt: string;
  /** ISO8601 — when the underlying message was sent. */
  sentAt: string;
  /** ISO8601 — when the message was pinned (the board is newest-pin-first). */
  pinnedAt: string;
  /** Global user id of the moderator who pinned it. */
  pinnedBy: string;
};
