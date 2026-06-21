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
  {
    id: "exam-005",
    title: "Kiểm tra cuối kỳ - Ngữ văn",
    subjectId: "sub-005",
    subjectName: "Ngữ văn",
    subjectColor: "warning",
    teacherName: "Hoàng Thị Lan",
    description:
      "Bài kiểm tra kết hợp trắc nghiệm và tự luận về văn học Việt Nam.",
    durationMinutes: 90,
    totalQuestions: 28,
    deadline: "2026-06-20T23:59:00Z",
    status: "submitted_pending_essay",
    type: "multiple-choice",
    hasEssayQuestions: true,
    essayCount: 3,
    essayMax: 4,
    mcqScore: 6.25,
    mcqMax: 6,
    questionTypes: ["mcq", "essay"],
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
    type: "mcq" as const,
    text: `Câu hỏi số ${i + 1}: Đây là nội dung câu hỏi mẫu để kiểm tra khả năng hiển thị và cuộn trang của học sinh trong bài kiểm tra trắc nghiệm.`,
    options: OPTIONS_POOL,
  }));
}

/** Mixed exam: `mcqCount` MCQ questions followed by `essayCount` essay questions. */
export function buildMockMixedQuestions(
  mcqCount: number,
  essayCount: number,
): ExamQuestion[] {
  const mcqs: ExamQuestion[] = Array.from({ length: mcqCount }, (_, i) => ({
    id: `mq-${i + 1}`,
    index: i + 1,
    type: "mcq" as const,
    text: `Câu hỏi trắc nghiệm ${i + 1}: Chọn đáp án đúng nhất.`,
    options: OPTIONS_POOL,
  }));
  const essays: ExamQuestion[] = Array.from({ length: essayCount }, (_, i) => ({
    id: `eq-${i + 1}`,
    index: mcqCount + i + 1,
    type: "essay" as const,
    text: `Câu tự luận ${i + 1}: Hãy phân tích nội dung đoạn thơ sau và nêu cảm nhận của bạn.`,
    options: [],
  }));
  return [...mcqs, ...essays];
}

export const MOCK_QUESTIONS: Record<string, ExamQuestion[]> = {
  "exam-001": buildMockQuestions(20),
  "exam-002": buildMockQuestions(10),
  "exam-003": buildMockQuestions(40),
  "exam-004": buildMockQuestions(15),
  "exam-005": buildMockMixedQuestions(25, 3),
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
    status: "completed",
    score,
    totalQuestions: total,
    correctCount,
    incorrectCount: total - correctCount - 1,
    skippedCount: 1,
    timeTakenSeconds: (exam?.durationMinutes ?? 30) * 30,
    rank: 5,
    percentile: 82,
    passed: score >= 5,
    mcqScore: null,
    mcqMax: null,
    essayMax: null,
    essayCount: 0,
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
        type: q.type ?? "mcq",
        text: q.text,
        options: q.options,
        selectedOptionId,
        correctOptionId: "A",
        isCorrect: i % 4 === 0 && i < total - 1,
      };
    }),
  };
}

/** Result returned for the mixed exam (exam-005): MCQ auto-graded, essay pending. */
export const MOCK_PENDING_ESSAY_RESULT: ExamResult = {
  examId: "exam-005",
  examTitle: "Kiểm tra cuối kỳ - Ngữ văn",
  status: "submitted_pending_essay",
  score: null,
  passed: null,
  totalQuestions: 28,
  correctCount: 18,
  incorrectCount: 7,
  skippedCount: 0,
  timeTakenSeconds: 4200,
  rank: null,
  percentile: null,
  mcqScore: 6.25,
  mcqMax: 6,
  essayMax: 4,
  essayCount: 3,
  questionResults: [
    {
      questionId: "mq-1",
      index: 1,
      type: "mcq",
      text: "Câu hỏi trắc nghiệm 1: Chọn đáp án đúng nhất.",
      options: OPTIONS_POOL,
      selectedOptionId: "A",
      correctOptionId: "A",
      isCorrect: true,
    },
    {
      questionId: "mq-2",
      index: 2,
      type: "mcq",
      text: "Câu hỏi trắc nghiệm 2: Chọn đáp án đúng nhất.",
      options: OPTIONS_POOL,
      selectedOptionId: "B",
      correctOptionId: "A",
      isCorrect: false,
    },
    {
      questionId: "eq-1",
      index: 26,
      type: "essay",
      text: "Câu tự luận 1: Hãy phân tích nội dung đoạn thơ sau và nêu cảm nhận của bạn.",
      options: [],
      selectedOptionId: null,
      correctOptionId: null,
      isCorrect: null,
      textAnswer:
        "Đoạn thơ thể hiện tình yêu quê hương sâu nặng của tác giả qua những hình ảnh bình dị mà giàu sức gợi.",
    },
  ],
};
