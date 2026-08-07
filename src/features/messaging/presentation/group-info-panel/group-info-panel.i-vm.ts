import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { PinnedMessage } from "@/features/messaging/domain/entities/pinned-message.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";

/** Server → client contract for the group info panel (US-E10.4). */
export interface GroupInfoPanelVM {
  open: boolean;
  group?: GroupEntity;
  isLoading: boolean;
  selfIsAdmin: boolean;
  /** Synthetic id of the current user — drives the "(Bạn)" suffix. */
  selfId: string;
  /**
   * US-E18.51 — the room's pin board, fetched INDEPENDENTLY of group detail
   * (`GET /rooms/{roomId}/pinned-messages`). It is deliberately not read off
   * `group`: pins are readable by any member while group detail is a different
   * (still mock) resource with a different gate.
   */
  pinnedMessages: PinnedMessage[];
  pinnedLoading?: boolean;
  /** Stable failure key of a failed pin-board read — translated here. */
  pinnedError?: MessagingFailure["type"];
  /**
   * Whether to offer the unpin control. Unpin needs the room's `moderate_msg`
   * capability, which the real wire does not expose — so `undefined` means
   * "unknown, let the user try and surface the server's 403" (reactive gate);
   * only an explicit `false` (mock world, known non-admin) hides it.
   */
  canUnpin?: boolean;
}

export interface GroupInfoPanelActions {
  onOpenChange: (open: boolean) => void;
  onRename: (name: string, description: string) => void;
  onAddMembers: () => void;
  onRemoveMember: (userId: string) => void;
  onLeave: () => void;
  onDelete: () => void;
  onPinnedClick: (messageId: string) => void;
  /** US-E18.51 — unpin from the pin board. */
  onUnpin?: (messageId: string) => void;
}
