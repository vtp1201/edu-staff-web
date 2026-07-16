import type {
  ChildSummary,
  GradeBookRow,
} from "../../../domain/entities/grade-book.entity";

export const MOCK_GRADE_BOOK_CLASS_ID = "class-001";
export const MOCK_GRADE_BOOK_SUBJECT_ID = "subj-toan-10";
export const MOCK_GRADE_BOOK_TERM = "HK1";
export const MOCK_GRADE_BOOK_YEAR = "2025-2026";
export const MOCK_GRADE_BOOK_CLASS_NAME = "10A1";
export const MOCK_GRADE_BOOK_SUBJECT_NAME = "Toán";

/**
 * 5 students with all scores filled, mixed conduct grades, all PUBLISHED.
 * Weighted averages (scheme tx 20% / gk 30% / ck 50%):
 *   An   8*20 + 8*30 + 9*50  = 850 / 100 = 8.5  (gioi)
 *   Bình 3*20 + 4*30 + 4.6*50 = 410 / 100 = 4.1 (yeu)   → rounds to 4.1
 *   Cường 9.4*20 + 9.6*30 + 9.9*50 = 970 / 100 = 9.7   (xuat-sac)
 *   Dũng 6*20 + 6.6*30 + 7.2*50 = 678 / 100 = 6.8       (kha)
 *   Em   5*20 + 5*30 + 5*50   = 500 / 100 = 5.0          (trung-binh)
 */
export const MOCK_GRADE_BOOK_ROWS: GradeBookRow[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: {
      tx: { value: 8, status: "PUBLISHED" },
      gk: { value: 8, status: "PUBLISHED" },
      ck: { value: 9, status: "PUBLISHED" },
    },
    average: 8.5,
    conductGrade: "Tot",
  },
  {
    studentId: "hs-002",
    studentName: "Trần Thị Bình",
    studentCode: "HS002",
    scores: {
      tx: { value: 3, status: "PUBLISHED" },
      gk: { value: 4, status: "PUBLISHED" },
      ck: { value: 4.6, status: "PUBLISHED" },
    },
    average: 4.1,
    conductGrade: "TB",
  },
  {
    studentId: "hs-003",
    studentName: "Lê Hoàng Cường",
    studentCode: "HS003",
    scores: {
      tx: { value: 9.4, status: "PUBLISHED" },
      gk: { value: 9.6, status: "PUBLISHED" },
      ck: { value: 9.9, status: "PUBLISHED" },
    },
    average: 9.7,
    conductGrade: "Tot",
  },
  {
    studentId: "hs-004",
    studentName: "Phạm Tiến Dũng",
    studentCode: "HS004",
    scores: {
      tx: { value: 6, status: "PUBLISHED" },
      gk: { value: 6.6, status: "PUBLISHED" },
      ck: { value: 7.2, status: "PUBLISHED" },
    },
    average: 6.8,
    conductGrade: "Kha",
  },
  {
    studentId: "hs-005",
    studentName: "Vũ Thị Em",
    studentCode: "HS005",
    scores: {
      tx: { value: 5, status: "PUBLISHED" },
      gk: { value: 5, status: "PUBLISHED" },
      ck: { value: 5, status: "PUBLISHED" },
    },
    average: 5.0,
    conductGrade: "Yeu",
  },
];

// ─── US-E13.7 — parent child-switcher fixtures (permanently mock, ADR 0054) ──

/** Children linked to the signed-in parent viewer. */
export const MOCK_VIEWER_CHILDREN: ChildSummary[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    className: "11A2",
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "c2",
    name: "Nguyễn Thu Hà",
    className: "8B1",
    avatar: "NH",
    color: "success",
  },
];

/** child 0 — 11A2; reuses the existing roster rows. */
export const MOCK_GRADE_BOOK_ROWS_CHILD_0 = MOCK_GRADE_BOOK_ROWS;

/** child 1 — 8B1; 5 subjects with slightly different data. */
export const MOCK_GRADE_BOOK_ROWS_CHILD_1: GradeBookRow[] = [
  {
    studentId: "c2-hs-001",
    studentName: "Nguyễn Thu Hà",
    studentCode: "HS201",
    scores: {
      tx: { value: 7, status: "PUBLISHED" },
      gk: { value: 7.5, status: "PUBLISHED" },
      ck: { value: 8, status: "PUBLISHED" },
    },
    average: 7.7,
    conductGrade: "Kha",
  },
  {
    studentId: "c2-hs-002",
    studentName: "Phạm Minh Đức",
    studentCode: "HS202",
    scores: {
      tx: { value: 5, status: "PUBLISHED" },
      gk: { value: 5.5, status: "PUBLISHED" },
      ck: { value: 6, status: "PUBLISHED" },
    },
    average: 5.7,
    conductGrade: "TB",
  },
  {
    studentId: "c2-hs-003",
    studentName: "Trần Anh Tú",
    studentCode: "HS203",
    scores: {
      tx: { value: 9, status: "PUBLISHED" },
      gk: { value: 9, status: "PUBLISHED" },
      ck: { value: 9.5, status: "PUBLISHED" },
    },
    average: 9.2,
    conductGrade: "Tot",
  },
  {
    studentId: "c2-hs-004",
    studentName: "Lê Thị Mai",
    studentCode: "HS204",
    scores: {
      tx: { value: 4, status: "DRAFT" },
      gk: { value: 4, status: "DRAFT" },
      ck: { value: 4.5, status: "DRAFT" },
    },
    average: 4.2,
    conductGrade: "TB",
  },
  {
    studentId: "c2-hs-005",
    studentName: "Vũ Hoàng Nam",
    studentCode: "HS205",
    scores: {
      tx: { value: 6.5, status: "PUBLISHED" },
      gk: { value: 7, status: "PUBLISHED" },
      ck: { value: 7.5, status: "PUBLISHED" },
    },
    average: 7.1,
    conductGrade: "Kha",
  },
];
