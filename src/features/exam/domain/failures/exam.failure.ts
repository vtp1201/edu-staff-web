export type ExamFailure =
  | { type: "not-found" }
  | { type: "max-attempts-exceeded" }
  | { type: "after-deadline" }
  | { type: "already-submitted" }
  | { type: "network-error" }
  | { type: "unknown" };
