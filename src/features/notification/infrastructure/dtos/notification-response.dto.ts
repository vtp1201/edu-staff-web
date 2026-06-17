import "server-only";

/**
 * Wire-shape DTOs from `GET /noti/api/v1/notifications` (camelCase, per BE contract).
 * The noti service is mock-first (US-E10.2 + decision 0017).
 */
export interface NotificationResponseDto {
  id: string;
  /** Notification category: grade | attendance | discipline | announcement | system */
  type: string;
  titleVi: string;
  titleEn: string;
  bodyVi: string;
  bodyEn: string;
  /** ISO 8601 timestamp string. */
  ts: string;
  read: boolean;
}

/** Response from GET /noti/api/v1/notifications/unread-count */
export interface UnreadCountResponseDto {
  count: number;
}
