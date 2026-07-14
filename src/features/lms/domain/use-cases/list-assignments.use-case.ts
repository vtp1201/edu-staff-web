import type {
  AssignmentEntity,
  AssignmentStatusFilter,
} from "../entities/assignment.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type AssignmentResult, asgFail, asgOk } from "./assignment-result";

/**
 * Lists the student's assignments, optionally filtered by the active tab. Maps a
 * thrown repository error to an `AssignmentFailure` — only `network-error` and
 * `unknown` are reachable from the list call (integration.md INT-117-01).
 */
export class ListAssignmentsUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  async execute(
    studentId: string,
    statusFilter?: AssignmentStatusFilter,
  ): Promise<AssignmentResult<AssignmentEntity[]>> {
    try {
      return asgOk(await this.repo.listAssignments(studentId, statusFilter));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "network-error") return asgFail({ type: "network-error" });
      return asgFail({ type: "unknown" });
    }
  }
}
