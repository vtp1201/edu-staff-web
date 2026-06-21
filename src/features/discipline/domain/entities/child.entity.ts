/**
 * A child linked to a parent account (US-E09.4). Mock-first: avatar is initials
 * and avatarColor is a hex string (OQ-6) until the real `core` parent↔child link
 * ships. These are *data*, not UI copy.
 */
export interface ChildEntity {
  childId: string;
  name: string;
  className: string;
  /** Initials shown in the avatar bubble. */
  avatar: string;
  /** Hex color for the avatar bubble (mock-first, OQ-6). */
  avatarColor: string;
  /** Homeroom teacher (GVCN) the leave request is sent to. */
  gvcnName: string;
}
