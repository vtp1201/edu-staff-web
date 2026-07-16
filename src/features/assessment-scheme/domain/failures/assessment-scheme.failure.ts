export type AssessmentSchemeFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "invalid-scale-type" } // GRADE_SCALE_INVALID_TYPE (400)
  | { type: "letter-grades-required" } // GRADE_SCALE_LETTER_GRADES_REQUIRED (422)
  | { type: "invalid-column" } // ASSESSMENT_SCHEME_INVALID_COLUMN (400)
  | { type: "column-in-use" } // ASSESSMENT_SCHEME_COLUMN_IN_USE (409)
  | { type: "max-columns" } // ASSESSMENT_SCHEME_MAX_COLUMNS (422)
  | { type: "network-error" }
  | { type: "unknown" };
