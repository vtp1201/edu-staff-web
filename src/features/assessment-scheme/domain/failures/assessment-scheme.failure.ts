export type AssessmentSchemeFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "invalid-weights" } // weights do not sum to 100
  | { type: "invalid-thresholds" }
  | { type: "network-error" }
  | { type: "unknown" };
