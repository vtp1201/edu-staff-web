import type { Class, CreateClassInput } from "../entities/class.entity";
import type { ClassManagementFailure } from "../failures/class-management.failure";
import type { IClassManagementRepository } from "../repositories/i-class-management.repository";
import { fail, type Result } from "./result";

export interface GradeRange {
  minGrade: number;
  maxGrade: number;
}

export class CreateClassUseCase {
  constructor(private readonly repo: IClassManagementRepository) {}

  async execute(
    input: CreateClassInput,
    gradeRange: GradeRange | null,
  ): Promise<Result<Class, ClassManagementFailure>> {
    if (
      gradeRange &&
      (input.gradeLevel < gradeRange.minGrade ||
        input.gradeLevel > gradeRange.maxGrade)
    ) {
      return fail({ type: "grade-level-out-of-range" });
    }
    return this.repo.createClass(input);
  }
}
