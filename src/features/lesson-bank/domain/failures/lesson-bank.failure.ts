export type LessonBankFailure =
  | { type: "missing-title" }
  | { type: "invalid-url" }
  | { type: "unsupported-type" }
  | { type: "file-too-large" }
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "unauthorized" }
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
