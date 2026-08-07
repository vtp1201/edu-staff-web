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
   * US-E18.51 ground-truth: the Go handler DOES emit `senderName`
   * (`httpdto.MessageResponse.SenderName`) even though `openapi.yaml`'s
   * `Message` schema omits it — a documented drift (FE→BE ask). It is stamped
   * from the SENDER's JWT claims at send time and never persisted, so any
   * read-back path emits `""` — the pin board calls `toMessageDTO(msg, "")`.
   * Optional here; consumers MUST treat `""` as absent.
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
