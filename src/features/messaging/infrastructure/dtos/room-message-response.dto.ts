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
  text: string;
  status: "active" | "edited" | "deleted";
  editCount: number;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  /** US-128 media attachment — absent for text-only messages (out of scope). */
  media?: unknown | null;
};
