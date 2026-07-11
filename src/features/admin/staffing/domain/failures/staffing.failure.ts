/** Typed error union for staffing operations.
 *  Keys mirror staffing.*.errors.* i18n leaves (US-E06.8, extended US-E18.2).
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
  // Mutation attempted on a terminal-state entity (ARCHIVED / NOT_ACTIVE).
  | { type: "archived" }
  // scopeType not a valid enum value (defensive — picker only emits valid).
  | { type: "invalid-scope-type" }
  // Value-object/format 400s (ids sourced from prior API responses, not user
  // input — shouldn't occur, but must not silently fall to `unknown`).
  | { type: "validation" }
  | { type: "network-error" }
  | { type: "unknown" };
