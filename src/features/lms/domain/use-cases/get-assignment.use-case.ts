import type { Assignment } from "../entities/assignment.entity";
import type { Submission } from "../entities/submission.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/** An assignment plus the caller's own submission, if any. */
export interface AssignmentDetail {
  assignment: Assignment;
  /** `null` = not submitted yet — an expected state, not a failure. */
  mySubmission: Submission | null;
}

/**
 * The detail read behind "open an assignment". Composes the two endpoints the
 * screen needs (`GET /assignments/{id}` + `.../submissions/me`) so the client
 * makes ONE round trip and cannot render a half-loaded sheet.
 *
 * The submission read is only attempted once the assignment read succeeded —
 * a denied assignment must not also emit a submission call.
 */
export class GetAssignmentDetailUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(assignmentId: string): Promise<Result<AssignmentDetail>> {
    return runCatching(async () => {
      const assignment = await this.repo.getAssignment(assignmentId);
      const mySubmission = await this.repo.getMySubmission(assignmentId);
      return { assignment, mySubmission };
    });
  }
}
