/** Typed error union for roster operations. Keys mirror adminRoster.errors.* i18n leaves. */
export type RosterFailure =
  | { type: "network-error" }
  | { type: "unauthorized" }
  | { type: "not-found" }
  | { type: "unknown" };
