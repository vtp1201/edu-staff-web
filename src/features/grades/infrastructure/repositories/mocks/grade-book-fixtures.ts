import type { GradeBookRowDto } from "../../dtos/grade-book-response.dto";

export const MOCK_GRADE_BOOK_CS_ID = "cs-001";
export const MOCK_GRADE_BOOK_TERM = "HK1";
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
export const MOCK_GRADE_BOOK_ROWS: GradeBookRowDto[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: { tx: 8, gk: 8, ck: 9 },
    average: 8.5,
    conductGrade: "Tot",
    publishStatus: "PUBLISHED",
  },
  {
    studentId: "hs-002",
    studentName: "Trần Thị Bình",
    studentCode: "HS002",
    scores: { tx: 3, gk: 4, ck: 4.6 },
    average: 4.1,
    conductGrade: "TB",
    publishStatus: "PUBLISHED",
  },
  {
    studentId: "hs-003",
    studentName: "Lê Hoàng Cường",
    studentCode: "HS003",
    scores: { tx: 9.4, gk: 9.6, ck: 9.9 },
    average: 9.7,
    conductGrade: "Tot",
    publishStatus: "PUBLISHED",
  },
  {
    studentId: "hs-004",
    studentName: "Phạm Tiến Dũng",
    studentCode: "HS004",
    scores: { tx: 6, gk: 6.6, ck: 7.2 },
    average: 6.8,
    conductGrade: "Kha",
    publishStatus: "PUBLISHED",
  },
  {
    studentId: "hs-005",
    studentName: "Vũ Thị Em",
    studentCode: "HS005",
    scores: { tx: 5, gk: 5, ck: 5 },
    average: 5.0,
    conductGrade: "Yeu",
    publishStatus: "PUBLISHED",
  },
];
