import type {
  AssignmentEntity,
  SubmitAssignmentInput,
} from "../entities/assignment.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type AssignmentResult, asgFail, asgOk } from "./assignment-result";

/**
 * Submits a pending assignment. Maps every repository-thrown error code to an
 * `AssignmentFailure` (integration.md INT-117-02). `file-too-large` is validated
 * client-side before this use-case is ever invoked, so it is not mapped here.
 */
export class SubmitAssignmentUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  async execute(
    assignmentId: string,
    input: SubmitAssignmentInput,
  ): Promise<AssignmentResult<AssignmentEntity>> {
    try {
      return asgOk(await this.repo.submitAssignment(assignmentId, input));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      switch (msg) {
        case "network-error":
          return asgFail({ type: "network-error" });
        case "not-found":
          return asgFail({ type: "not-found" });
        case "forbidden":
          return asgFail({ type: "forbidden" });
        case "already-submitted":
          return asgFail({ type: "already-submitted" });
        default:
          return asgFail({ type: "unknown" });
      }
    }
  }
}
