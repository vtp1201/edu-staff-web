import type { Assignment } from "../entities/assignment.entity";
import type {
  CreateAssignmentInput,
  ILmsRepository,
} from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/**
 * Create an assignment (which also writes its timeline tile).
 *
 * `courseId` has been REQUIRED since BE US-229 and the course must be
 * PUBLISHED — a DRAFT one is `course-not-published`, an actionable state the
 * caller surfaces as "xuất bản khoá học trước", not a generic error.
 */
export class CreateAssignmentUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(input: CreateAssignmentInput): Promise<Result<Assignment>> {
    return runCatching(() => this.repo.createAssignment(input));
  }
}
