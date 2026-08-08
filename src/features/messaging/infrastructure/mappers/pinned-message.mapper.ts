import type { PinnedMessage } from "@/features/messaging/domain/entities/pinned-message.entity";
import type { PinnedMessageResponseDto } from "../dtos/pinned-message-response.dto";

/**
 * BE's generic placeholder for a sender it could not resolve from the member
 * projection yet (US-E18.58 / BE US-205). It is NOT a name: rendering it
 * verbatim would print the English word "Member" to a Vietnamese-locale user.
 * Exact, case-sensitive match — this is a fixed wire sentinel, not user input.
 */
const UNRESOLVED_SENDER_SENTINEL = "Member";

/** True only for a name worth rendering verbatim (not blank, not the sentinel). */
function isRealSenderName(raw: string | undefined): raw is string {
  const trimmed = raw?.trim();
  return !!trimmed && trimmed !== UNRESOLVED_SENDER_SENTINEL;
}

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
    // US-E18.58 — the pin board resolves `senderName` server-side, so it is a
    // REAL name here (never `""` anymore) EXCEPT when the sender is not yet
    // projected: then BE sends the literal `"Member"` sentinel. Both that
    // sentinel and a (defensive) blank string are normalised to "absent" so
    // presentation renders ONE localized fallback — no placeholder is minted
    // in the mapper, and no English word leaks into a Vietnamese UI.
    const senderName = msg.senderName?.trim();
    rows.push({
      messageId: dto.messageId,
      senderId: msg.senderUserId,
      ...(isRealSenderName(senderName) ? { senderName } : {}),
      excerpt: msg.text,
      sentAt: msg.createdAt,
      pinnedAt: dto.pinnedAt,
      pinnedBy: dto.pinnedBy,
    });
  }
  return rows;
}
