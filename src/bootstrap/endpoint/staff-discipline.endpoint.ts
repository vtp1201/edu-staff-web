/**
 * `core` conduct sub-domain endpoints for the staff track (US-E09.5, INT-001..008).
 *
 * **Never invoked today**: `bootstrap/di/staff-discipline.di.ts`'s `makeRepo()`
 * force-mocks the repository unconditionally (roster-UUID gap — see that file's
 * doc comment), so no HTTP repository exists yet. These constants are written now
 * so the future real-wiring story has the ground-truthed paths ready without
 * magic strings (mirrors the `discipline`/`staff-leave` precedent).
 *
 * All 10 paths were ground-truthed BE-side (spec.md §6, US-E18.14 rigor).
 */
export const STAFF_DISCIPLINE_EP = {
  /** POST — create a violation (DRAFT). */
  createViolation: "/core/api/v1/conduct/staff-violations",
  /** GET `?staffMemberId=` — role-scoped list (teacher forced to own id). */
  listViolations: "/core/api/v1/conduct/staff-violations",
  /** POST — DRAFT → SUBMITTED. */
  submitViolation: (recordId: string) =>
    `/core/api/v1/conduct/staff-violations/${recordId}/submit`,
  /** POST — SUBMITTED → APPROVED. */
  approveViolation: (recordId: string) =>
    `/core/api/v1/conduct/staff-violations/${recordId}/approve`,
  /** POST — SUBMITTED → REJECTED (body: `rejectionReason`). */
  rejectViolation: (recordId: string) =>
    `/core/api/v1/conduct/staff-violations/${recordId}/reject`,

  /** POST — set (create/overwrite) a conduct note, key `(termId, staffMemberId)`. */
  setConductNote: "/core/api/v1/conduct/staff-conduct-notes",
  /** GET `?staffMemberId=&termId=` — role-scoped list. */
  listConductNotes: "/core/api/v1/conduct/staff-conduct-notes",
  /** POST `?termId=` — DRAFT → SUBMITTED. */
  submitConductNote: (staffMemberId: string) =>
    `/core/api/v1/conduct/staff-conduct-notes/${staffMemberId}/submit`,
  /** POST `?termId=` — SUBMITTED → APPROVED (then permanently locked, ADR 0074). */
  approveConductNote: (staffMemberId: string) =>
    `/core/api/v1/conduct/staff-conduct-notes/${staffMemberId}/approve`,
  /** POST `?termId=` — SUBMITTED → REJECTED (body: `rejectionReason`). */
  rejectConductNote: (staffMemberId: string) =>
    `/core/api/v1/conduct/staff-conduct-notes/${staffMemberId}/reject`,
} as const;
