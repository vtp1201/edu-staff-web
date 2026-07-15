/**
 * Reaction enum (INT-190-04). Single named export so a BE-confirmed rename is a
 * one-file change. Wire values are camelCase/lowercase per api-integration.md.
 */
export type ReactionType = "like" | "love" | "celebrate" | "clap";

/** All reaction types in fixed display order (👍/❤️/🎉/👏). */
export const REACTION_TYPES: readonly ReactionType[] = [
  "like",
  "love",
  "celebrate",
  "clap",
] as const;

/**
 * Aggregate reaction state on a post. `counts` carries every reaction type
 * (0 when none) so presentation never has to guard undefined; `myReaction` is
 * the single active reaction of the current user (null = none) — single active
 * reaction per user (AC-1903.2).
 */
export interface ReactionState {
  counts: Record<ReactionType, number>;
  myReaction: ReactionType | null;
}

/** Zeroed counts helper — the mapper's default before applying wire counts. */
export function emptyReactionCounts(): Record<ReactionType, number> {
  return { like: 0, love: 0, celebrate: 0, clap: 0 };
}
