import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";

/** Server → client contract for the group info panel (US-E10.4). */
export interface GroupInfoPanelVM {
  open: boolean;
  group?: GroupEntity;
  isLoading: boolean;
  selfIsAdmin: boolean;
  /** Synthetic id of the current user — drives the "(Bạn)" suffix. */
  selfId: string;
}

export interface GroupInfoPanelActions {
  onOpenChange: (open: boolean) => void;
  onRename: (name: string, description: string) => void;
  onAddMembers: () => void;
  onRemoveMember: (userId: string) => void;
  onLeave: () => void;
  onDelete: () => void;
  onPinnedClick: (messageId: string) => void;
}
