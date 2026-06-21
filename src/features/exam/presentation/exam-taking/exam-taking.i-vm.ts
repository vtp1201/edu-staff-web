import type { ExamSummary } from "@/features/exam/domain/entities/exam.entity";
import type { ExamQuestion } from "@/features/exam/domain/entities/exam-question.entity";
import type { SubmitAnswer } from "@/features/exam/domain/repositories/i-exam.repository";

/** Presentation answer = domain submit answer (discriminated mcq | essay). */
export type ExamAnswer = SubmitAnswer;

export interface ExamTakingVm {
  exam: ExamSummary;
  questions: ExamQuestion[];
  /** Captured when the briefing completes — deterministic for the timer + tests. */
  startedAt: number;
  onSubmit: (answers: ExamAnswer[], startedAt: number) => void;
}
