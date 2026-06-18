import type { ExamQuestion } from "../entities/exam-question.entity";
import type { IExamRepository } from "../repositories/i-exam.repository";

export class GetExamQuestionsUseCase {
  constructor(private readonly repo: IExamRepository) {}

  execute(examId: string): Promise<ExamQuestion[]> {
    return this.repo.getQuestions(examId);
  }
}
