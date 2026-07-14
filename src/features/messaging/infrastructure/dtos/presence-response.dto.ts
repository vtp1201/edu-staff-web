import type { PresenceState } from "@/features/messaging/domain/entities/presence";

/**
 * Wire shape for one presence snapshot record (INT-401, `noti` service).
 * All fields camelCase per the api-integration rule. `lastActiveAt` is a coarse
 * minute/day bucket — never a precise instant (NFR-006/PII posture).
 */
export type PresenceResponseDto = {
  memberId: string;
  status: PresenceState;
  lastActiveAt: string;
};
