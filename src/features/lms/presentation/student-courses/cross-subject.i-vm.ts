import type {
  CourseItemState,
  CourseItemType,
} from "@/features/lms/domain/entities/course-item.entity";
import type { CourseTone } from "../tone";

/** The three views of `/student/courses` (`?view=`). `all` is the card grid. */
export type CoursesView = "all" | "assignment" | "exam";

/** The cross-subject sub-tab (`?sub=`). `upcoming` only exists for `exam` (D7). */
export type CrossSubjectSubTab = "open" | "upcoming" | "closed";

/**
 * Where a cross-subject row's single button goes.
 *
 * `start` is EXAM + OPEN only; everything else returns to the course timeline.
 * `external: true` ⇔ the deployment configured an exam deep link on another
 * origin (rendered as a new-tab `<a>`); otherwise it is our own route.
 */
export interface CrossSubjectCtaVm {
  kind: "start" | "view";
  href: string;
  external: boolean;
}

/**
 * One row of the cross-subject list (US-E24.4).
 *
 * NOTE — no "✓ Đã nộp": `CourseItem` carries no per-student submission flag
 * and there is no batched submission read, so the decoration would cost one
 * extra request per row (N courses × M items). US-E24.5's deviation D-1 already
 * dropped it from the single-item player for the same reason; a list is
 * strictly worse. The EXAM CTA is therefore state-only.
 */
export interface CrossSubjectRowVm {
  /** `<courseId>:<itemId>` — unique across courses (an item id is only
   *  course-unique), stable across renders, never an array index. */
  key: string;
  itemId: string;
  itemType: CourseItemType;
  title: string;
  state: CourseItemState;
  /** ISO instants — formatted at render (`formatItemWindow`), never re-derived. */
  startAt: string | null;
  dueAt: string | null;
  /** The course this row came from; the badge shows its title (no endpoint a
   *  student may call resolves `subjectId` → a subject NAME — US-E24.2 gap). */
  courseTitle: string;
  /** Decorative only, derived from the course id (see `tone.ts`). */
  tone: CourseTone;
  /** OPEN + a deadline inside 48h of the server's single `now`. */
  urgent: boolean;
  /** Whole hours left, floored at 1; `null` unless `urgent`. */
  hoursLeft: number | null;
  cta: CrossSubjectCtaVm;
}

export interface CrossSubjectGroupsVm {
  open: CrossSubjectRowVm[];
  upcoming: CrossSubjectRowVm[];
  closed: CrossSubjectRowVm[];
}
