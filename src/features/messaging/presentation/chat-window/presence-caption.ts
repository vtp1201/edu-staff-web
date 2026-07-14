import type { PresenceState } from "@/features/messaging/domain/entities/presence";

/**
 * Which `messaging.presence.*` caption key (if any) the DM chat-header should
 * render, plus the `{n}` param for the minute-relative case. Pure + testable —
 * no React, no `t()`; the presentation layer maps the key → translated text.
 *
 * OQ-1 resolution (plan §0.1): offline WITHOUT a known `lastActiveAt` bucket →
 * `null` (no caption, matching today's empty-subtitle behavior); the
 * `activeYesterday` key is used ONLY when a day-bucketed `lastActiveAt` exists.
 */
export type PresenceCaptionKey =
  | { key: "onlineNow" }
  | { key: "activeMinutesAgo"; n: number }
  | { key: "activeYesterday" }
  | { key: null };

export function derivePresenceCaptionKey(
  state: PresenceState,
  lastActiveAt: string | undefined,
  now: number = Date.now(),
): PresenceCaptionKey {
  if (state === "online") return { key: "onlineNow" };

  if (state === "recent") {
    const n = lastActiveAt ? minutesSince(lastActiveAt, now) : 1;
    return { key: "activeMinutesAgo", n: Math.max(1, n) };
  }

  // offline
  if (lastActiveAt) return { key: "activeYesterday" };
  return { key: null };
}

function minutesSince(iso: string, now: number): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 1;
  return Math.floor((now - then) / 60_000);
}
