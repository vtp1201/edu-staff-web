export type AttendanceFailure =
  | { type: "forbidden" }
  | { type: "not-found" }
  | { type: "correction-window-expired" }
  | { type: "student-not-enrolled" }
  | { type: "invalid-request" }
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
