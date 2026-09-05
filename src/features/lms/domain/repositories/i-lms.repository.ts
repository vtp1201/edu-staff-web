import type {
  Assignment,
  AssignmentSummary,
} from "../entities/assignment.entity";
import type { Course, CourseSummary } from "../entities/course.entity";
import type { CourseItem } from "../entities/course-item.entity";
import type { Lesson, LessonSummary } from "../entities/lesson.entity";
import type { Submission } from "../entities/submission.entity";

/** `POST /courses/{courseId}/lessons` body (teacher). */
export interface CreateLessonInput {
  title: string;
  content: string;
  position?: number;
  startAt?: string;
  dueAt?: string;
}

/** `POST /assignments` body (teacher). `courseId` is REQUIRED since BE US-229. */
export interface CreateAssignmentInput {
  classId: string;
  subjectId: string;
  courseId: string;
  title: string;
  instructions?: string;
  startAt?: string | null;
  dueAt?: string | null;
}

/** `POST /courses/{courseId}/items/documents` body (teacher). */
export interface CreateDocumentItemInput {
  title: string;
  description?: string;
  /** Absolute `https://` URL with a host — BE rejects anything else. */
  url: string;
  position?: number;
  startAt?: string;
  dueAt?: string;
}

/**
 * `PATCH /courses/{courseId}/items/{itemId}` body (teacher). `startAt`/`dueAt`
 * are THREE-STATE on the wire: omitted = unchanged, explicit `null` = cleared,
 * value = set. Modelled with `?: string | null` so all three are expressible.
 */
export interface UpdateCourseItemInput {
  title?: string;
  description?: string;
  url?: string;
  startAt?: string | null;
  dueAt?: string | null;
}

/**
 * `lms` service port (US-E24.1) — one port for the whole service; the student
 * consumption reads and the teacher authoring commands hit the same API and
 * the same failure catalog.
 *
 * **Error convention: every method THROWS an `LmsFailure` object** (not an
 * `Error`), mapped from the BE `error.code`. Use-cases are the catch boundary
 * and wrap it in `Result<T>`. The one deliberate non-throw is
 * `getMySubmission`, where "not submitted yet" (`404
 * LMS_SUBMISSION_NOT_FOUND`) is an expected state, not a failure.
 */
export interface ILmsRepository {
  // ── reads ───────────────────────────────────────────────────────────────
  /** `classId` is REQUIRED by BE. A student sees only PUBLISHED rows. */
  listCourses(classId: string, subjectId?: string): Promise<CourseSummary[]>;
  getCourse(courseId: string): Promise<Course>;
  /** Ordered, `content`-free. */
  listLessons(courseId: string): Promise<LessonSummary[]>;
  getLesson(courseId: string, lessonId: string): Promise<Lesson>;
  /** The ordered timeline. Server-filtered for a student; never an empty array
   *  as a denial — an unauthorized read is `not-found`. */
  listItems(courseId: string): Promise<CourseItem[]>;
  listAssignments(
    classId: string,
    filter?: { subjectId?: string; courseId?: string },
  ): Promise<AssignmentSummary[]>;
  getAssignment(assignmentId: string): Promise<Assignment>;
  /** `null` = the caller has not submitted yet (BE 404 LMS_SUBMISSION_NOT_FOUND). */
  getMySubmission(assignmentId: string): Promise<Submission | null>;

  // ── commands ────────────────────────────────────────────────────────────
  /** Single attempt — a second call is `already-submitted`. */
  submitAssignment(assignmentId: string, content: string): Promise<Submission>;
  /** Teacher. No UI consumes these yet — the authoring screens land in E24.10. */
  createLesson(courseId: string, input: CreateLessonInput): Promise<Lesson>;
  createAssignment(input: CreateAssignmentInput): Promise<Assignment>;
  addDocumentItem(
    courseId: string,
    input: CreateDocumentItemInput,
  ): Promise<CourseItem>;
  patchItem(
    courseId: string,
    itemId: string,
    patch: UpdateCourseItemInput,
  ): Promise<CourseItem>;
  /** `itemIds` is the COMPLETE new ordering — a partial list is `not-found`. */
  reorderItems(courseId: string, itemIds: string[]): Promise<CourseItem[]>;
  /** `POST .../publish` — DRAFT → PUBLISHED, TERMINAL (there is no unpublish).
   *  A second call is `already-published` (409), never a silent success. */
  publishCourse(courseId: string): Promise<Course>;
  /** `DELETE .../items/{itemId}` — DOCUMENT items ONLY. A LESSON/ASSIGNMENT
   *  tile is `not-document` (409); a repeat delete is `not-found` (404). */
  deleteItem(courseId: string, itemId: string): Promise<void>;
}
