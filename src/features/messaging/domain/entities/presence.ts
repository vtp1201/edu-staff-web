/**
 * Presence domain model + pure derivation helpers (US-E10.6, DR-017). Zero
 * framework deps — consumed by the mock repository AND the presentation layer,
 * so the `msgPresence()` derivation stays a single source of truth (never
 * re-implemented per render site).
 *
 * The three-state union is derived, never stored on the legacy boolean:
 * `msgPresence(x) = x.presence || (x.isOnline ? 'online' : 'offline')`
 * (design-spec `screens.messaging.presence`, normative).
 */
export type PresenceState = "online" | "recent" | "offline";

/** Structural input — matches ContactEntity / ConversationEntity / GroupMember. */
export type PresenceInput = {
  presence?: PresenceState;
  isOnline?: boolean;
};

/** A presence snapshot record for one member (INT-401 response, post-map). */
export type PresenceRecord = {
  memberId: string;
  presence: PresenceState;
  /** Coarse minute/day bucket (never a precise instant — NFR-006/PII). */
  lastActiveAt: string;
};

/**
 * Derive the 3-state presence: explicit `presence` wins; otherwise fall back to
 * the legacy `isOnline` boolean; neither present → `offline` (never throws).
 */
export function msgPresence(x: PresenceInput): PresenceState {
  if (x.presence) return x.presence;
  return x.isOnline ? "online" : "offline";
}

/** Sort weight — online (2) → recent (1) → offline (0). */
export function presenceRank(state: PresenceState): number {
  if (state === "online") return 2;
  if (state === "recent") return 1;
  return 0;
}

/** Whether a state counts toward the group panel's "N online now" banner. */
export function isPresenceCountable(state: PresenceState): boolean {
  return state !== "offline";
}

/**
 * Stable online-first sort. Ties (same rank) keep their original relative order
 * — implemented via an index tiebreaker rather than relying on the engine's
 * sort stability, so the contract is explicit and test-verifiable.
 */
export function sortByPresence<T>(
  items: readonly T[],
  getState: (item: T) => PresenceState,
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const diff =
        presenceRank(getState(b.item)) - presenceRank(getState(a.item));
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map((x) => x.item);
}
