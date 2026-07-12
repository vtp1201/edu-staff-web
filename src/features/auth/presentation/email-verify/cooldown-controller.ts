export interface CooldownOptions {
  /** Injectable clock for deterministic tests. Default: () => Date.now(). */
  now?: () => number;
  /** Cooldown window length in seconds. Default: 60. */
  durationSeconds?: number;
}

/**
 * Framework-free cooldown clock (unit-testable with fake timers). A React hook
 * binds to it via `useSyncExternalStore` (see `use-email-verify-cooldown.ts`).
 *
 * `remainingSeconds` is clamped to [0, durationSeconds]; 0 = actionable.
 * `start()` (re)arms a fresh window unconditionally — safe to call while already
 * running (Resend-mid-cooldown resets to a fresh 60, AC-002.6). It is NEVER
 * called by an error path (AC-008.6) — that discipline lives in the caller.
 */
export class CooldownController {
  private endsAt: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly listeners = new Set<() => void>();
  private cachedRemaining = 0;
  private readonly now: () => number;
  private readonly duration: number;

  constructor(opts: CooldownOptions = {}) {
    this.now = opts.now ?? (() => Date.now());
    this.duration = opts.durationSeconds ?? 60;
  }

  /** Snapshot for useSyncExternalStore — returns the cached primitive. */
  getRemaining = (): number => this.cachedRemaining;

  private compute(): number {
    if (this.endsAt === null) return 0;
    const ms = this.endsAt - this.now();
    return ms <= 0 ? 0 : Math.min(this.duration, Math.ceil(ms / 1000));
  }

  private refresh = (): void => {
    const next = this.compute();
    if (next !== this.cachedRemaining) {
      this.cachedRemaining = next;
      this.emit();
    }
    if (next === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.endsAt = null;
    }
  };

  start = (): void => {
    this.endsAt = this.now() + this.duration * 1000;
    this.cachedRemaining = this.compute();
    this.emit();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(this.refresh, 250);
  };

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  private emit(): void {
    for (const l of this.listeners) l();
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
