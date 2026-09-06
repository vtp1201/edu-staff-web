/**
 * Cached shape behind `notificationKeys.unreadCount()`.
 *
 * `{ count }`, never a bare number: the app-shell header, the notifications
 * centre and the SSE `notification.new` handler all read/write this same entry
 * (reading it as a number once crashed the shell with "Objects are not valid
 * as a React child"). Re-exported from `../notification-keys` for back-compat.
 */
export interface UnreadCountCache {
  count: number;
}

/**
 * Optimistic reducer for "user marked ONE notification read" (US-E24.13).
 * Pure + non-mutating so the caller can keep the previous object as its
 * rollback context. `undefined` (cache not primed yet) passes through — there
 * is nothing to decrement and inventing a value would render a wrong badge.
 */
export function decrementUnreadCount(
  cache: UnreadCountCache | undefined,
  by = 1,
): UnreadCountCache | undefined {
  if (!cache) return cache;
  return { count: Math.max(0, cache.count - by) };
}
