import type { ExamSummary } from "../../../domain/entities/exam.entity";
import type { ExamQuestion } from "../../../domain/entities/exam-question.entity";
import type { ExamResult } from "../../../domain/entities/exam-result.entity";

export const MOCK_EXAMS: ExamSummary[] = [
  {
    id: "exam-001",
    title: "Kiểm tra giữa kỳ - Toán học",
    subjectId: "sub-001",
    subjectName: "Toán học",
    subjectColor: "primary",
    teacherName: "Nguyễn Văn An",
    description: "Kiểm tra các kiến thức về đại số và hình học chương 1-3.",
    durationMinutes: 45,
    totalQuestions: 20,
    deadline: "2026-06-25T23:59:00Z",
    status: "available",
    type: "multiple-choice",
  },
  {
    id: "exam-002",
    title: "Kiểm tra 15 phút - Vật lý",
    subjectId: "sub-002",
    subjectName: "Vật lý",
    subjectColor: "info",
    teacherName: "Trần Thị Bình",
    description: "Kiểm tra nhanh chương Cơ học.",
    durationMinutes: 15,
    totalQuestions: 10,
    deadline: "2026-06-20T23:59:00Z",
    status: "available",
    type: "multiple-choice",
  },
  {
    id: "exam-003",
    title: "Kiểm tra cuối kỳ - Hóa học",
    subjectId: "sub-003",
    subjectName: "Hóa học",
    subjectColor: "success",
    teacherName: "Lê Văn Cường",
    description: "Kiểm tra toàn bộ nội dung học kỳ I.",
    durationMinutes: 60,
    totalQuestions: 40,
    deadline: "2026-06-10T23:59:00Z",
    status: "completed",
    type: "multiple-choice",
  },
  {
    id: "exam-004",
    title: "Kiểm tra - Lịch sử",
    subjectId: "sub-004",
    subjectName: "Lịch sử",
    subjectColor: "warning",
    teacherName: "Phạm Thị Dung",
    description: "Kiểm tra chương Lịch sử Việt Nam.",
    durationMinutes: 30,
    totalQuestions: 15,
    deadline: "2026-06-01T23:59:00Z",
    status: "expired",
    type: "multiple-choice",
  },
];

/** First seeded exam — convenience single fixture for stories/tests. */
export const MOCK_EXAM: ExamSummary = {
  id: "exam-001",
  title: "Kiểm tra giữa kỳ - Toán học",
  subjectId: "sub-001",
  subjectName: "Toán học",
  subjectColor: "primary",
  teacherName: "Nguyễn Văn An",
  description: "Kiểm tra các kiến thức về đại số và hình học chương 1-3.",
  durationMinutes: 45,
  totalQuestions: 20,
  deadline: "2026-06-25T23:59:00Z",
  status: "available",
  type: "multiple-choice",
};

const OPTIONS_POOL = [
  { id: "A", text: "Đây là đáp án A" },
  { id: "B", text: "Đây là đáp án B" },
  { id: "C", text: "Đây là đáp án C" },
  { id: "D", text: "Đây là đáp án D" },
];

export function buildMockQuestions(count: number): ExamQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${i + 1}`,
    index: i + 1,
    text: `Câu hỏi số ${i + 1}: Đây là nội dung câu hỏi mẫu để kiểm tra khả năng hiển thị và cuộn trang của học sinh trong bài kiểm tra trắc nghiệm.`,
    options: OPTIONS_POOL,
  }));
}

export const MOCK_QUESTIONS: Record<string, ExamQuestion[]> = {
  "exam-001": buildMockQuestions(20),
  "exam-002": buildMockQuestions(10),
  "exam-003": buildMockQuestions(40),
  "exam-004": buildMockQuestions(15),
};

export function buildMockResult(examId: string): ExamResult {
  const exam = MOCK_EXAMS.find((e) => e.id === examId);
  const examTitle = exam?.title ?? "Bài kiểm tra";
  const questions = MOCK_QUESTIONS[examId] ?? buildMockQuestions(10);
  const total = questions.length;
  const correctCount = Math.floor(total * 0.75);
  const score = Math.round((correctCount / total) * 100) / 10;
  return {
    examId,
    examTitle,
    score,
    totalQuestions: total,
    correctCount,
    incorrectCount: total - correctCount - 1,
    skippedCount: 1,
    timeTakenSeconds: (exam?.durationMinutes ?? 30) * 30,
    rank: 5,
    percentile: 82,
    passed: score >= 5,
    questionResults: questions.map((q, i) => {
      const selectedOptionId =
        i < total - 1
          ? i % 4 === 0
            ? "A"
            : i % 4 === 1
              ? "B"
              : i % 4 === 2
                ? "C"
                : "D"
          : null;
      return {
        questionId: q.id,
        index: q.index,
        text: q.text,
        options: q.options,
        selectedOptionId,
        correctOptionId: "A",
        isCorrect: i % 4 === 0 && i < total - 1,
      };
    }),
  };
}
