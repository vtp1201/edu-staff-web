export type ClassManagementFailure =
  | { type: "duplicate-class" } // 409 CLASS_ALREADY_EXISTS
  | { type: "grade-level-out-of-range" } // 422 CLASS_GRADE_LEVEL_OUTSIDE_TENANT_RANGE / 400 CLASS_INVALID_GRADE_LEVEL / 422 SCHOOL_GRADE_LEVEL_RANGE_NOT_CONFIGURED
  | { type: "class-archived" } // 409 CLASS_ARCHIVED — modify an archived class
  | { type: "homeroom-teacher-not-found" } // 404 CLASS_ASSIGNMENT_TEACHER_NOT_FOUND
  | { type: "assignee-not-teacher" } // 422 CLASS_ASSIGNMENT_NOT_TEACHER_ROLE
  | { type: "invalid-name" } // 400 CLASS_INVALID_NAME
  | { type: "invalid-academic-year" } // 400 CLASS_INVALID_ACADEMIC_YEAR
  | { type: "not-found" } // 404 CLASS_NOT_FOUND
  | { type: "forbidden" } // 403 CLASS_FORBIDDEN
  | { type: "network-error" }
  | { type: "unknown" };
