import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { StudentScoreRowDto } from "../../dtos/grades-response.dto";

export const MOCK_CS_ID = "cs-001";
export const MOCK_TERM = "HK1";

export const MOCK_SCHEME: AssessmentScheme = {
  subjectId: "subj-toan-10",
  yearLabel: "2024-2025",
  columns: [
    { id: "tx", type: "TX", label: "Thường xuyên", count: 2, weight: 20 },
    { id: "gk", type: "GK", label: "Giữa kỳ", count: 1, weight: 30 },
    { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 50 },
  ],
};

export interface MockClassSubject {
  id: string;
  label: string;
}

export const MOCK_CLASS_SUBJECTS: MockClassSubject[] = [
  { id: "cs-001", label: "10A1 — Toán" },
  { id: "cs-002", label: "10A2 — Toán" },
  { id: "cs-003", label: "11B1 — Toán" },
];

export const MOCK_ROWS: StudentScoreRowDto[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: { tx: 8, gk: 7.5, ck: 9 },
    average: null,
    publishStatus: "DRAFT",
  },
  {
    studentId: "hs-002",
    studentName: "Trần Thị Bình",
    studentCode: "HS002",
    scores: { tx: 4, gk: 5, ck: null },
    average: null,
    publishStatus: "DRAFT",
  },
  {
    studentId: "hs-003",
    studentName: "Lê Hoàng Cường",
    studentCode: "HS003",
    scores: { tx: 9, gk: 9.5, ck: 10 },
    average: null,
    publishStatus: "DRAFT",
  },
];
