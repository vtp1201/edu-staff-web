/**
 * Core notification domain types (US-E10.2).
 * Pure TypeScript — zero framework dependencies.
 */

/** All notification categories emitted by the noti service. */
export type NotificationType =
  | "grade"
  | "attendance"
  | "discipline"
  | "announcement"
  | "system";

/** A notification as consumed by the presentation layer. */
export interface NotificationEntity {
  id: string;
  type: NotificationType;
  /** Localised title (vi or en depending on locale). */
  title: string;
  /** Short summary, 2-line truncate in UI. */
  body: string;
  /** ISO 8601 timestamp string — presentation formats relative time. */
  ts: string;
  read: boolean;
}

/** Cursor-paged result from the repository. */
export interface NotificationPage {
  items: NotificationEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Unread notification count. */
export interface UnreadCount {
  count: number;
}

/** Filter applied to the notifications list query. */
export type NotificationFilter =
  | "all"
  | "unread"
  | "grade"
  | "attendance"
  | "discipline"
  | "announcement";
