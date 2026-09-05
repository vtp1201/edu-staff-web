import type {
  CourseItemState,
  CourseItemType,
} from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type { WeekVm } from "../course-timeline/course-timeline.i-vm";
import type { CourseTone } from "../tone";

/** What a student's own submission shows on screen — deliberately NOT the full
 *  `Submission` entity: `assignmentId`/`studentUserId` are already known from
 *  the route and the session, so they never cross into presentation. */
export interface SubmissionVm {
  content: string;
  submittedAt: string;
}

/**
 * The active item, as a DISCRIMINATED UNION on `kind`.
 *
 * The union IS the dispatch key: `course-player.tsx` switches on it once and
 * every body component receives its own narrow shape (a lesson body can never
 * even see `mySubmission`). The alternative — one wide object with five sets of
 * nullable fields — would push a runtime `itemType` check into every leaf.
 */
export type ActiveItemVm =
  | {
      kind: "lesson";
      id: string;
      title: string;
      state: CourseItemState;
      startAt: string | null;
      dueAt: string | null;
      /** PLAIN TEXT (BE contract) — rendered as paragraphs, never as HTML. */
      content: string;
    }
  | {
      kind: "document";
      id: string;
      title: string;
      state: CourseItemState;
      startAt: string | null;
      dueAt: string | null;
      description: string | null;
      /** Absolute https link authored by a teacher; treated as untrusted. */
      url: string | null;
    }
  | {
      kind: "assignment";
      id: string;
      title: string;
      state: CourseItemState;
      startAt: string | null;
      dueAt: string | null;
      instructions: string | null;
      /** `null` = not submitted yet (an expected state, not a failure). */
      mySubmission: SubmissionVm | null;
    }
  | {
      kind: "exam";
      id: string;
      title: string;
      state: CourseItemState;
      startAt: string | null;
      dueAt: string | null;
      /** Deep link into core's exam flow (EXTERNAL); null when unconfigured. */
      examUrl: string | null;
      /** In-app exam route, resolved server-side; null when BE sent no examId. */
      examHref: string | null;
      examDurationMinutes: number | null;
    }
  | {
      kind: "locked";
      id: string;
      title: string;
      /** Only ever `"EXAM"` on a student read (D7) — carried, not assumed. */
      itemType: CourseItemType;
      opensAt: string | null;
    };

export interface CoursePlayerVm {
  courseId: string;
  courseName: string;
  /** Breadcrumb target — the course timeline this item belongs to. */
  courseHref: string;
  tone: CourseTone;
  /** Sidebar groups — the SAME week buckets the timeline derives (US-E24.3). */
  weeks: WeekVm[];
  activeItemId: string;
  activeItem: ActiveItemVm;
  /** Resolved server-side from flat item order; null at either end. */
  prevHref: string | null;
  nextHref: string | null;
  /** Non-fatal: the item's OWN read failed (its body degrades, the header,
   *  sidebar and navigation still render). */
  activeItemErrorKey: LmsFailure["type"] | null;
}

/** Server Action result for the one-way submit (stable keys, no i18n). */
export type SubmitAssignmentResult =
  | { ok: true; submission: SubmissionVm }
  /** 409 race: BE already has a submission. `submission` is the REAL one,
   *  re-read server-side — never the text still sitting in the textarea. It is
   *  nullable because that re-read can itself fail. */
  | {
      ok: false;
      errorKey: "already-submitted";
      submission: SubmissionVm | null;
    }
  | { ok: false; errorKey: Exclude<LmsFailure["type"], "already-submitted"> };

/** The bound Server Action ref; `assignmentId` is applied by the route. */
export type SubmitAssignmentFn = (
  content: string,
) => Promise<SubmitAssignmentResult>;
