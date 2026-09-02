/** How the teacher relates to a class: homeroom (GVCN) and/or subject (GVBM).
 *  A class can carry both at once (the teacher owns 10A1 AND teaches Toán there). */
export type ClassRole = "homeroom" | "subject";

/** A subject the teacher holds a SUBJECT teaching assignment for in this class.
 *  `name` falls back to the raw id when the subject catalogue lookup misses. */
export interface TeacherClassSubject {
  id: string;
  name: string;
}

/** KPI fields that may be sourced from the draft/mock path (ADR 0076). */
export type TeacherClassKpiField =
  | "absentToday"
  | "pendingGrading"
  | "attendanceRate"
  | "openViolations"
  | "pendingLeave";

/** Per-class KPI numbers shown on the class card. EVERY field is optional: a
 *  BE source that hasn't shipped (or a call that failed) leaves it `undefined`
 *  and the UI simply hides that tile — never renders a zero it can't back. */
export interface TeacherClassKpi {
  /** GVBM — students absent today (draft US-255 on ClassResponse). */
  absentToday?: number;
  /** GVBM — items waiting to be graded (draft US-255 on ClassResponse). */
  pendingGrading?: number;
  /** GVCN — attendance ratio in 0..1 (draft US-245 summary). */
  attendanceRate?: number;
  /** GVCN — violations still in the SUBMITTED state (real conduct endpoint). */
  openViolations?: number;
  /** GVCN — leave requests in the homeroom inbox (real conduct endpoint,
   *  already server-filtered to SUBMITTED). */
  pendingLeave?: number;
  /** Which of the fields above came from the mock/draft path — drives the
   *  "demo" pill on the tile. Empty on the real path. */
  demoFields: TeacherClassKpiField[];
}

/** A class taught by the teacher. `studentCount` is wire-enriched by core
 *  (BE US-173); `roles`/`subjects` describe WHY this class is on the list. */
export interface TeacherClass {
  id: string;
  name: string;
  gradeLevel: number;
  studentCount: number;
  /** True when the current teacher is this class's homeroom teacher (GVCN).
   *  Kept alongside `roles` — the roster/class-log screens read this flag. */
  isHomeroom: boolean;
  /** Ordered (homeroom first) so badge order is stable across renders. */
  roles: ClassRole[];
  /** Empty for a pure-GVCN class (no subject assignment here). */
  subjects: TeacherClassSubject[];
  /** Absent when no KPI source produced a single number for this class. */
  kpi?: TeacherClassKpi;
  /** e.g. "2025–2026" — for display in the class card / roster header. */
  academicYearLabel: string;
}

/** Pure derivation of the card's role list. Homeroom first (badge order). */
export function deriveClassRoles(
  isHomeroom: boolean,
  teachingSubjectIds: string[] | undefined,
): ClassRole[] {
  const roles: ClassRole[] = [];
  if (isHomeroom) roles.push("homeroom");
  if (teachingSubjectIds && teachingSubjectIds.length > 0)
    roles.push("subject");
  return roles;
}
