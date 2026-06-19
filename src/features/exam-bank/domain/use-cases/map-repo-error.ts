import type { ExamBankFailure } from "../failures/exam-bank.failure";

/** Map a thrown repo Error (message = failure key) to an ExamBankFailure. */
export function mapRepoError(err: unknown): ExamBankFailure {
  const msg = err instanceof Error ? err.message : "";
  switch (msg) {
    case "not-found":
      return { type: "not-found" };
    case "forbidden":
      return { type: "forbidden" };
    case "cannot-delete-published":
      return { type: "cannot-delete-published" };
    case "network-error":
      return { type: "network-error" };
    default:
      return { type: "unknown", message: msg };
  }
}
