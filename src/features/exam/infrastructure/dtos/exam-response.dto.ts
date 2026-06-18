export interface ExamSummaryDto {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  teacherName: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  deadline: string;
  status: string;
  type: string;
}

export interface ExamsListDto {
  exams: ExamSummaryDto[];
}

export interface ExamOptionDto {
  id: string;
  text: string;
}

export interface ExamQuestionDto {
  id: string;
  index: number;
  text: string;
  options: ExamOptionDto[];
}

export interface ExamQuestionsDto {
  questions: ExamQuestionDto[];
}

export interface QuestionResultDto {
  questionId: string;
  index: number;
  text: string;
  options: { id: string; text: string }[];
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
}

export interface ExamResultDto {
  examId: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  rank: number | null;
  percentile: number | null;
  passed: boolean;
  questionResults: QuestionResultDto[];
}

export interface SubmitExamDto {
  examId: string;
  answers: { questionId: string; selectedOptionId: string | null }[];
  startedAt: number;
}
