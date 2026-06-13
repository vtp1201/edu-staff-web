export type SchoolSetupFailure =
  | { type: "network-error" }
  | { type: "unauthorized" }
  | { type: "unknown" };
