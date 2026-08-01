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

/**
 * A notification as consumed by the presentation layer.
 *
 * US-E18.25 / ADR 0066 — the real wire (BE US-146) carries an i18n KEY plus
 * scalar params, never pre-rendered text (BE's producer runs with no request
 * locale). Translation happens ONLY at presentation (`.claude/rules/i18n.md`
 * §"Nơi dịch") — domain, repositories and mappers never translate.
 */
export interface NotificationEntity {
  id: string;
  type: NotificationType;
  /** Stable BE-owned i18n key for the title (see `notification-message-key.ts`). */
  titleKey: string;
  /** ICU params for the title key — scalar values only, never a raw UUID. */
  titleParams: Record<string, string>;
  /** Stable BE-owned i18n key for the body (2-line truncate in UI). */
  bodyKey: string;
  /** ICU params for the body key — scalar values only, never a raw UUID. */
  bodyParams: Record<string, string>;
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
