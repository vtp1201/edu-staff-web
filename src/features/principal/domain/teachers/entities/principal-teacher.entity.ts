/**
 * Membership status EXACTLY as the IAM member directory spells it
 * (`MemberListItem.status`, IAM US-144) — the teachers screen's only real
 * source of teacher rows since US-E18.40.
 *
 * `ON_LEAVE` was REMOVED: it only ever existed in the hand-authored mock for the
 * never-implemented `GET /core/api/v1/teachers`. IAM has no leave concept on a
 * membership, so a "Nghỉ phép" badge in real mode would have been fiction.
 * `LEFT` cannot appear either — BE excludes LEFT members from the directory list.
 */
export type TeacherStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

/**
 * One GVBM (subject-teacher) assignment, composed client-side from
 * `GET /core/api/v1/classes/{classId}/subject-assignments` (BE US-181).
 *
 * The wire row is `{classId, subjectId, teacherMemberId, assignedAt,
 * assignedBy}` — so:
 * - `className` comes from the class list this assignment was fanned out FROM;
 * - `subjectName` is resolved against the subject catalogue and is `null` when
 *   the id is not resolvable (never the raw uuid — a uuid under a "Môn học"
 *   label is a lie);
 * - there is NO `classSubjectId`: an assignment is keyed by `(classId,
 *   subjectId)`, the curriculum `ClassSubject` uuid is a different aggregate;
 * - there is NO `hasConflict`: the wire carries nothing of the sort. Timetable
 *   conflicts are detected by `core` at WRITE time
 *   (409 `TIMETABLE_TEACHER_CONFLICT`), not derivable from this read.
 */
export interface SubjectAssignment {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string | null;
}

export interface PrincipalTeacher {
  /** IAM `memberId` (=== `userId`; a membership's identity IS `(tenantId, userId)`). */
  teacherId: string;
  displayName: string;
  email: string;
  /**
   * DERIVED, not authoritative: the subject this teacher is assigned to in the
   * most classes (ties resolved alphabetically). IAM carries no "primary
   * subject" field and `core` has no such concept either, so this is a display
   * summary of {@link PrincipalTeacher.subjectAssignments} — `null` whenever
   * there are no resolvable assignments.
   */
  primarySubjectName: string | null;
  homeroomClassId: string | null;
  homeroomClassName: string | null;
  subjectAssignments: SubjectAssignment[];
  status: TeacherStatus;
}
