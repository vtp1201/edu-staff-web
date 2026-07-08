/**
 * Pure (framework-free) reconnect-timer scheduling for the SSE connection.
 * Extracted from `useRealtimeEvents` so the DEF-01 timer contract (a pending
 * timer is always cleared before a new one is scheduled, and the handle is
 * reclaimable for unmount cleanup) is unit-testable without React / EventSource
 * — mirrors `chat-window/highlight-timer.ts`.
 *
 * Unlike `scheduleHighlightClear`, this helper performs NO immediate side
 * effect: the caller (`sse-connection.ts` `onerror`) already sets the
 * `disconnected` status itself before scheduling, so this helper's only job is
 * "schedule one delayed callback, clearing any previous one first". Keeping it
 * this thin is what makes it testable with a plain `vi.fn()` callback.
 */

export const SSE_RECONNECT_DELAY_MS = 4000;

export interface ScheduleReconnectOptions {
  /** Invoked once, after `delayMs`, to re-run the connect logic. */
  onReconnect: () => void;
  /** Handle of a previously scheduled reconnect (cleared first), if any. */
  previousTimer: ReturnType<typeof setTimeout> | null;
  /** Delay before firing; defaults to {@link SSE_RECONNECT_DELAY_MS}. */
  delayMs?: number;
}

/**
 * Schedules `onReconnect` to fire after `delayMs`, always clearing
 * `previousTimer` first so overlapping error events (or an error immediately
 * followed by a manual reconnect) never leak a duplicate pending timer. Returns
 * the new timer handle so the caller can store it and clear it on
 * unmount/dep-change/manual-reconnect.
 */
export function scheduleReconnect({
  onReconnect,
  previousTimer,
  delayMs = SSE_RECONNECT_DELAY_MS,
}: ScheduleReconnectOptions): ReturnType<typeof setTimeout> {
  if (previousTimer) clearTimeout(previousTimer);
  return setTimeout(onReconnect, delayMs);
}
