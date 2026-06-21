export type ExamStatus =
  | "available"
  | "completed"
  | "expired"
  | "submitted_pending_essay";

export type ExamType = "multiple-choice";

export type ExamSubjectColor =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple"
  | "teal";

export interface ExamSummary {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  subjectColor: ExamSubjectColor;
  teacherName: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  deadline: string; // ISO date
  status: ExamStatus;
  type: ExamType;
  /** True when the exam mixes MCQ + essay questions. */
  hasEssayQuestions?: boolean;
  essayCount?: number;
  essayMax?: number;
  mcqScore?: number | null;
  mcqMax?: number;
  questionTypes?: ("mcq" | "essay")[];
}
