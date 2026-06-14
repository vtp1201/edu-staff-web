export type PrincipalTeachersFailure =
  | { type: "network-error" }
  | { type: "forbidden" }
  | { type: "not-found" }
  | { type: "conflict-exists" }
  | { type: "unknown" };
