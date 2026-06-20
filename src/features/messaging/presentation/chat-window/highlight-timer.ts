/**
 * Pure (framework-free) scheduling logic for the scroll-to-message highlight
 * flash used by ChatWindow. Extracted from the component so the DEF-01 timer
 * contract (no leak: a pending timer is always cleared before a new one is
 * scheduled, and the handle is reclaimable for unmount cleanup) is unit-testable
 * without React / DOM.
 *
 * The component keeps the returned handle in a ref and clears it on unmount.
 */

export const HIGHLIGHT_DURATION_MS = 3000;

export interface ScheduleHighlightClearOptions {
  /** Apply the highlight to this message id. */
  messageId: string;
  /** Setter for the highlighted message id (null = no highlight). */
  setHighlightId: (id: string | null) => void;
  /** Handle of a previously scheduled clear timer (cleared first), if any. */
  previousTimer: ReturnType<typeof setTimeout> | null;
  /** Auto-clear delay; defaults to {@link HIGHLIGHT_DURATION_MS}. */
  durationMs?: number;
}

/**
 * Sets the highlight for `messageId` and schedules it to clear after
 * `durationMs`. Always clears `previousTimer` first so rapid clicks never leak a
 * pending timer. Returns the new timer handle so the caller can store it (ref)
 * and clear it on unmount — the DEF-01 fix.
 */
export function scheduleHighlightClear({
  messageId,
  setHighlightId,
  previousTimer,
  durationMs = HIGHLIGHT_DURATION_MS,
}: ScheduleHighlightClearOptions): ReturnType<typeof setTimeout> {
  if (previousTimer) clearTimeout(previousTimer);
  setHighlightId(messageId);
  return setTimeout(() => setHighlightId(null), durationMs);
}
