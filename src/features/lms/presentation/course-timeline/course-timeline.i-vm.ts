import type {
  CourseItemState,
  CourseItemType,
} from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type { CourseTone } from "../tone";

/**
 * Course detail ViewModel (US-E24.3) — ONE vertical timeline grouped by week.
 *
 * The `mode` contract is declared in full from day 1 because US-E24.10 reuses
 * this component for the teacher/read-only views; this US implements `student`
 * only and the root component throws for the other two (a silent half-render
 * would be worse than a loud failure).
 */
export type CourseTimelineMode = "student" | "teacher" | "readonly";

export interface TimelineItemVm {
  id: string;
  itemType: CourseItemType;
  title: string;
  /** BE-COMPUTED — displayed, never recomputed from a clock (EPIC §2). */
  state: CourseItemState;
  /** ISO instant or null; formatted at the presentation edge. */
  startAt: string | null;
  dueAt: string | null;
  /** DOCUMENT only. */
  description: string | null;
  /** DOCUMENT only — absolute https link. */
  url: string | null;
  /** EXAM only — deep link into core's exam flow; null when unconfigured. */
  examUrl: string | null;
  /** EXAM only — null for an open-ended exam. */
  examDurationMinutes: number | null;
  /**
   * The row is NOT openable: an item BE has not released yet. For a student
   * read this is only ever an EXAM (D7) — every other type is simply absent
   * from the response until it opens.
   */
  locked: boolean;
  /** When `locked`, the instant it opens (`startAt`); null when BE sent none. */
  opensAt: string | null;
}

export interface WeekVm {
  /** `"always"` (un-windowed items, rendered first) or an ISO week (`2026-W17`). */
  key: string;
  /** Date-only ISO (`YYYY-MM-DD`), UTC-computed; null for the `"always"` group. */
  weekStart: string | null;
  weekEnd: string | null;
  items: TimelineItemVm[];
}

export interface CourseTimelineVm {
  courseId: string;
  courseName: string;
  /**
   * NO teacher name. The design header shows one, but no student-callable LMS
   * endpoint carries it (confirmed in US-E24.2 and unchanged here): `Course`
   * only has `createdBy`, an opaque member id. Rendering that — or a
   * placeholder — would be invented data, so the meta line omits the teacher.
   */
  /** Decorative tone derived from the course id (see `tone.ts`). */
  tone: CourseTone;
  /** Items whose BE state is `OPEN` (via `summarizeCourse`). */
  openCount: number;
  weeks: WeekVm[];
  /** Timeline-read failure ONLY — the course header still renders. */
  errorKey: LmsFailure["type"] | null;
  mode: CourseTimelineMode;
}

/** Server Action result for the lazy lesson-body read (stable key, no i18n). */
export type GetLessonResult =
  | { ok: true; data: { id: string; title: string; content: string } }
  | { ok: false; errorKey: LmsFailure["type"] };

/** Server Action result for the "Thử lại" re-read of the timeline. */
export type RetryListItemsResult =
  | { ok: true; data: { weeks: WeekVm[]; openCount: number } }
  | { ok: false; errorKey: LmsFailure["type"] };

/** Server Action refs — passed as props, never imported by presentation. */
export interface CourseTimelineActions {
  getLesson: (lessonId: string) => Promise<GetLessonResult>;
  retryListItems: () => Promise<RetryListItemsResult>;
}
