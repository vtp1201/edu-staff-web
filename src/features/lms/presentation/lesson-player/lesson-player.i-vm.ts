import type {
  CourseItemState,
  CourseItemType,
} from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type { CourseTone } from "../tone";

/**
 * Course detail ViewModel (US-E24.1) — the COURSE TIMELINE, not a lesson tree.
 *
 * The pre-US-E24.1 model (chapters → typed lessons with duration + `done`,
 * plus notes/Q&A/mark-complete) had no wire backing at all and is gone. What
 * BE actually returns is one ordered list of tiles; a LESSON tile's body is a
 * separate read, which is why `content` is fetched lazily via a Server Action
 * rather than shipped with the page.
 */
export interface TimelineItemVm {
  id: string;
  itemType: CourseItemType;
  title: string;
  /** DOCUMENT only. */
  description: string | null;
  /** DOCUMENT only — absolute https link, opened in a new tab. */
  url: string | null;
  /** ISO or null (no deadline). */
  dueAt: string | null;
  /** BE-COMPUTED — displayed, never recomputed client-side. */
  state: CourseItemState;
  /** EXAM only — deep link into core's exam flow; null when unconfigured. */
  examUrl: string | null;
  /** EXAM only — null for an open-ended exam. */
  examDurationMinutes: number | null;
}

export interface LessonPlayerVm {
  courseId: string;
  courseName: string;
  /** Full course description (the single-course read carries it). */
  courseDescription: string;
  /** Breadcrumb "back" link, pre-resolved. */
  coursesListHref: string;
  /** Decorative tone derived from the course id (see `tone.ts`). */
  tone: CourseTone;
  /** BE order — the client must not re-sort. */
  items: TimelineItemVm[];
  /** Server-picked first readable LESSON tile, or null when there is none. */
  initialLessonId: string | null;
  errorKey: LmsFailure["type"] | null;
}

/** Server Action result for the lazy lesson-body read (stable key, no i18n). */
export type GetLessonResult =
  | { ok: true; data: { id: string; title: string; content: string } }
  | { ok: false; errorKey: LmsFailure["type"] };

/** Server Action refs — passed as props, never imported by presentation. */
export interface LessonPlayerActions {
  getLesson: (lessonId: string) => Promise<GetLessonResult>;
}
