import type { CourseStatus } from "@/features/lms/domain/entities/course.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type { CourseTone } from "../tone";

/**
 * One course card (US-E24.1 — re-derived from the REAL `CourseSummary`).
 *
 * The pre-US-E24.1 VM carried `lessonsDone`/`lessonsTotal`/`progressPct`/
 * `gradeAvg`. NONE of those exist anywhere in the `lms` contract: per-student
 * completion and course progress are BE US-254 (still DRAFT, see ADR 0076) and
 * grading is BE US-141 (unshipped). They are dropped rather than faked.
 *
 * `subjectId` is deliberately NOT surfaced: the list row carries the raw uuid
 * and no endpoint a student may call resolves it to a subject NAME, so the card
 * would print an id. Adding the subject name is a follow-up for E24.2.
 */
export interface CourseCardVm {
  id: string;
  title: string;
  status: CourseStatus;
  /** System-provisioned course for the class × subject. */
  isDefault: boolean;
  /** Decorative only — derived from `id`, never from data (see `tone.ts`). */
  tone: CourseTone;
  /** RSC pre-computes the route — the client never concatenates strings. */
  href: string;
}

export interface StudentCoursesScreenVm {
  courses: CourseCardVm[];
  /** `no-class` = the signed-in student has no resolvable class enrollment, so
   *  the class-scoped list cannot even be requested (see `resolveMyClassId`). */
  errorKey: LmsFailure["type"] | "no-class" | null;
}
