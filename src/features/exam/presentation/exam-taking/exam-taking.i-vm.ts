import type { ExamSummary } from "@/features/exam/domain/entities/exam.entity";
import type { ExamQuestion } from "@/features/exam/domain/entities/exam-question.entity";

export interface ExamAnswer {
  questionId: string;
  selectedOptionId: string | null;
}

export interface ExamTakingVm {
  exam: ExamSummary;
  questions: ExamQuestion[];
  /** Captured when the briefing completes — deterministic for the timer + tests. */
  startedAt: number;
  onSubmit: (answers: ExamAnswer[], startedAt: number) => void;
}
