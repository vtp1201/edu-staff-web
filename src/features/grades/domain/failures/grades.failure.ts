export type GradesFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "score-out-of-range"; columnId: string; maxScore: number }
  | { type: "already-published" }
  | { type: "incomplete-scores" }
  | { type: "network-error" }
  | { type: "unknown" };
