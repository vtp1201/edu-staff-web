import type {
  NotificationFilter,
  NotificationPage,
} from "../../domain/entities/notification.entity";

/**
 * Server Action refs the bell dropdown needs (US-E24.13).
 *
 * `onFetchPreview` deliberately keeps `fetchPageAction`'s EXACT param shape
 * (`{ filter, cursor? }`) so the RSC layout can pass that action through
 * unwrapped: only a `"use server"` function can cross the server→client prop
 * boundary, so a reshaping closure is not an option. The action already
 * defaults to a page of 8 (`PAGE_SIZE`), which is exactly the preview size.
 */
export interface NotificationDropdownActions {
  onFetchPreview: (params: {
    filter: NotificationFilter;
    cursor?: string;
  }) => Promise<NotificationPage | { errorKey: string }>;
  /**
   * Mark ONE notification read. REQUIRED — unlike `onMarkAllRead` (a
   * convenience), mark-read IS the panel's row interaction (AC-3: click a row →
   * it loses its bold + dot and the bell badge drops). An optional prop made
   * that path fail SILENTLY: `await onMarkRead?.(id)` resolves `undefined`, the
   * optimistic cache write still fires against no server call, and the badge
   * snaps back on the next invalidation. Requiring it turns that into a compile
   * error; the header falls back to its plain link bell when the action is
   * absent.
   */
  onMarkRead: (id: string) => Promise<{ errorKey?: string }>;
  /** Mark all read. Absent → the "Đánh dấu tất cả đã đọc" link is hidden. */
  onMarkAllRead?: () => Promise<{ errorKey?: string }>;
  /** Close the owning Popover (footer link, row navigation). */
  onClose: () => void;
}

/** ViewModel for the bell dropdown panel (US-E24.13). */
export interface NotificationDropdownVm {
  /** Active tenant — the "Xem tất cả thông báo" link is tenant-scoped. */
  tenantId: string;
  /**
   * Whether the owning Popover is open. Gates the preview query (`enabled`) so
   * the shell never fetches a list the user has not asked for.
   */
  open: boolean;
  /**
   * Unread count from the SHARED `["notifications","unread-count"]` cache
   * (owned by the header's own query, shape `{ count }`) — passed down so the
   * panel never opens a second competing query for the same number.
   */
  unreadCount: number;
}

export type NotificationDropdownProps = NotificationDropdownVm &
  NotificationDropdownActions;
