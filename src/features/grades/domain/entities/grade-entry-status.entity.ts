/**
 * Per-cell grade workflow status (US-E18.12, ADR 0054) — ground-truthed
 * against `core`'s `GradeEntry` state machine (`grade_entry.go`):
 * `DRAFT → (PUBLISHED | PENDING_APPROVAL) → PUBLISHED → LOCKED`. Strictly
 * forward, no reject/reverse transition exists.
 */
export type GradeEntryStatus =
  | "DRAFT"
  | "SUBMITTED" // real enum value, but UNREACHABLE via any wired transition —
  // Submit() on the BE always jumps straight to PUBLISHED (self-publish mode)
  // or PENDING_APPROVAL (admin-approval mode). Kept for type completeness /
  // exhaustive switches only; treat it as a defensive alias of
  // PENDING_APPROVAL if ever observed (dead code on the BE, not on web).
  | "PENDING_APPROVAL"
  | "PUBLISHED"
  | "LOCKED";
