import type { CourseStatus } from "@/features/lms/domain/entities/course.entity";
import type { CourseItemType } from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type { CourseTone } from "../tone";
import type {
  CoursesView,
  CrossSubjectGroupsVm,
  CrossSubjectSubTab,
} from "./cross-subject.i-vm";

/** The soonest still-open deadline of a course, pre-selected server-side. */
export interface CourseNextDueVm {
  id: string;
  title: string;
  itemType: CourseItemType;
  /** ISO instant — formatted at render (`useFormatter`), never parsed for logic. */
  dueAt: string;
  /**
   * Within 48h of the server's `now`. COMPUTED SERVER-SIDE on purpose: the
   * urgency tone must not depend on the reader's clock (a tab left open would
   * silently re-colour itself), and presentation formats rather than decides.
   */
  dueSoon: boolean;
}

/**
 * One course card (US-E24.2 — the card now carries the timeline summary).
 *
 * The pre-US-E24.1 VM carried `lessonsDone`/`lessonsTotal`/`progressPct`/
 * `gradeAvg`. NONE of those exist anywhere in the `lms` contract: per-student
 * completion and course progress are BE US-254 (still DRAFT, see ADR 0076) and
 * grading is BE US-141 (unshipped). They are dropped rather than faked — and
 * the 0209 design bundle drops them from the card too.
 *
 * `subjectId` is deliberately NOT surfaced: the list row carries the raw uuid
 * and no endpoint a student may call resolves it to a subject NAME, so the card
 * would print an id. The design's teacher line is absent for the same reason —
 * `createdBy` is a memberId and nothing a student may call resolves it to a
 * display name (US-E24.2 data gap; the mockup's teacher is fixture data, not
 * wire data).
 *
 * `openCount`/`nextDue` are DERIVED (`summarizeCourse`) from a per-course
 * timeline read, not fetched: `lms` publishes no rollup endpoint yet (ask #4).
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
  /** Items BE marked `OPEN`. `null` ⇔ `itemsFailed` (see below). */
  openCount: number | null;
  /** Soonest upcoming deadline among the OPEN items; null when there is none. */
  nextDue: CourseNextDueVm | null;
  /**
   * This course's timeline read failed while its siblings succeeded. The card
   * still links through — only its summary degrades to "—", because a `0`
   * would read as "nothing to do" rather than "unknown".
   */
  itemsFailed: boolean;
}

/** The cross-subject half of the route (`?view=assignment|exam`, US-E24.4). */
export interface CrossSubjectViewVm {
  view: "assignment" | "exam";
  sub: CrossSubjectSubTab;
  groups: CrossSubjectGroupsVm;
  /** Route-owned `?sub=` builder (locale/tenant live only at the route). */
  hrefFor: (sub: CrossSubjectSubTab) => string;
}

export interface StudentCoursesScreenVm {
  /**
   * Which of the three views the URL asked for (US-E24.4). The screen owns all
   * three so the route keeps returning ONE element: `all` renders the card
   * grid, the other two render the cross-subject list.
   */
  view: CoursesView;
  /** Route-owned `?view=` builder for the pill row. */
  viewHrefFor: (view: CoursesView) => string;
  /** Populated for `view === "all"`; `[]` otherwise. */
  courses: CourseCardVm[];
  /** Populated for the two cross-subject views; `null` for `all`. */
  cross: CrossSubjectViewVm | null;
  /** `no-class` = the signed-in student has no resolvable class enrollment, so
   *  the class-scoped list cannot even be requested (see `resolveMyClassId`). */
  errorKey: LmsFailure["type"] | "no-class" | null;
}
