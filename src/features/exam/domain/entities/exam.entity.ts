export type ExamStatus = "available" | "completed" | "expired";

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
}
