/**
 * US-E18.12 (ADR 0054) — remapped for the real per-cell `GradeEntry` contract.
 * Ground-truthed against `core`'s error taxonomy (`pkg/kit/response/error.go`
 * `codeFromKey`, UPPER_SNAKE — same convention as US-E18.7/8/9/11).
 *
 * Retired (no wire equivalent, bulk "whole sheet" publish concept is gone):
 * - `already-published` — replaced by the per-cell `not-draft` 409.
 * - `incomplete-scores` — no server precheck for per-cell submit; if a "warn
 *   before submitting a column with ungraded students" UX is wanted, that's a
 *   client-side confirmation, not a repository failure.
 * - `score-out-of-range` renamed to `invalid-value` (matches
 *   `GRADE_ENTRY_INVALID_VALUE`, same shape).
 *
 * Approval-pipeline-only failures (`invalid-revision-note`, `batch-locked`)
 * stay UNCHANGED — used exclusively by the untouched `IGradeApprovalRepository`
 * / mock use-cases, a different repository's vocabulary that happens to share
 * this file (ADR 0054 §2.3 — do not fold them into or remove them).
 */
export type GradesFailure =
  | { type: "not-found" } // GRADE_ENTRY_NOT_FOUND, 404
  | { type: "forbidden" } // GRADE_ENTRY_FORBIDDEN, 403
  | { type: "teacher-not-assigned" } // GRADE_ENTRY_TEACHER_NOT_ASSIGNED, 403
  | { type: "invalid-value"; columnId: string; maxScore: number } // GRADE_ENTRY_INVALID_VALUE, 400
  | { type: "not-draft" } // GRADE_ENTRY_NOT_DRAFT, 409 — submit attempted on a cell no longer DRAFT (raced)
  | { type: "not-pending-approval" } // GRADE_ENTRY_NOT_PENDING_APPROVAL, 409
  | { type: "not-published" } // GRADE_ENTRY_NOT_PUBLISHED, 409 — lock attempted on a non-PUBLISHED entry
  | { type: "locked" } // GRADE_ENTRY_LOCKED, 409
  | { type: "scale-not-configured" } // GRADE_SCALE_NOT_CONFIGURED, 422
  | { type: "scheme-not-configured" } // ASSESSMENT_SCHEME_NOT_CONFIGURED, 422
  | { type: "column-not-in-scheme"; columnId: string } // GRADE_ENTRY_COLUMN_NOT_IN_SCHEME, 400
  | { type: "student-not-enrolled" } // GRADE_ENTRY_STUDENT_NOT_ENROLLED, 400
  | { type: "network-error" }
  | { type: "unknown" }
  // US-E14.4 — grade approval pipeline (untouched, ADR 0054 §2.3):
  | { type: "invalid-revision-note" }
  | { type: "batch-locked" };
