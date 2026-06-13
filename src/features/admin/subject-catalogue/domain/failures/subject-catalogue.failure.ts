export type SubjectCatalogueFailure =
  | { type: "code-format" }
  | { type: "archive-blocked-parent" }
  | { type: "archive-blocked-subject" }
  | { type: "not-found" }
  | { type: "network-error" }
  | { type: "unknown" };
