export type LinkedAccountFailure =
  | { type: "link-failed"; message?: string }
  | { type: "unlink-failed"; message?: string }
  | { type: "network-error" }
  | { type: "unknown" };
