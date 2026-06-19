export type AcademicRecordsFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "network-error" }
  | { type: "unknown" };
