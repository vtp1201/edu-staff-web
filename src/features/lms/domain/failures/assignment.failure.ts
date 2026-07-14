/**
 * Failure catalog for the Student Assignments screen. Stable keys — presentation
 * translates `assignments.errors.<type>`; server never translates (i18n.md).
 * Separate from `LmsFailure` (course/lesson player): different error surface
 * (`already-submitted`/`file-too-large` have no meaning there). `file-too-large`
 * is validated client-side in the submit sheet and never round-trips to a
 * use-case/repository (integration.md INT-117-02) — it lives in the union only
 * so the sheet's client-side validation branch can construct it directly.
 */
export type AssignmentFailure =
  | { type: "network-error" }
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "already-submitted" }
  | { type: "file-too-large" }
  | { type: "unknown" };
