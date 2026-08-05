/**
 * Per-cell grade workflow status (US-E18.12, ADR 0054) — ground-truthed
 * against `core`'s `GradeEntry` state machine (`grade_entry.go`):
 * `DRAFT → (PUBLISHED | PENDING_APPROVAL) → PUBLISHED → LOCKED`.
 *
 * US-E18.44 (BE US-184) added the ONE reverse transition:
 * `PENDING_APPROVAL → DRAFT` via `POST .../reject` (ADMIN/MANAGER,
 * request-revision semantics — the teacher fixes the score and resubmits
 * normally). There is deliberately **no `REJECTED` state**: the rejection is
 * recorded as staff-only payload on the entry (`GradeRejection` in
 * `grade-sheet.entity.ts`), not as a status. Every other transition is still
 * strictly forward.
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
