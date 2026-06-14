/** Typed failure union for the teacher class-view use cases. Presentation maps
 *  these stable keys to localized copy; the domain never translates. Distinct
 *  from TeacherDashboardFailure: adds `not-found` (a class id may be invalid). */
export type TeacherClassFailure =
  | { type: "network-error" }
  | { type: "unauthorized" }
  | { type: "not-found" }
  | { type: "unknown" };
