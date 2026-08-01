import "server-only";

/**
 * Wire-shape DTOs from `GET /noti/api/v1/notifications` (camelCase, per BE
 * contract — BE US-146, ground-truthed 2026-08-01, ADR 0066).
 *
 * The real wire carries an i18n KEY + scalar params, never pre-rendered text
 * (BE's producing consumer runs with no request locale — edu-api ADR 0074).
 */
export interface NotificationResponseDto {
  id: string;
  /** Notification category: grade | attendance | discipline | announcement | system */
  type: string;
  /** Stable i18n key, e.g. `notification_discipline_violation_title`. */
  titleKey: string;
  /** ICU params for the title key (scalars, e.g. `{ severity: "MINOR" }`). */
  titleParams: Record<string, string>;
  /** Stable i18n key, e.g. `notification_discipline_violation_body`. */
  bodyKey: string;
  /**
   * ICU params for the body key. May include UUIDs (`classId`,
   * `studentMemberId`, `recordId`) which are deliberately NOT rendered
   * (ADR 0066 — no human-readable resolution in scope for this US).
   */
  bodyParams: Record<string, string>;
  /** ISO 8601 timestamp string. */
  ts: string;
  read: boolean;
}

/**
 * MOCK-ONLY wire shape (US-E10.2 fixtures). Keeps its own pre-rendered vi/en
 * text — the mock has no key/param data and no need to invent BE's. Its mapper
 * (`mapMockNotification`) reshapes it into the same `NotificationEntity` the
 * real mapper produces so presentation has ONE contract in both modes.
 */
export interface MockNotificationResponseDto {
  id: string;
  type: string;
  titleVi: string;
  titleEn: string;
  bodyVi: string;
  bodyEn: string;
  ts: string;
  read: boolean;
}

/** Response from GET /noti/api/v1/notifications/unread-count (singular, generic). */
export interface UnreadCountResponseDto {
  count: number;
}

/** Response from PATCH /noti/api/v1/notifications/read-batch (capped 500/call). */
export interface ReadBatchResponseDto {
  markedCount: number;
  /** `true` when unread rows remain (or the batch was cancelled) — repeat. */
  hasMore: boolean;
}
