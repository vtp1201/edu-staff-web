/**
 * Wire shape for a message in `GET/POST /social/api/v1/rooms/{roomId}/messages`
 * (US-E18.17). Mirrors the real `Message` schema (camelCase). For a deleted
 * message `text` is the literal i18n key `"social_message_deleted"` — the
 * presentation ignores `text` when `isDeleted`, so it is passed through as-is.
 */
export type RoomMessageResponseDto = {
  messageId: string;
  roomId: string;
  senderUserId: string;
  /**
   * Emitted by the Go handler (`httpdto.MessageResponse.SenderName`); the
   * `openapi.yaml` drift noted in US-E18.51 was fixed BE-side (additive,
   * non-required field) in US-E18.58.
   *
   * Population depends on the ENDPOINT:
   * - pin board (`GET /rooms/{roomId}/pinned-messages`) — resolved server-side
   *   from the member projection: a real name, or the literal `"Member"`
   *   sentinel when the sender is not projected yet (US-E18.58 / BE US-205);
   * - message history / search / edit — still `toMessageDTO(m, "")`, i.e. `""`
   *   (names are resolved from the room directory instead; unchanged).
   *
   * Optional here; consumers MUST treat `""` (and, on the pin board, the
   * `"Member"` sentinel) as absent rather than as a renderable name.
   */
  senderName?: string;
  text: string;
  status: "active" | "edited" | "deleted";
  editCount: number;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  /** US-128 media attachment — absent for text-only messages (out of scope). */
  media?: unknown | null;
};
