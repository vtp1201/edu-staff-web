/**
 * Read-only timetable view endpoints (`core` service, US-E18.11, extended by
 * US-E18.26). Kept separate from the admin builder's `timetable.endpoint.ts`
 * so the two feature modules' infra stay decoupled (plan decision 3).
 *
 * US-E18.26 closed cross-repo ask #15: BE US-153 shipped a by-member timetable
 * read and BE US-148 shipped a member-enrollment read + `classId`/`className`
 * enrichment on `linked-students`, so the student self-view and the parent
 * child-view are no longer mock-first. Student display NAME resolution is
 * still open (ask #20 residual — no endpoint a PARENT may call returns one).
 */
export const TIMETABLE_VIEW_EP = {
  /** Class-scoped published timetable (`?termId=` mandatory). Contract-correct
   *  but currently has no caller (the parent view moved to `memberTimetable`). */
  classTimetable: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/timetable`,
  /**
   * TEACHER-role auto-filtered class list ("classes I'm assigned to").
   * US-E18.26 repurposed it from a per-class fan-out SOURCE into a plain
   * `classId → className` lookup for the by-member schedule (2 calls total
   * instead of 1+N). Same endpoint + precedent as
   * `src/features/teacher/infrastructure/repositories/teacher-class.repository.ts`.
   */
  myClasses: "/core/api/v1/classes",
  /** By-member weekly timetable (`?termId=` mandatory) — BE US-153. */
  memberTimetable: (memberId: string) =>
    `/core/api/v1/members/${encodeURIComponent(memberId)}/timetable`,
  /** Member's current class enrollment (`yearLabel` omitted → latest) — BE US-148. */
  memberEnrollment: (memberId: string) =>
    `/core/api/v1/members/${encodeURIComponent(memberId)}/enrollment`,
  /** A parent's linked students, enriched with class context — BE US-148. */
  linkedStudents: (memberId: string) =>
    `/core/api/v1/members/${encodeURIComponent(memberId)}/linked-students`,
} as const;
