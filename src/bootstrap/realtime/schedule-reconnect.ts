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
/** Ceiling for the backoff below — a dead upstream settles at one try/minute. */
export const SSE_RECONNECT_MAX_DELAY_MS = 60_000;

/**
 * Exponential backoff for consecutive failures: 4s, 8s, 16s … capped at
 * {@link SSE_RECONNECT_MAX_DELAY_MS}. `attempt` is 0 for the first retry after
 * a successful connection and resets on every `open`.
 *
 * Why: with a fixed 4s delay an upstream that accepts the connection and then
 * closes it immediately (observed 2026-08-09 — `noti` closed the stream after
 * 1–3s with zero bytes) turns into a permanent request-every-4s loop per tab,
 * forever, with nothing on screen to explain it.
 */
export function reconnectDelayFor(
  attempt: number,
  baseMs = SSE_RECONNECT_DELAY_MS,
): number {
  return Math.min(
    baseMs * 2 ** Math.max(0, attempt),
    SSE_RECONNECT_MAX_DELAY_MS,
  );
}

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
