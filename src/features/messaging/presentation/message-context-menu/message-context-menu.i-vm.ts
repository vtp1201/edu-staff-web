/** Anchor + capability info for the message context menu (US-E10.4). */
export interface MessageContextMenuVM {
  open: boolean;
  /** Viewport coordinates of the right-click / long-press. */
  x: number;
  y: number;
  /** True for the current user's own messages — gates Delete. */
  isMine: boolean;
  /** ISO8601 send time — drives the 1-hour delete window. */
  sentAt?: string;
  /** True for group conversations — gates Pin behind admin. */
  isGroup: boolean;
  /** Whether the current user is an admin of this group. */
  selfIsGroupAdmin: boolean;
}

export interface MessageContextMenuActions {
  onReply: () => void;
  onPin: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}
