import type { ExamResult } from "../entities/exam-result.entity";
import type { ExamFailure } from "../failures/exam.failure";
import type {
  IExamRepository,
  SubmitExamInput,
} from "../repositories/i-exam.repository";

export type SubmitExamResult =
  | { ok: true; result: ExamResult }
  | { ok: false; failure: ExamFailure };

export class SubmitExamUseCase {
  constructor(private readonly repo: IExamRepository) {}

  async execute(input: SubmitExamInput): Promise<SubmitExamResult> {
    try {
      const result = await this.repo.submitExam(input);
      return { ok: true, result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "max-attempts-exceeded") {
        return { ok: false, failure: { type: "max-attempts-exceeded" } };
      }
      if (msg === "after-deadline") {
        return { ok: false, failure: { type: "after-deadline" } };
      }
      if (msg === "already-submitted") {
        return { ok: false, failure: { type: "already-submitted" } };
      }
      if (msg === "not-found") {
        return { ok: false, failure: { type: "not-found" } };
      }
      return { ok: false, failure: { type: "unknown" } };
    }
  }
}
