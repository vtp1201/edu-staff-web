import type { PinnedMessage } from "@/features/messaging/domain/entities/pinned-message.entity";
import type { PinnedMessageResponseDto } from "../dtos/pinned-message-response.dto";

/**
 * US-E18.51 — map the real pin board (`GET /rooms/{roomId}/pinned-messages`) to
 * domain rows. Two rows are dropped rather than rendered broken:
 *
 * 1. no embedded `message` — the field is present only on the list endpoint, and
 *    a pin whose message no longer resolves has nothing to display;
 * 2. a soft-deleted message — the server already skips these (self-healing
 *    read), so this is a defensive mirror, never a "message deleted" placeholder.
 *
 * Server order (newest-pin-first) is preserved — no client re-sort.
 */
export function toPinnedMessages(
  dtos: PinnedMessageResponseDto[],
): PinnedMessage[] {
  const rows: PinnedMessage[] = [];
  for (const dto of dtos) {
    const msg = dto.message;
    if (!msg || msg.status === "deleted") continue;
    // `senderName` is `""` on every pin-board row (not persisted server-side);
    // an empty string must not become a rendered name — presentation shows an
    // i18n fallback instead of a placeholder minted here.
    const senderName = msg.senderName?.trim();
    rows.push({
      messageId: dto.messageId,
      senderId: msg.senderUserId,
      ...(senderName ? { senderName } : {}),
      excerpt: msg.text,
      sentAt: msg.createdAt,
      pinnedAt: dto.pinnedAt,
      pinnedBy: dto.pinnedBy,
    });
  }
  return rows;
}
