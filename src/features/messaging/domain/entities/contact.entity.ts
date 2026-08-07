/**
 * A directory contact selectable in the "new conversation" modal.
 * `color` is a semantic colour key (resolved to a token class in presentation).
 */
import type { PresenceState } from "./presence";

/**
 * The staff roles a contact row can carry (US-E18.52). Deliberately exactly
 * IAM's narrowed-tier allow-list (`ADMIN|MANAGER|TEACHER|STAFF`, ADR 0129),
 * lower-cased into a STABLE i18n key — `messaging.contactRole.<key>`. STUDENT /
 * PARENT are absent on purpose: the directory endpoint refuses to list them, so
 * a contact can never be one.
 */
export type ContactRoleKey = "admin" | "manager" | "teacher" | "staff";

export type ContactEntity = {
  id: string;
  name: string;
  /**
   * Free-text role caption — mock/seed data only. The real IAM directory row
   * carries no such string; a real contact uses {@link ContactEntity.roleKey}.
   * Absent → the picker omits the caption line rather than rendering a blank.
   */
  role?: string;
  /**
   * Stable role key for a REAL directory contact (US-E18.52). Translated at the
   * presentation boundary; never a pre-translated label.
   */
  roleKey?: ContactRoleKey;
  avatarInitials: string;
  color: string;
  isOnline: boolean;
  /** US-E10.6 — 3-state presence (additive; `isOnline` stays as the fallback). */
  presence?: PresenceState;
  /** US-E10.6 — coarse minute/day bucket of last activity (never precise). */
  lastActiveAt?: string;
};
