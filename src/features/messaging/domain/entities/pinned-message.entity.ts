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
   * Sender display name. OPTIONAL because the real pin board has NO wire source
   * for it: the social service stamps `senderName` from the caller's claims at
   * send time only and returns `""` for every embedded pin-board message
   * (`toMessageDTO(msg, "")`). Presentation renders an i18n fallback — never a
   * placeholder minted in the mapper.
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
