import type { ExamSummary } from "@/features/exam/domain/entities/exam.entity";

export interface ExamListVm {
  exams: ExamSummary[];
}
