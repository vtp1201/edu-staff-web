export type SchoolSetupFailure =
  | { type: "not-found" }
  | { type: "already-exists" }
  | { type: "forbidden" }
  | { type: "grade-level-range-invalid" }
  | { type: "narrowing-blocked" }
  | { type: "network-error" }
  | { type: "unknown" };
