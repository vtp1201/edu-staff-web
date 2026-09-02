/**
 * Course — `services/lms` `Course` / `CourseSummary` (openapi.yaml, US-E24.1).
 *
 * A course is the CONTAINER for a class × subject: its content is the ordered
 * timeline of `CourseItem`s, not a chapter/lesson tree. There is no progress,
 * completion or grade on the wire — anything of that shape would be invented.
 */

/** Lifecycle status. `PUBLISHED` is terminal (there is no unpublish). */
export type CourseStatus = "DRAFT" | "PUBLISHED";

/** Full course — `GET /courses/{courseId}`. */
export interface Course {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  description: string;
  status: CourseStatus;
  /** System-provisioned default course for the class × subject (title locked). */
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Set only after DRAFT → PUBLISHED; null on a DRAFT course. */
  publishedAt: string | null;
}

/**
 * Class-scoped list row — `GET /courses?classId=`. Deliberately NARROWER than
 * `Course`: the denormalized by-class table BE serves this from stores neither
 * `description` nor `createdAt`, so they are ABSENT here rather than faked
 * (an empty description would be indistinguishable from an unwritten one).
 */
export interface CourseSummary {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  status: CourseStatus;
  isDefault: boolean;
  createdBy: string;
  updatedAt: string;
  publishedAt: string | null;
}
