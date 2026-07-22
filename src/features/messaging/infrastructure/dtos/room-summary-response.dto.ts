/**
 * Wire shape for a room in `GET /social/api/v1/rooms` (US-E18.17). Mirrors the
 * real `RoomSummary` schema (camelCase per api-integration rule). NOTE: the real
 * schema carries NO unread-count and NO avatar/color field — those are derived
 * client-side (ADR 0060, cross-repo ask #32).
 */
export type RoomSummaryResponseDto = {
  roomId: string;
  scope: "SCHOOL" | "GLOBAL";
  tenantId?: string | null;
  roomType:
    | "class_chat"
    | "announcement"
    | "parent_group"
    | "dm"
    | "staff_internal"
    | "club_chat"
    | "school_broadcast"
    | "custom"
    | "broadcast"
    | "subject_channel";
  name: string;
  lastMessagePreview?: string | null;
  lastMessageAt: string;
  status: "active" | "archived";
  /** DM-only; `accepted` for every non-DM room (ADR 0089). */
  requestStatus?: "accepted" | "pending";
};
