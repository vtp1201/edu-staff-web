import type { CourseStatus } from "@/features/lms/domain/entities/course.entity";
import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type { CourseTone } from "../tone";

export interface SubjectOptionVm {
  subjectId: string;
  name: string;
  /** Drives the "(môn của bạn)" suffix — and, upstream, whether the resolved
   *  mode is `teacher` or `readonly`. Carried here so the picker can render the
   *  suffix without re-deriving the mode. */
  isMine: boolean;
}

/**
 * Why the tab's VM carries raw `CourseItem[]` rather than the finished
 * `CourseTimelineVm`: the client owns a LIVE cache of the timeline (reorder is
 * optimistic), so the week grouping has to be re-derived on every cache write.
 * Handing down pre-grouped weeks would freeze the first render's ordering.
 */
export interface TeacherCourseTabVm {
  classId: string;
  /** Empty when there is no course to show (see `emptyReason`). */
  courseId: string | null;
  courseName: string;
  tone: CourseTone;
  courseStatus: CourseStatus | null;
  /** RSC-read seed for the client cache; `[]` when the read failed. */
  items: CourseItem[];
  /** Timeline-read failure ONLY — the rest of the tab still renders. */
  errorKey: LmsFailure["type"] | null;
  mode: "teacher" | "readonly";
  /** More than one entry mounts the picker; a GVBM with one subject sees none. */
  subjectOptions: SubjectOptionVm[];
  selectedSubjectId: string | null;
  /**
   * Why there is no course, when there is none. `forbidden` is ask #7's case
   * (BE refused the subject's course); `no-course` means the subject simply has
   * none yet — a materially different statement, so it gets its own copy.
   */
  emptyReason: "forbidden" | "no-course" | "no-subjects" | null;
  /** `?subjectId=` is appended to this — built server-side, never guessed. */
  courseTabHrefBase: string;
  /** Where "Kiểm tra" in the add menu leads. */
  examBankHref: string;
}

export type CourseTabActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorKey: LmsFailure["type"] };

/** `startAt`/`dueAt` are `string | undefined`, NOT three-state: on CREATE there
 *  is no previous value to clear, so "omitted" and "null" would mean the same
 *  thing and BE's body only accepts the former. */
export interface CreateLessonFormInput {
  title: string;
  content: string;
  startAt?: string;
  dueAt?: string;
}

export interface CreateAssignmentFormInput {
  title: string;
  instructions?: string;
  startAt?: string | null;
  dueAt?: string | null;
}

export interface CreateDocumentFormInput {
  title: string;
  /** Pre-validated `https://` before it ever reaches the action. */
  url: string;
  startAt?: string;
  dueAt?: string;
}

/**
 * Server Action refs — bound in `page.tsx`, passed as props, never imported by
 * presentation. Every one is already `classId`/`courseId`-bound, so a client
 * cannot address a different course through them.
 */
export interface TeacherCourseTabActions {
  listItems: () => Promise<CourseTabActionResult<CourseItem[]>>;
  reorderItems: (
    itemIds: string[],
  ) => Promise<CourseTabActionResult<CourseItem[]>>;
  patchItem: (
    itemId: string,
    patch: { startAt: string | null; dueAt: string | null },
  ) => Promise<CourseTabActionResult<CourseItem>>;
  createLesson: (
    input: CreateLessonFormInput,
  ) => Promise<CourseTabActionResult<CourseItem[]>>;
  createAssignment: (
    input: CreateAssignmentFormInput,
  ) => Promise<CourseTabActionResult<CourseItem[]>>;
  addDocumentItem: (
    input: CreateDocumentFormInput,
  ) => Promise<CourseTabActionResult<CourseItem[]>>;
  publishCourse: () => Promise<CourseTabActionResult<CourseStatus>>;
  deleteItem: (itemId: string) => Promise<CourseTabActionResult<null>>;
}
