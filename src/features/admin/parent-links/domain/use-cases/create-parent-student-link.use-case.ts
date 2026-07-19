import type { ParentStudentLink } from "../entities/parent-student-link.entity";
import type { ParentStudentLinkFailure } from "../failures/parent-student-link.failure";
import type {
  AuthContext,
  CreateLinkInput,
  IParentStudentLinkRepository,
} from "../repositories/i-parent-student-link.repository";
import { fail, type Result } from "./result";

/**
 * Create a parent-student link (US-E20.1, INT-002). Guards the required fields
 * (studentId, parentId, relationship) client-side, then delegates the
 * duplicate-pair (FR-004) and role/tenant re-auth (HIGH-RISK, AC-005.5) checks
 * to the repository — the use-case does NOT re-implement those server-side
 * rules, it only prevents an obviously-incomplete request.
 */
export class CreateParentStudentLinkUseCase {
  constructor(private readonly repo: IParentStudentLinkRepository) {}

  execute(
    input: CreateLinkInput,
    authCtx: AuthContext,
  ): Promise<Result<ParentStudentLink, ParentStudentLinkFailure>> {
    const fields: { field: string; message: string }[] = [];
    if (!input.studentId)
      fields.push({ field: "studentId", message: "required" });
    if (!input.parentId)
      fields.push({ field: "parentId", message: "required" });
    if (!input.relationship)
      fields.push({ field: "relationship", message: "required" });

    if (fields.length > 0) {
      return Promise.resolve(fail({ type: "validation", fields }));
    }

    return this.repo.createLink(input, authCtx);
  }
}
