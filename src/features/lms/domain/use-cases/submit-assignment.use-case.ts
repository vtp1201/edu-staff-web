import type { Submission } from "../entities/submission.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/**
 * Submit work. SINGLE ATTEMPT — a second call is `already-submitted`; a call
 * after `dueAt` is `closed` (BE US-228 made the deadline enforcing, which is
 * why the old client-side "confirm late submission" flow is gone: a late
 * submit is rejected, not confirmed).
 */
export class SubmitAssignmentUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(assignmentId: string, content: string): Promise<Result<Submission>> {
    return runCatching(() => this.repo.submitAssignment(assignmentId, content));
  }
}
