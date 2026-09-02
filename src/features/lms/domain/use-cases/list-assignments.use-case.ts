import type { AssignmentSummary } from "../entities/assignment.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/** Assignments of ONE class. Rows carry no `state` and no `instructions` —
 *  that is the by-class table's shape, not an omission to patch up here. */
export class ListAssignmentsUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(
    classId: string,
    filter?: { subjectId?: string; courseId?: string },
  ): Promise<Result<AssignmentSummary[]>> {
    return runCatching(() => this.repo.listAssignments(classId, filter));
  }
}
