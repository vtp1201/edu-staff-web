import type { ExamSummary } from "@/features/exam/domain/entities/exam.entity";

export interface ExamBriefingVm {
  exam: ExamSummary;
  onStart: () => void;
}
