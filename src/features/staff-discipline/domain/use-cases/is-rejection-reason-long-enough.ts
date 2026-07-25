/** Client UX guard threshold — the server only requires a non-empty reason. */
export const MIN_REJECTION_REASON_LENGTH = 10;

/**
 * Layer 1 of the reject-reason validation (AC-005.1/AC-008.4): a pure,
 * repo-free check reused by both reject use-cases (violations + conduct notes).
 * The server's non-empty guard (AC-005.3/AC-008.6) is a DISTINCT layer enforced
 * by the repository.
 */
export function isRejectionReasonLongEnough(reason: string): boolean {
  return reason.trim().length >= MIN_REJECTION_REASON_LENGTH;
}
