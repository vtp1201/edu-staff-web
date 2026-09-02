import type {
  Assignment,
  AssignmentSummary,
} from "@/features/lms/domain/entities/assignment.entity";
import type { Submission } from "@/features/lms/domain/entities/submission.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";

/**
 * `/student/assignments` ViewModel (US-E24.1, re-derived from the REAL
 * contract).
 *
 * WHAT CHANGED AND WHY. The pre-US-E24.1 screen had four tabs
 * (all/pending/submitted/graded) driven by a per-student `status` on every
 * list row. The real class-scoped list (`GET /assignments?classId=`) carries
 * no per-student anything: submission state is a SEPARATE point read
 * (`.../submissions/me`) and grading does not exist on the wire (BE US-141).
 * Fanning that read out over a class partition of up to 500 rows to rebuild
 * the tabs would be 500 requests to render one list, so the list is flat and a
 * row's submission state is resolved when the sheet OPENS it.
 */

/**
 * Every stable error key this screen can render: the LMS failure catalog plus
 * `no-class` (the student's class could not be resolved at all, so a
 * class-scoped read was never even attempted). Both the RSC page and the
 * Server Action use `no-class` for that identical condition.
 */
export type AssignmentsErrorKey = LmsFailure["type"] | "no-class";

/** Server Action result for the list refetch (stable errorKey, no i18n). */
export type ListAssignmentsResult =
  | { ok: true; data: AssignmentSummary[] }
  | { ok: false; errorKey: AssignmentsErrorKey };

/** Full detail for one assignment + the caller's own submission (or null). */
export interface AssignmentDetailVm {
  assignment: Assignment;
  mySubmission: Submission | null;
}

export type GetAssignmentDetailResult =
  | { ok: true; data: AssignmentDetailVm }
  | { ok: false; errorKey: LmsFailure["type"] };

export type SubmitAssignmentResult =
  | { ok: true; data: Submission }
  | { ok: false; errorKey: LmsFailure["type"] };

/** Server Action refs passed into the client screen (Storybook-safe). */
export interface StudentAssignmentsActions {
  listAssignmentsAction: () => Promise<ListAssignmentsResult>;
  getAssignmentDetailAction: (
    assignmentId: string,
  ) => Promise<GetAssignmentDetailResult>;
  submitAssignmentAction: (
    assignmentId: string,
    content: string,
  ) => Promise<SubmitAssignmentResult>;
}

export interface StudentAssignmentsScreenVm {
  /** RSC-seeded list. `null` means the seed failed → the client cold-fetches
   *  instead of showing a (wrong) empty state. */
  assignments: AssignmentSummary[] | null;
  /** Hard/guard failure (forbidden, no resolvable class) — top-level error. */
  errorKey: AssignmentsErrorKey | null;
}

export type StudentAssignmentsScreenProps = StudentAssignmentsScreenVm & {
  actions: StudentAssignmentsActions;
};
