import type {
  AssignmentEntity,
  AssignmentStatusFilter,
  SubmitAssignmentInput,
} from "@/features/lms/domain/entities/assignment.entity";
import type { AssignmentFailure } from "@/features/lms/domain/failures/assignment.failure";

/** The 4 filter tabs — identical to the domain status filter. */
export type AssignmentTab = AssignmentStatusFilter;

/** Server Action result for a per-tab list fetch (stable errorKey, no i18n). */
export type ListAssignmentsResult =
  | { ok: true; data: AssignmentEntity[] }
  | { ok: false; errorKey: AssignmentFailure["type"] };

/** Server Action result for a submit (stable errorKey, no i18n). */
export type SubmitAssignmentResult =
  | { ok: true; data: AssignmentEntity }
  | { ok: false; errorKey: AssignmentFailure["type"] };

/** Server Action refs passed into the client screen (Storybook-safe). */
export interface StudentAssignmentsActions {
  listAssignmentsAction: (
    tab: AssignmentStatusFilter,
  ) => Promise<ListAssignmentsResult>;
  submitAssignmentAction: (
    assignmentId: string,
    input: SubmitAssignmentInput,
  ) => Promise<SubmitAssignmentResult>;
}

/** RSC-mapped ViewModel for the default "all" tab + header. */
export interface StudentAssignmentsScreenVm {
  /** RSC-seeded default "all" list (initialData for that tab's query). `null`
   *  means the RSC seed failed → the client "all" region cold-fetches instead
   *  of showing a (wrong) empty state. */
  assignments: AssignmentEntity[] | null;
  /** Count of pending assignments (header subtitle). */
  pendingCount: number;
  /** Hard/guard failure (e.g. forbidden) — renders a top-level error. */
  errorKey: AssignmentFailure["type"] | null;
}

export type StudentAssignmentsScreenProps = StudentAssignmentsScreenVm & {
  actions: StudentAssignmentsActions;
};
