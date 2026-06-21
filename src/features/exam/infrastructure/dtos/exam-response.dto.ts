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
  hasEssayQuestions?: boolean;
  essayCount?: number;
  essayMax?: number;
  mcqScore?: number | null;
  mcqMax?: number;
  questionTypes?: string[];
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
  type?: string;
  options: ExamOptionDto[];
}

export interface ExamQuestionsDto {
  questions: ExamQuestionDto[];
}

export interface QuestionResultDto {
  questionId: string;
  index: number;
  text: string;
  type?: string;
  options: { id: string; text: string }[];
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean | null;
  textAnswer?: string | null;
}

export interface ExamResultDto {
  examId: string;
  examTitle: string;
  status?: string;
  score: number | null;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  rank: number | null;
  percentile: number | null;
  passed: boolean | null;
  mcqScore?: number | null;
  mcqMax?: number | null;
  essayMax?: number | null;
  essayCount?: number;
  questionResults: QuestionResultDto[];
}

export interface SubmitExamDto {
  examId: string;
  answers: {
    questionId: string;
    type: "mcq" | "essay";
    selectedOptionId?: string | null;
    textAnswer?: string;
  }[];
  startedAt: number;
}
