import type { ExamResult } from "@/features/exam/domain/entities/exam-result.entity";

export interface ExamResultVm {
  result: ExamResult;
  /** Navigate back to the exam list. */
  onBackToList: () => void;
  /** Optional deep-link to the grade book shown in the pending-essay banner. */
  gradeBookPath?: string;
}
