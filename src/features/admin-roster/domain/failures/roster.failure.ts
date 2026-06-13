/** Typed error union for roster operations.
 *  Keys mirror adminRoster.errors.* i18n leaves (TR-034, US-E06.7). */
export type RosterFailure =
  | { type: "network-error" }
  | { type: "unauthorized" }
  | { type: "forbidden" }
  | { type: "not-found" }
  | { type: "already-enrolled" }
  | { type: "member-not-student" }
  | { type: "class-archived" }
  | { type: "unknown" };
