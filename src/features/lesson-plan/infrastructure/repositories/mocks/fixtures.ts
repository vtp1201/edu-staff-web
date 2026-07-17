import type { LessonPlanEntity } from "../../../domain/entities/lesson-plan.entity";

/** Seeded "current teacher" identity for the mock (mine-scope owner). */
export const MOCK_CURRENT_TEACHER_ID = "t-me";

/** Subject ids match the design mockup + a stable mock subject-catalogue set. */
export const MOCK_LESSON_PLAN_SUBJECTS: { id: string; name: string }[] = [
  { id: "sub-math", name: "Toán học" },
  { id: "sub-phys", name: "Vật Lý" },
  { id: "sub-chem", name: "Hoá Học" },
  { id: "sub-lit", name: "Ngữ Văn" },
];

const TITLE_200 = "Giáo án — ".concat("x".repeat(200 - "Giáo án — ".length));
const TEN_TAGS = Array.from({ length: 10 }, (_, i) => `Thẻ ${i + 1}`);

/**
 * Seed: mixed DRAFT (current teacher) + PUBLISHED (own + other teachers) across
 * 3 subjects; one DRAFT at the 10-tag boundary; one at a 200-char title; DRAFT
 * plans omit `publishedAt` entirely (key-absence, mirrors the wire).
 */
export const MOCK_LESSON_PLANS: LessonPlanEntity[] = [
  {
    planId: "lp-1",
    teacherId: MOCK_CURRENT_TEACHER_ID,
    subjectId: "sub-math",
    gradeLevel: "11",
    title: "Giáo án — Đạo hàm và ý nghĩa hình học",
    objectives: "Học sinh nắm định nghĩa đạo hàm và ý nghĩa hình học.",
    contentOutline: "1) Định nghĩa. 2) Ý nghĩa hình học. 3) Tiếp tuyến.",
    activities: "Khởi động 5' — Kiến thức 25' — Luyện tập 15'.",
    assessmentMethod: "Hỏi đáp nhanh + 3 bài tập viết phương trình tiếp tuyến.",
    status: "PUBLISHED",
    tags: ["Chương 5", "CT2018"],
    publishedAt: "2026-05-18T00:00:00Z",
    createdAt: "2026-05-10T00:00:00Z",
    updatedAt: "2026-05-18T00:00:00Z",
  },
  {
    planId: "lp-2",
    teacherId: MOCK_CURRENT_TEACHER_ID,
    subjectId: "sub-math",
    gradeLevel: "12",
    title: "Giáo án — Khảo sát hàm số bậc ba",
    objectives: "Học sinh khảo sát và vẽ đồ thị hàm số bậc ba.",
    contentOutline: "1) Tập xác định. 2) Sự biến thiên. 3) Đồ thị.",
    activities: "",
    assessmentMethod: "",
    status: "DRAFT",
    tags: ["Chương 1"],
    // publishedAt omitted — DRAFT
    createdAt: "2026-05-28T00:00:00Z",
    updatedAt: "2026-05-30T00:00:00Z",
  },
  {
    planId: "lp-3",
    teacherId: MOCK_CURRENT_TEACHER_ID,
    subjectId: "sub-math",
    gradeLevel: "11",
    // 200-char title boundary demo.
    title: TITLE_200,
    objectives: "",
    contentOutline: "",
    activities: "",
    assessmentMethod: "",
    status: "DRAFT",
    // 10-tag boundary demo.
    tags: TEN_TAGS,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    planId: "lp-4",
    teacherId: "t-minh",
    subjectId: "sub-phys",
    gradeLevel: "11",
    title: "Giáo án — Điện trường và cường độ điện trường",
    objectives: "Học sinh hiểu khái niệm điện trường.",
    contentOutline: "1) Khái niệm. 2) Cường độ. 3) Chồng chất.",
    activities: "Thí nghiệm mô phỏng 10' — Giảng 20' — Nhóm 15'.",
    assessmentMethod: "Phiếu bài tập nhóm chấm thang 10.",
    status: "PUBLISHED",
    tags: ["Chương 3"],
    publishedAt: "2026-05-12T00:00:00Z",
    createdAt: "2026-05-05T00:00:00Z",
    updatedAt: "2026-05-12T00:00:00Z",
  },
  {
    planId: "lp-5",
    teacherId: "t-hoa",
    subjectId: "sub-chem",
    gradeLevel: "10",
    title: "Giáo án — Phản ứng oxi hoá khử",
    objectives: "Học sinh cân bằng phương trình oxi hoá khử.",
    contentOutline: "1) Chất oxi hoá — khử. 2) Thăng bằng electron.",
    activities: "Ví dụ mẫu 10' — Luyện tập cặp 20'.",
    assessmentMethod: "Kiểm tra 15' cuối giờ.",
    status: "PUBLISHED",
    tags: ["Thực hành"],
    publishedAt: "2026-05-08T00:00:00Z",
    createdAt: "2026-05-02T00:00:00Z",
    updatedAt: "2026-05-08T00:00:00Z",
  },
  {
    planId: "lp-6",
    teacherId: "t-bao",
    subjectId: "sub-phys",
    gradeLevel: "11",
    title: "Giáo án — Định luật Ôm cho toàn mạch",
    objectives: "Học sinh vận dụng định luật Ôm cho toàn mạch.",
    contentOutline: "1) Suất điện động. 2) Định luật Ôm. 3) Bài tập.",
    activities: "Nhắc lại 5' — Kiến thức 25' — Vận dụng 15'.",
    assessmentMethod: "Bài tập trắc nghiệm 10 câu.",
    status: "PUBLISHED",
    tags: ["Chương 2"],
    publishedAt: "2026-05-20T00:00:00Z",
    createdAt: "2026-05-14T00:00:00Z",
    updatedAt: "2026-05-20T00:00:00Z",
  },
  // A DRAFT owned by another teacher — used to verify browse never leaks DRAFTs.
  {
    planId: "lp-7",
    teacherId: "t-minh",
    subjectId: "sub-phys",
    gradeLevel: "12",
    title: "Giáo án — Cảm ứng điện từ (nháp)",
    objectives: "",
    contentOutline: "",
    activities: "",
    assessmentMethod: "",
    status: "DRAFT",
    tags: [],
    createdAt: "2026-06-02T00:00:00Z",
    updatedAt: "2026-06-02T00:00:00Z",
  },
];
