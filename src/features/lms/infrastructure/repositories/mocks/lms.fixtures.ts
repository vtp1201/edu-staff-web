import type {
  Assignment,
  AssignmentSummary,
} from "../../../domain/entities/assignment.entity";
import type { ClassSubjectRef } from "../../../domain/entities/class-subject-ref.entity";
import type {
  Course,
  CourseSummary,
} from "../../../domain/entities/course.entity";
import type { CourseItem } from "../../../domain/entities/course-item.entity";
import type { Lesson } from "../../../domain/entities/lesson.entity";
import type { Submission } from "../../../domain/entities/submission.entity";

/**
 * Mock seed for the `lms` feature (US-E24.1). Shaped to the REAL contract —
 * the same fields, the same nullability and the same enums the deployed
 * service returns — so switching `NEXT_PUBLIC_USE_MOCK` cannot change what the
 * screens are able to render. Content is modelled on the design bundle's
 * `design_src/edu/course-items.jsx` timeline (reference only, decision 0021).
 *
 * Seed data is DATA, not UI copy → deliberately not in `messages/{vi,en}.json`.
 */

/** The class the mock student is enrolled in — also what `resolveMyClassId()`
 *  returns in mock mode, so the two seeds cannot drift apart. */
export const MOCK_CLASS_ID = "cl-10a1";

/** The one DRAFT course in the seed — the teacher course tab's publish banner
 *  (US-E24.10) has no other way to be exercised in mock mode. It carries no
 *  items on purpose: a draft course is what a teacher sees before authoring. */
export const MOCK_DRAFT_COURSE_ID = "co-hoa-10";
export const MOCK_STUDENT_USER_ID = "u-student-1";

const TEACHER_ID = "u-teacher-1";

/** Fixed clock the relative windows below are written against. */
const NOW = "2026-05-02T00:00:00.000Z";

function iso(daysFromNow: number, hour = 7): string {
  const base = new Date(NOW);
  base.setUTCDate(base.getUTCDate() + daysFromNow);
  base.setUTCHours(hour, 0, 0, 0);
  return base.toISOString();
}

// ── courses ────────────────────────────────────────────────────────────────

export const MOCK_COURSES: Course[] = [
  {
    id: "co-toan-10",
    classId: MOCK_CLASS_ID,
    subjectId: "sub-toan",
    title: "Toán 10 — Đại số & Giải tích",
    description:
      "Chương IV–V: giới hạn, đạo hàm và ứng dụng khảo sát hàm số. Bài giảng, bài tập và tài liệu tham khảo theo tuần.",
    status: "PUBLISHED",
    isDefault: true,
    createdBy: TEACHER_ID,
    createdAt: iso(-60),
    updatedAt: iso(-2),
    publishedAt: iso(-58),
  },
  {
    id: "co-ly-10",
    classId: MOCK_CLASS_ID,
    subjectId: "sub-ly",
    title: "Vật lý 10 — Điện từ trường",
    description:
      "Cảm ứng điện từ, từ thông và ứng dụng. Kèm slide bài giảng và bài kiểm tra 15 phút.",
    status: "PUBLISHED",
    isDefault: true,
    createdBy: "u-teacher-2",
    createdAt: iso(-50),
    updatedAt: iso(-5),
    publishedAt: iso(-49),
  },
  {
    id: "co-van-10",
    classId: MOCK_CLASS_ID,
    subjectId: "sub-van",
    title: "Ngữ văn 10 — Truyện Kiều",
    description: "Đọc hiểu và phân tích các đoạn trích tiêu biểu.",
    status: "PUBLISHED",
    isDefault: false,
    createdBy: "u-teacher-3",
    createdAt: iso(-40),
    updatedAt: iso(-9),
    publishedAt: iso(-38),
  },
  {
    id: MOCK_DRAFT_COURSE_ID,
    classId: MOCK_CLASS_ID,
    subjectId: "sub-hoa",
    title: "Hoá học 10 — Bảng tuần hoàn",
    description: "",
    status: "DRAFT",
    isDefault: true,
    createdBy: TEACHER_ID,
    createdAt: iso(-3),
    updatedAt: iso(-3),
    publishedAt: null,
  },
];

/** The by-class list projection — narrower on purpose (no description/createdAt). */
export const MOCK_COURSE_SUMMARIES: CourseSummary[] = MOCK_COURSES.map((c) => ({
  id: c.id,
  classId: c.classId,
  subjectId: c.subjectId,
  title: c.title,
  status: c.status,
  isDefault: c.isDefault,
  createdBy: c.createdBy,
  updatedAt: c.updatedAt,
  publishedAt: c.publishedAt,
}));

/**
 * The class's curriculum offerings, keyed by class id — the GVCN subject
 * picker's options (US-E24.10).
 *
 * Deliberately WIDER than `MOCK_COURSES`: a real class offers subjects that
 * have no course yet, and the picker must be able to land on one so the
 * "no course for this subject" branch is reachable in mock mode.
 */
export const MOCK_CLASS_SUBJECTS: Record<string, ClassSubjectRef[]> = {
  [MOCK_CLASS_ID]: [
    { subjectId: "sub-toan", subjectName: "Toán" },
    { subjectId: "sub-ly", subjectName: "Vật lý" },
    { subjectId: "sub-van", subjectName: "Ngữ văn" },
    { subjectId: "sub-hoa", subjectName: "Hoá học" },
    { subjectId: "sub-sinh", subjectName: "Sinh học" },
  ],
};

// ── lessons ────────────────────────────────────────────────────────────────

export const MOCK_LESSONS: Lesson[] = [
  {
    id: "le-toan-1",
    courseId: "co-toan-10",
    title: "Bài giảng: Quy tắc tính đạo hàm",
    content:
      "Đạo hàm của một hàm số tại một điểm mô tả tốc độ biến thiên tức thời của hàm số tại điểm đó.\n\nCác quy tắc cơ bản gồm: đạo hàm của tổng, hiệu, tích, thương và quy tắc hàm hợp. Với mỗi quy tắc, hãy làm ít nhất ba ví dụ trước khi sang phần bài tập.\n\nGhi nhớ: (u·v)' = u'v + uv' và (u/v)' = (u'v − uv')/v².",
    position: 0,
    startAt: iso(-12),
    dueAt: null,
    createdAt: iso(-14),
    updatedAt: iso(-12),
  },
  {
    id: "le-toan-2",
    courseId: "co-toan-10",
    title: "Bài giảng: Ứng dụng đạo hàm khảo sát hàm số",
    content:
      "Khảo sát và vẽ đồ thị hàm số theo sáu bước: tập xác định, đạo hàm, bảng biến thiên, cực trị, tiệm cận và đồ thị.\n\nBài tập vận dụng nằm ở mục kế tiếp trong dòng thời gian khoá học.",
    position: 1,
    startAt: iso(-5),
    dueAt: null,
    createdAt: iso(-8),
    updatedAt: iso(-5),
  },
  {
    id: "le-ly-1",
    courseId: "co-ly-10",
    title: "Bài giảng: Điện từ trường",
    content:
      "Từ thông qua một mạch kín biến thiên sẽ sinh ra suất điện động cảm ứng.\n\nĐịnh luật Lenz cho biết chiều của dòng điện cảm ứng luôn chống lại nguyên nhân sinh ra nó.",
    position: 0,
    startAt: iso(-10),
    dueAt: null,
    createdAt: iso(-11),
    updatedAt: iso(-10),
  },
  {
    id: "le-van-1",
    courseId: "co-van-10",
    title: "Bài giảng: Truyện Kiều — Trao duyên",
    content:
      "Đoạn trích “Trao duyên” thể hiện bi kịch tình yêu và đức hi sinh của Thuý Kiều.\n\nChú ý phân tích hệ thống từ ngữ chỉ sự giằng xé nội tâm.",
    position: 0,
    startAt: iso(-9),
    dueAt: null,
    createdAt: iso(-10),
    updatedAt: iso(-9),
  },
];

// ── course items (the timeline) ────────────────────────────────────────────

/**
 * Covers ALL FOUR item types and ALL THREE states. Note the only
 * `UPCOMING_HIDDEN` row is an EXAM — that mirrors the contract exactly: a
 * student is never sent a hidden LESSON/ASSIGNMENT/DOCUMENT, but IS sent a
 * scheduled exam tile before it starts (US-231).
 */
export const MOCK_COURSE_ITEMS: CourseItem[] = [
  {
    id: "le-toan-1",
    courseId: "co-toan-10",
    itemType: "LESSON",
    refId: "le-toan-1",
    title: "Bài giảng: Quy tắc tính đạo hàm",
    description: null,
    url: null,
    position: 0,
    startAt: iso(-12),
    dueAt: null,
    state: "OPEN",
    createdBy: TEACHER_ID,
    createdAt: iso(-14),
    updatedAt: iso(-12),
    exam: null,
  },
  {
    id: "as-toan-11",
    courseId: "co-toan-10",
    itemType: "ASSIGNMENT",
    refId: "as-toan-11",
    title: "Bài tập Đạo hàm #11",
    description: null,
    url: null,
    position: 1,
    startAt: iso(-12),
    dueAt: iso(-8, 23),
    state: "CLOSED",
    createdBy: TEACHER_ID,
    createdAt: iso(-14),
    updatedAt: iso(-12),
    exam: null,
  },
  {
    id: "do-toan-1",
    courseId: "co-toan-10",
    itemType: "DOCUMENT",
    refId: null,
    title: "Tài liệu: Bảng công thức đạo hàm",
    description: "Bảng tổng hợp công thức đạo hàm cơ bản và mở rộng (PDF).",
    url: "https://example.edu.vn/tai-lieu/bang-cong-thuc-dao-ham.pdf",
    position: 2,
    startAt: iso(-12),
    dueAt: null,
    state: "OPEN",
    createdBy: TEACHER_ID,
    createdAt: iso(-14),
    updatedAt: iso(-12),
    exam: null,
  },
  {
    id: "le-toan-2",
    courseId: "co-toan-10",
    itemType: "LESSON",
    refId: "le-toan-2",
    title: "Bài giảng: Ứng dụng đạo hàm khảo sát hàm số",
    description: null,
    url: null,
    position: 3,
    startAt: iso(-5),
    dueAt: null,
    state: "OPEN",
    createdBy: TEACHER_ID,
    createdAt: iso(-8),
    updatedAt: iso(-5),
    exam: null,
  },
  {
    id: "as-toan-12",
    courseId: "co-toan-10",
    itemType: "ASSIGNMENT",
    refId: "as-toan-12",
    title: "Bài tập Khảo sát hàm số #12",
    description: null,
    url: null,
    position: 4,
    startAt: iso(-5),
    dueAt: iso(3, 23),
    state: "OPEN",
    createdBy: TEACHER_ID,
    createdAt: iso(-8),
    updatedAt: iso(-5),
    exam: null,
  },
  {
    id: "ex-toan-1",
    courseId: "co-toan-10",
    itemType: "EXAM",
    refId: "ex-toan-1",
    title: "Kiểm tra 1 tiết — Chương IV & V",
    description: null,
    url: null,
    position: 5,
    startAt: iso(6, 8),
    dueAt: iso(6, 9),
    // The ONE state a student may see on an EXAM before it starts.
    state: "UPCOMING_HIDDEN",
    createdBy: TEACHER_ID,
    createdAt: iso(-4),
    updatedAt: iso(-4),
    exam: {
      examId: "ex-toan-1",
      scheduledDate: iso(6, 8),
      durationMinutes: 45,
      examUrl: "https://example.edu.vn/exams/ex-toan-1",
    },
  },
  {
    id: "le-ly-1",
    courseId: "co-ly-10",
    itemType: "LESSON",
    refId: "le-ly-1",
    title: "Bài giảng: Điện từ trường",
    description: null,
    url: null,
    position: 0,
    startAt: iso(-10),
    dueAt: null,
    state: "OPEN",
    createdBy: "u-teacher-2",
    createdAt: iso(-11),
    updatedAt: iso(-10),
    exam: null,
  },
  {
    id: "do-ly-1",
    courseId: "co-ly-10",
    itemType: "DOCUMENT",
    refId: null,
    title: "Tài liệu: Slide Điện từ trường",
    description: "Slide bài giảng dùng trong tiết học.",
    url: "https://example.edu.vn/tai-lieu/slide-dien-tu-truong.pdf",
    position: 1,
    startAt: iso(-10),
    dueAt: null,
    state: "OPEN",
    createdBy: "u-teacher-2",
    createdAt: iso(-11),
    updatedAt: iso(-10),
    exam: null,
  },
  {
    id: "as-ly-3",
    courseId: "co-ly-10",
    itemType: "ASSIGNMENT",
    refId: "as-ly-3",
    title: "Bài tập Cảm ứng điện từ",
    description: null,
    url: null,
    position: 2,
    startAt: iso(-6),
    dueAt: iso(1, 23),
    state: "OPEN",
    createdBy: "u-teacher-2",
    createdAt: iso(-7),
    updatedAt: iso(-6),
    exam: null,
  },
  {
    id: "le-van-1",
    courseId: "co-van-10",
    itemType: "LESSON",
    refId: "le-van-1",
    title: "Bài giảng: Truyện Kiều — Trao duyên",
    description: null,
    url: null,
    position: 0,
    startAt: iso(-9),
    dueAt: null,
    state: "OPEN",
    createdBy: "u-teacher-3",
    createdAt: iso(-10),
    updatedAt: iso(-9),
    exam: null,
  },
  {
    id: "as-van-2",
    courseId: "co-van-10",
    itemType: "ASSIGNMENT",
    refId: "as-van-2",
    title: "Phân tích đoạn trích Trao duyên",
    description: null,
    url: null,
    position: 1,
    startAt: iso(-9),
    dueAt: iso(-1, 23),
    state: "CLOSED",
    createdBy: "u-teacher-3",
    createdAt: iso(-10),
    updatedAt: iso(-9),
    exam: null,
  },
];

// ── assignments ────────────────────────────────────────────────────────────

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: "as-toan-11",
    classId: MOCK_CLASS_ID,
    subjectId: "sub-toan",
    courseId: "co-toan-10",
    title: "Bài tập Đạo hàm #11",
    instructions:
      "Làm các bài 1–8 trang 176 SGK. Trình bày rõ từng bước áp dụng quy tắc.",
    startAt: iso(-12),
    dueAt: iso(-8, 23),
    state: "CLOSED",
    createdBy: TEACHER_ID,
    createdAt: iso(-14),
    updatedAt: iso(-12),
  },
  {
    id: "as-toan-12",
    classId: MOCK_CLASS_ID,
    subjectId: "sub-toan",
    courseId: "co-toan-10",
    title: "Bài tập Khảo sát hàm số #12",
    instructions:
      "Khảo sát và vẽ đồ thị ba hàm số trong phiếu bài tập. Nộp bản trình bày dạng văn bản.",
    startAt: iso(-5),
    dueAt: iso(3, 23),
    state: "OPEN",
    createdBy: TEACHER_ID,
    createdAt: iso(-8),
    updatedAt: iso(-5),
  },
  {
    id: "as-ly-3",
    classId: MOCK_CLASS_ID,
    subjectId: "sub-ly",
    courseId: "co-ly-10",
    title: "Bài tập Cảm ứng điện từ",
    instructions: "Giải thích hiện tượng trong ba tình huống được mô tả.",
    startAt: iso(-6),
    dueAt: iso(1, 23),
    state: "OPEN",
    createdBy: "u-teacher-2",
    createdAt: iso(-7),
    updatedAt: iso(-6),
  },
  {
    id: "as-van-2",
    classId: MOCK_CLASS_ID,
    subjectId: "sub-van",
    courseId: "co-van-10",
    title: "Phân tích đoạn trích Trao duyên",
    instructions: null,
    startAt: iso(-9),
    dueAt: iso(-1, 23),
    state: "CLOSED",
    createdBy: "u-teacher-3",
    createdAt: iso(-10),
    updatedAt: iso(-9),
  },
];

/** By-class list projection — no `instructions`, no `state`, no `createdAt`. */
export const MOCK_ASSIGNMENT_SUMMARIES: AssignmentSummary[] =
  MOCK_ASSIGNMENTS.map((a) => ({
    id: a.id,
    classId: a.classId,
    subjectId: a.subjectId,
    courseId: a.courseId,
    title: a.title,
    dueAt: a.dueAt,
    createdBy: a.createdBy,
    updatedAt: a.updatedAt,
  }));

// ── submissions ────────────────────────────────────────────────────────────

/** The student has already submitted exactly one of the four (single attempt). */
export const MOCK_SUBMISSIONS: Submission[] = [
  {
    assignmentId: "as-toan-11",
    studentUserId: MOCK_STUDENT_USER_ID,
    content:
      "Bài 1: y' = 3x² − 4x + 1.\nBài 2: áp dụng quy tắc thương, y' = (2x·(x+1) − x²)/(x+1)².\n(…)",
    status: "SUBMITTED",
    submittedAt: iso(-9, 20),
  },
];
