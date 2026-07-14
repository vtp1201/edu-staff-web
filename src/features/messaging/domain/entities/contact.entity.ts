/**
 * A directory contact selectable in the "new conversation" modal.
 * `color` is a semantic colour key (resolved to a token class in presentation).
 */
import type { PresenceState } from "./presence";

export type ContactEntity = {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  color: string;
  isOnline: boolean;
  /** US-E10.6 — 3-state presence (additive; `isOnline` stays as the fallback). */
  presence?: PresenceState;
  /** US-E10.6 — coarse minute/day bucket of last activity (never precise). */
  lastActiveAt?: string;
};
