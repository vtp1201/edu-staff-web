import type { ExamSummary } from "../entities/exam.entity";
import type { IExamRepository } from "../repositories/i-exam.repository";

export class ListExamsUseCase {
  constructor(private readonly repo: IExamRepository) {}

  execute(studentId: string): Promise<ExamSummary[]> {
    return this.repo.listExams(studentId);
  }
}
