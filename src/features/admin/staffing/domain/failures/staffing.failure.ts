/** Typed error union for staffing operations.
 *  Keys mirror staffing.errors.* i18n leaves (US-E06.8).
 *  Branch on error.code (UPPER_SNAKE), never on message. */
export type StaffingFailure =
  | { type: "already-exists" }
  | { type: "not-found" }
  | { type: "has-active-assignments" }
  | { type: "invalid-permissions" }
  | { type: "member-not-teacher" }
  | { type: "academic-year-not-active" }
  | { type: "scope-entity-not-found" }
  | { type: "forbidden" }
  | { type: "network-error" }
  | { type: "unknown" };
