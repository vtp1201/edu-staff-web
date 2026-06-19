import type { ExamBankDetail } from "../../../domain/entities/exam-bank-detail.entity";
import type { ExamBankQuestion } from "../../../domain/entities/exam-bank-question.entity";

// Mock/seed data — not i18n (rule: i18n.md §"KHÔNG phải i18n").

export const MOCK_SUBJECTS = [
  { id: "s-math", name: "Toán" },
  { id: "s-physics", name: "Vật lý" },
  { id: "s-literature", name: "Ngữ văn" },
];

export const MOCK_TEACHERS = [
  { id: "u-teacher-1", name: "Nguyễn Văn An" },
  { id: "u-teacher-2", name: "Trần Thị Bình" },
];

function q(
  id: string,
  index: number,
  content: string,
  subjectId: string,
  correctOptionId: string,
  options: [string, string, string, string],
  difficulty: ExamBankQuestion["difficulty"] = "medium",
): ExamBankQuestion {
  return {
    id,
    index,
    content,
    options: [
      { id: "A", text: options[0] },
      { id: "B", text: options[1] },
      { id: "C", text: options[2] },
      { id: "D", text: options[3] },
    ],
    correctOptionId,
    difficulty,
    subjectId,
  };
}

export const MOCK_EXAM_BANK: ExamBankDetail[] = [
  {
    id: "e-1",
    title: "Kiểm tra 15 phút - Đại số",
    subjectId: "s-math",
    subjectName: "Toán",
    teacherId: "u-teacher-1",
    teacherName: "Nguyễn Văn An",
    totalQuestions: 3,
    durationMinutes: 15,
    maxAttempts: 1,
    status: "draft",
    createdAt: "2026-06-10",
    questions: [
      q("e1-q1", 0, "Nghiệm của phương trình x + 2 = 5 là?", "s-math", "B", [
        "1",
        "3",
        "5",
        "7",
      ]),
      q("e1-q2", 1, "Giá trị của 2² + 3² bằng?", "s-math", "C", [
        "10",
        "12",
        "13",
        "25",
      ]),
      q("e1-q3", 2, "Số nào là số nguyên tố?", "s-math", "A", [
        "7",
        "9",
        "15",
        "21",
      ]),
    ],
  },
  {
    id: "e-2",
    title: "Đề ôn tập Vật lý chương 1",
    subjectId: "s-physics",
    subjectName: "Vật lý",
    teacherId: "u-teacher-1",
    teacherName: "Nguyễn Văn An",
    totalQuestions: 2,
    durationMinutes: 30,
    maxAttempts: 2,
    status: "draft",
    createdAt: "2026-06-12",
    questions: [
      q(
        "e2-q1",
        0,
        "Đơn vị đo lực trong hệ SI là?",
        "s-physics",
        "B",
        ["Joule", "Newton", "Watt", "Pascal"],
        "easy",
      ),
      q(
        "e2-q2",
        1,
        "Vận tốc trung bình được tính bằng?",
        "s-physics",
        "A",
        [
          "Quãng đường / thời gian",
          "Thời gian / quãng đường",
          "Lực / khối lượng",
          "Khối lượng × gia tốc",
        ],
        "medium",
      ),
    ],
  },
  {
    id: "e-3",
    title: "Trắc nghiệm Ngữ văn - Truyện Kiều",
    subjectId: "s-literature",
    subjectName: "Ngữ văn",
    teacherId: "u-teacher-2",
    teacherName: "Trần Thị Bình",
    totalQuestions: 2,
    durationMinutes: 20,
    maxAttempts: 1,
    status: "draft",
    createdAt: "2026-06-14",
    questions: [
      q(
        "e3-q1",
        0,
        "Tác giả của Truyện Kiều là ai?",
        "s-literature",
        "C",
        ["Nguyễn Trãi", "Hồ Xuân Hương", "Nguyễn Du", "Nguyễn Khuyến"],
        "easy",
      ),
      q(
        "e3-q2",
        1,
        "Truyện Kiều được viết theo thể thơ nào?",
        "s-literature",
        "D",
        ["Thất ngôn bát cú", "Ngũ ngôn", "Song thất lục bát", "Lục bát"],
        "medium",
      ),
    ],
  },
  {
    id: "e-4",
    title: "Đề thi giữa kỳ - Hình học",
    subjectId: "s-math",
    subjectName: "Toán",
    teacherId: "u-teacher-1",
    teacherName: "Nguyễn Văn An",
    totalQuestions: 2,
    durationMinutes: 45,
    maxAttempts: 1,
    status: "published",
    createdAt: "2026-06-05",
    questions: [
      q(
        "e4-q1",
        0,
        "Tổng ba góc trong một tam giác bằng?",
        "s-math",
        "C",
        ["90°", "120°", "180°", "360°"],
        "easy",
      ),
      q(
        "e4-q2",
        1,
        "Định lý Pytago áp dụng cho tam giác nào?",
        "s-math",
        "B",
        ["Tam giác đều", "Tam giác vuông", "Tam giác cân", "Tam giác tù"],
        "medium",
      ),
    ],
  },
  {
    id: "e-5",
    title: "Đề thi cuối kỳ - Vật lý",
    subjectId: "s-physics",
    subjectName: "Vật lý",
    teacherId: "u-teacher-2",
    teacherName: "Trần Thị Bình",
    totalQuestions: 2,
    durationMinutes: 60,
    maxAttempts: 1,
    status: "published",
    createdAt: "2026-06-08",
    questions: [
      q(
        "e5-q1",
        0,
        "Công thức tính công cơ học là?",
        "s-physics",
        "A",
        ["A = F × s", "A = m × v", "A = P × t", "A = F / s"],
        "medium",
      ),
      q(
        "e5-q2",
        1,
        "Đơn vị của công suất là?",
        "s-physics",
        "D",
        ["Joule", "Newton", "Pascal", "Watt"],
        "easy",
      ),
    ],
  },
];
