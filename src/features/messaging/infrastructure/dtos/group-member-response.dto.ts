import type { PresenceState } from "@/features/messaging/domain/entities/presence";

/** Wire shape for a group member (INT-002). All fields camelCase. */
export type GroupMemberResponseDto = {
  userId: string;
  name: string;
  initials: string;
  color: string;
  role: "admin" | "member";
  isOnline: boolean;
  /** US-E10.6 — additive 3-state presence (optional on the wire). */
  presence?: PresenceState;
  /** US-E10.6 — coarse minute/day bucket of last activity. */
  lastActiveAt?: string;
};
