/** A class within an academic year (drives the class selector + info card). */
export interface ClassSummary {
  id: string;
  name: string;
  gradeLevel: number;
  /** Homeroom teacher display name; null when not yet assigned. */
  homeroomTeacher: string | null;
  /** Academic year label, e.g. "2025–2026". */
  year: string;
}
