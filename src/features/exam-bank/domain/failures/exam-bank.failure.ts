export type ExamBankFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "cannot-delete-published" }
  | { type: "missing-title" }
  | { type: "no-questions" }
  | { type: "question-empty-content" }
  | { type: "question-missing-answer" }
  | { type: "insufficient-options" }
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
