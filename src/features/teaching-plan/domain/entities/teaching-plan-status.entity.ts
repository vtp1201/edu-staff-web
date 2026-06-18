/**
 * Lifecycle status of a teaching plan (PPCT) — US-E11.4.
 * Stable literals; shared between domain, infra fixtures and presentation VM.
 */
export type TeachingPlanStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED";
