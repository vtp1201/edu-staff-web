export type AttendanceFailure =
  | { type: "period-not-found" }
  | { type: "save-failed"; message?: string }
  | { type: "unauthorized" }
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
