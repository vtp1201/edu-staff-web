import type { RoomMessageResponseDto } from "./room-message-response.dto";

/**
 * Wire shape of a pin pointer — real `social` contract (US-E18.51, BE US-192,
 * `PinnedMessageResponse`). All fields camelCase.
 *
 * `message` is present ONLY on `GET /rooms/{roomId}/pinned-messages` (it embeds
 * the FULL current message, not a snapshot); it is absent on the pin (201)
 * response. That asymmetry is why the mapper must tolerate — and skip — a row
 * without it.
 */
export type PinnedMessageResponseDto = {
  messageId: string;
  /** Global IAM user id of the moderator who pinned the message. */
  pinnedBy: string;
  /** ISO8601 — the pin board is ordered newest-pin-first by this. */
  pinnedAt: string;
  message?: RoomMessageResponseDto;
};
