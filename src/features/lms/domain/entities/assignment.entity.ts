/**
 * Assignment — `services/lms` `Assignment` / `AssignmentSummary` (US-E24.1).
 *
 * There is NO grading model on the wire (grading is BE US-141, unshipped): no
 * score, no max score, no teacher comment, no attachment. There is also no
 * per-student status on the assignment itself — whether the caller submitted is
 * a separate read (`GET /assignments/{id}/submissions/me`).
 */

/** BE-computed availability. Same three values as `CourseItemState`, but a
 *  distinct type: this one is the ASSIGNMENT row's own state, not a tile's. */
export type AssignmentState = "UPCOMING_HIDDEN" | "OPEN" | "CLOSED";

/** Full assignment — `GET /assignments/{assignmentId}`. */
export interface Assignment {
  id: string;
  classId: string;
  subjectId: string;
  /** Null when the assignment references no course (pre-US-229 rows). */
  courseId: string | null;
  title: string;
  instructions: string | null;
  /** Before this instant the assignment is hidden from students. */
  startAt: string | null;
  /** ENFORCED: a submission after it is rejected `409 LMS_ITEM_CLOSED`. */
  dueAt: string | null;
  state: AssignmentState;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Class-scoped list row — `GET /assignments?classId=`. NARROWER than
 * `Assignment`: the by-class table stores neither `instructions` nor
 * `createdAt`, and — the operative gap for the student list — it carries NO
 * `state` and no `startAt`. Deadline framing is therefore the only thing the
 * list can honestly show; open the assignment for its state.
 */
export interface AssignmentSummary {
  id: string;
  classId: string;
  subjectId: string;
  courseId: string | null;
  title: string;
  dueAt: string | null;
  createdBy: string;
  updatedAt: string;
}
