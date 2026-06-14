/** Typed failure union for the teacher dashboard. Presentation maps these stable
 *  keys to localized copy; the domain never translates. */
export type TeacherDashboardFailure =
  | { type: "network-error" }
  | { type: "unauthorized" }
  | { type: "unknown" };
