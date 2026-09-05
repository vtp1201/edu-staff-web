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

/**
 * The teacher/readonly-only slice of the VM — `undefined` for a student, so a
 * student-mode VM literal needs no new keys at all (every existing fixture and
 * story keeps compiling untouched).
 */
export interface CourseTimelineTeacherVm {
  /**
   * The COMPLETE current ordering, flattened across weeks. Reorder is a
   * whole-course operation (BE rejects a partial list), so the ordering is
   * carried once here rather than re-derived from the nested week groups on
   * every drop.
   */
  orderedItemIds: string[];
  /** Ids whose row may be deleted — DOCUMENT items only (BE 409 otherwise). */
  deletableItemIds: string[];
  /** Where the "Kiểm tra" menu entry leads; exams are authored in the bank. */
  examBankHref: string;
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
  /** Present iff `mode !== "student"`. */
  teacher?: CourseTimelineTeacherVm;
}

/** One row's window, as the inline editor submits it. `null` = "để trống",
 *  which CLEARS the boundary rather than leaving it unchanged. */
export interface ItemWindowInput {
  startAt: string | null;
  dueAt: string | null;
}

/** The kinds a teacher can author from the timeline. EXAM is deliberately
 *  absent: exams are created in the exam bank and appear here on publish. */
export type AddItemKind = "lesson" | "assignment" | "document";

/** Server Action result for the "Thử lại" re-read of the timeline. */
export type RetryListItemsResult =
  | { ok: true; data: { weeks: WeekVm[]; openCount: number } }
  | { ok: false; errorKey: LmsFailure["type"] };

/** Result of any timeline mutation the teacher branch can fire. Stable failure
 *  KEYS only — the component translates, the action never does. */
export type TimelineMutationResult =
  | { ok: true }
  | { ok: false; errorKey: LmsFailure["type"] };

/**
 * Server Action refs — passed as props, never imported by presentation.
 *
 * The four mutation fields are optional because ONE action type serves all
 * three modes: a student VM populates none of them, and the teacher branch is
 * the only reader. Three per-mode action interfaces threaded through a
 * discriminated union would be more machinery than three optional fields earn.
 */
export interface CourseTimelineActions {
  retryListItems: () => Promise<RetryListItemsResult>;
  /** The COMPLETE new ordering — never a delta (BE rejects a partial list). */
  reorderItems?: (orderedIds: string[]) => Promise<TimelineMutationResult>;
  patchItemWindow?: (
    itemId: string,
    input: ItemWindowInput,
  ) => Promise<TimelineMutationResult>;
  /** Opens the confirm dialog owned by the tab. Deleting is never optimistic
   *  and never starts here — this only reports which row was asked about. */
  requestDeleteItem?: (itemId: string) => void;
  /** Opens the create dialog OWNED BY THE TAB — the timeline itself never
   *  renders a dialog, it only reports which kind was chosen and for which
   *  week (that week's start seeds the new item's `startAt`). */
  requestAddItem?: (kind: AddItemKind, weekStart: string | null) => void;
}
