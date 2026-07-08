/**
 * Failure catalog for the LMS student player. Stable keys — presentation
 * translates `courses.errors.<type>`; server never translates (i18n.md).
 * No `already-complete` variant: re-marking a done lesson is a no-op success.
 */
export type LmsFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "unknown" };
