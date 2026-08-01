import type { ExamBankStatus } from "../entities/exam-bank-summary.entity";

/** Why the exam builder cannot be opened for a given paper. */
export type ExamBuilderBlockReason = "create" | "not-draft" | "not-author";

export type ExamBuilderAccess =
  | { allowed: true }
  | { allowed: false; reason: ExamBuilderBlockReason };

/**
 * Client-side mirror of the server's edit gate (US-E18.28). `core` enforces
 * author-only + DRAFT-only on every write path (`loadOwnedDraftPaper` +
 * `requireDraft()`), so this is a message-quality gate, never the security
 * boundary: it exists so a blocked user reads a specific reason instead of
 * opening a builder whose first save would 403/409.
 *
 * Mock mode has no real caller identity to compare against, so it always
 * allows — the mock store is the whole world there.
 */
export function resolveBuilderAccess(params: {
  useMock: boolean;
  status: ExamBankStatus;
  authorId: string;
  callerId: string | null;
}): ExamBuilderAccess {
  if (params.useMock) return { allowed: true };
  if (params.status !== "draft") return { allowed: false, reason: "not-draft" };
  if (!params.callerId || params.callerId !== params.authorId) {
    return { allowed: false, reason: "not-author" };
  }
  return { allowed: true };
}
