export type AssessmentSchemeFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "invalid-scale-type" } // GRADE_SCALE_INVALID_TYPE (400)
  | { type: "letter-grades-required" } // GRADE_SCALE_LETTER_GRADES_REQUIRED (422)
  // GRADE_SCALE_INVALID_BANDS (422) — ONE shared code covering every band
  // violation on a numeric scale (empty/over-32-char label, threshold
  // unparseable or outside [minValue,maxValue], thresholds not strictly
  // decreasing, more than 10 bands) plus bands sent on a LETTER_ABCD scale.
  // The BE gives no per-field detail, so the client validates the same rules up
  // front (validate-grade-scale.use-case) and this stays the backstop.
  | { type: "invalid-bands" }
  | { type: "invalid-column" } // ASSESSMENT_SCHEME_INVALID_COLUMN (400)
  | { type: "column-in-use" } // ASSESSMENT_SCHEME_COLUMN_IN_USE (409)
  | { type: "max-columns" } // ASSESSMENT_SCHEME_MAX_COLUMNS (422)
  // VALIDATION_FAILED (422) blaming the `gradeLevel` query param — the
  // grade-scoped subject lookup was asked for a level outside 1..13
  // (BE US-177 / US-E18.42).
  | { type: "invalid-grade-level" }
  | { type: "network-error" }
  | { type: "unknown" };
