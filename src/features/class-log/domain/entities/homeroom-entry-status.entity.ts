/**
 * Lifecycle status of a homeroom (class-log / "sổ đầu bài") entry.
 * Matches the core service `homeroom-entries` contract (US-E13.3).
 *   DRAFT → SUBMITTED → APPROVED | REJECTED → (revise) SUBMITTED
 */
export type HomeroomEntryStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED";
