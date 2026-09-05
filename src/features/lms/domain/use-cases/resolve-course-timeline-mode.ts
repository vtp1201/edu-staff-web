/** The two teacher-side modes of the shared course timeline (US-E24.10). */
export type ResolvedCourseMode = "teacher" | "readonly";

/**
 * Which mode a staff viewer gets on a course's timeline.
 *
 * The SUBJECT SET is the whole decision — no role branch is needed. A GVBM
 * carries exactly their own subject(s) for this class, a pure GVCN carries an
 * empty set, and a teacher who is both carries only the subjects they actually
 * teach. So "is this course's subject mine" answers both cases at once.
 *
 * `teacherSubjectIds` are `TeacherClassSubject.id` values, which ARE subject
 * ids (`teachingSubjectIds` on core's class row), directly comparable with
 * `Course.subjectId`.
 *
 * This is a RENDERING decision only. Every mutation re-derives ownership
 * server-side in the Server Action (decision 0063) — a client that forced
 * `teacher` here still cannot write.
 */
export function resolveCourseTimelineMode(
  teacherSubjectIds: readonly string[],
  courseSubjectId: string,
): ResolvedCourseMode {
  return teacherSubjectIds.includes(courseSubjectId) ? "teacher" : "readonly";
}
