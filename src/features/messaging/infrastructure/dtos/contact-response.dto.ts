import type { PresenceState } from "@/features/messaging/domain/entities/presence";

/** Wire shape for a directory contact (camelCase). */
export type ContactResponseDto = {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  color: string;
  isOnline: boolean;
  /** US-E10.6 — additive 3-state presence (optional on the wire). */
  presence?: PresenceState;
  /** US-E10.6 — coarse minute/day bucket of last activity. */
  lastActiveAt?: string;
};
