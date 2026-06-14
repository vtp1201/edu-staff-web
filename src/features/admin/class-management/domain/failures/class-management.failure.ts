export type ClassManagementFailure =
  | { type: "duplicate-class" } // 409 CLASS_ALREADY_EXISTS
  | { type: "grade-level-out-of-range" } // 422 CLASS_GRADE_LEVEL_OUTSIDE_TENANT_RANGE
  | { type: "not-found" } // 404
  | { type: "forbidden" } // 403
  | { type: "network-error" }
  | { type: "unknown" };
