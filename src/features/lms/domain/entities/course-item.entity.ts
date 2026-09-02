/**
 * Course timeline row — `services/lms` `CourseItem` (ADR 0143, US-E24.1).
 *
 * A CONTAINER row, not the content: a LESSON/ASSIGNMENT/EXAM tile carries the
 * referenced entity's id plus a denormalized title; only a DOCUMENT is
 * self-contained (`description` + `url`).
 */

export type CourseItemType = "LESSON" | "ASSIGNMENT" | "DOCUMENT" | "EXAM";

/**
 * BE-COMPUTED availability label — never derived client-side. A student is not
 * sent `UPCOMING_HIDDEN` items at all, with ONE exception: an `EXAM` tile is
 * returned before its `startAt` (an exam's `startAt` is when it happens, not a
 * release date), so `UPCOMING_HIDDEN` IS reachable on a student read for EXAM.
 * The value also reaches a teacher read for every kind.
 */
export type CourseItemState = "UPCOMING_HIDDEN" | "OPEN" | "CLOSED";

/**
 * EXAM-only projection of core's class-exam (US-231). Flat on the wire
 * (`examId`/`scheduledDate`/`durationMinutes`/`examUrl`); NESTED here so the
 * "these four are meaningless unless itemType === EXAM" rule is expressed by
 * the type instead of by four parallel null checks at every call site.
 * `examId` mirrors `refId` and `scheduledDate` mirrors `startAt`.
 */
export interface CourseItemExam {
  examId: string;
  scheduledDate: string | null;
  /** Derived from the window; null for an open-ended exam. */
  durationMinutes: number | null;
  /** Deep link into core's exam flow; null when the deployment configures none. */
  examUrl: string | null;
}

export interface CourseItem {
  id: string;
  courseId: string;
  itemType: CourseItemType;
  /** The referenced lesson/assignment/exam; equals `id` for those, null for DOCUMENT. */
  refId: string | null;
  title: string;
  /** DOCUMENT only. */
  description: string | null;
  /** DOCUMENT only — an absolute https URL. */
  url: string | null;
  position: number;
  /** Null = open immediately. Both window boundaries are INCLUSIVE. */
  startAt: string | null;
  /** Null = no deadline. Past it a student may still READ but not submit. */
  dueAt: string | null;
  state: CourseItemState;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Present ONLY for `itemType: "EXAM"` (and only when BE sent an `examId`). */
  exam: CourseItemExam | null;
}
