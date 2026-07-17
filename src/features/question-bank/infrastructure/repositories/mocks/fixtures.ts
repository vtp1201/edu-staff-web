import type { QuestionEntity } from "../../../domain/entities/question.entity";

/** Seeded "current teacher" identity for the mock (mine-scope owner). */
export const MOCK_CURRENT_TEACHER_ID = "t-me";

/**
 * A PUBLISHED question owned by another teacher — attempting update/publish on
 * it exercises the mock's `forbidden-edit` ownership branch (spec §6.7).
 */
export const MOCK_FORBIDDEN_QUESTION_ID = "q-other-pub";

/**
 * Seed covering every badge-mapping path without a live BE (spec §6.7):
 * ≥1 DRAFT (own), ≥1 PUBLISHED (own), ≥1 PUBLISHED (other author, for search),
 * one of each questionType (ESSAY/SHORT_ANSWER/FILL_IN), one of each difficulty
 * (EASY/MEDIUM/HARD). DRAFTs omit `publishedAt` (key-absence, mirrors the wire);
 * some `expectedAnswer` are `null` (optional, FR-007).
 */
export const MOCK_QUESTIONS: QuestionEntity[] = [
  {
    id: "q1",
    tenantId: "tn-1",
    authorId: MOCK_CURRENT_TEACHER_ID,
    questionType: "ESSAY",
    subjectId: "sub-math",
    gradeLevel: "12",
    difficulty: "HARD",
    body: "Giải phương trình lượng giác: 2sin²x − 3sinx + 1 = 0, với x ∈ [0, 2π]. Trình bày rõ các bước biến đổi.",
    expectedAnswer:
      "Đặt t = sin(x), giải phương trình bậc hai theo t (t = 1 hoặc t = 1/2), sau đó tìm x trong khoảng đã cho.",
    status: "PUBLISHED",
    tags: ["Lượng giác", "Chương 1"],
    publishedAt: "2026-05-18T00:00:00Z",
    createdAt: "2026-05-10T00:00:00Z",
    updatedAt: "2026-05-18T00:00:00Z",
  },
  {
    id: "q2",
    tenantId: "tn-1",
    authorId: MOCK_CURRENT_TEACHER_ID,
    questionType: "SHORT_ANSWER",
    subjectId: "sub-math",
    gradeLevel: "11",
    difficulty: "EASY",
    body: "Đạo hàm của hàm số f(x) = x³ − 3x² + 2x − 1 tại x = 2 là bao nhiêu?",
    expectedAnswer: "2",
    status: "PUBLISHED",
    tags: ["Đạo hàm"],
    publishedAt: "2026-05-02T00:00:00Z",
    createdAt: "2026-05-02T00:00:00Z",
    updatedAt: "2026-05-02T00:00:00Z",
  },
  {
    id: "q3",
    tenantId: "tn-1",
    authorId: MOCK_CURRENT_TEACHER_ID,
    questionType: "FILL_IN",
    subjectId: "sub-math",
    gradeLevel: "10",
    difficulty: "MEDIUM",
    body: "Phương trình x² − 5x + 6 = 0 có hai nghiệm là x₁ = ___ và x₂ = ___.",
    expectedAnswer: "x₁ = 2, x₂ = 3",
    status: "DRAFT",
    tags: ["Phương trình"],
    createdAt: "2026-05-28T00:00:00Z",
    updatedAt: "2026-05-30T00:00:00Z",
  },
  {
    id: "q7",
    tenantId: "tn-1",
    authorId: MOCK_CURRENT_TEACHER_ID,
    questionType: "FILL_IN",
    subjectId: "sub-eng",
    gradeLevel: "10",
    difficulty: "EASY",
    body: "She ___ (go) to school every day.",
    expectedAnswer: null,
    status: "DRAFT",
    tags: ["Grammar", "Present simple"],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: MOCK_FORBIDDEN_QUESTION_ID,
    tenantId: "tn-1",
    authorId: "t-minh",
    questionType: "ESSAY",
    subjectId: "sub-phys",
    gradeLevel: "11",
    difficulty: "HARD",
    body: "Trình bày nguyên lý chồng chất điện trường và áp dụng tính cường độ điện trường tổng hợp tại một điểm do hai điện tích điểm gây ra.",
    expectedAnswer:
      "Vectơ cường độ điện trường tổng hợp bằng tổng vectơ của từng điện trường thành phần.",
    status: "PUBLISHED",
    tags: ["Điện trường"],
    publishedAt: "2026-05-20T00:00:00Z",
    createdAt: "2026-05-15T00:00:00Z",
    updatedAt: "2026-05-20T00:00:00Z",
  },
  {
    id: "q5",
    tenantId: "tn-1",
    authorId: "t-hoa",
    questionType: "SHORT_ANSWER",
    subjectId: "sub-chem",
    gradeLevel: "10",
    difficulty: "MEDIUM",
    body: "Cân bằng phương trình phản ứng: Fe + HCl → FeCl₂ + H₂. Hệ số của Fe là bao nhiêu?",
    expectedAnswer: "1",
    status: "PUBLISHED",
    tags: ["Oxi hoá khử"],
    publishedAt: "2026-05-10T00:00:00Z",
    createdAt: "2026-05-08T00:00:00Z",
    updatedAt: "2026-05-10T00:00:00Z",
  },
  // A DRAFT owned by another teacher — never surfaced in search (DRAFT), used to
  // exercise the not-visible single-GET gate + forbidden-edit ownership branch.
  {
    id: "q-other-draft",
    tenantId: "tn-1",
    authorId: "t-minh",
    questionType: "ESSAY",
    subjectId: "sub-phys",
    gradeLevel: "12",
    difficulty: "HARD",
    body: "Câu hỏi nháp của giáo viên khác (không hiển thị với bạn).",
    expectedAnswer: null,
    status: "DRAFT",
    tags: [],
    createdAt: "2026-06-02T00:00:00Z",
    updatedAt: "2026-06-02T00:00:00Z",
  },
];
