import type { ExamResult } from "../entities/exam-result.entity";
import type { IExamRepository } from "../repositories/i-exam.repository";

export class GetExamResultUseCase {
  constructor(private readonly repo: IExamRepository) {}

  execute(examId: string): Promise<ExamResult> {
    return this.repo.getResult(examId);
  }
}
