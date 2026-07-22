/**
 * Leading-edge throttle for the outbound typing signal (US-E18.17). Fires
 * immediately on the first call, then suppresses further calls until
 * `intervalMs` has elapsed — keeping the compose-input `onChange` from hammering
 * `POST /rooms/{id}/typing` (whose server-side cooldown is ~3s). Framework-free
 * with an injectable clock so it can be unit-tested without fake timers.
 */
export type TypingThrottle = { fire: () => void };

export function createTypingThrottle(
  send: () => void,
  opts: { intervalMs?: number; now?: () => number } = {},
): TypingThrottle {
  const intervalMs = opts.intervalMs ?? 2000;
  const now = opts.now ?? (() => Date.now());
  let last = Number.NEGATIVE_INFINITY;
  return {
    fire() {
      const t = now();
      if (t - last >= intervalMs) {
        last = t;
        send();
      }
    },
  };
}
