import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { ClassSubjectTermKey } from "../../../domain/entities/class-subject-term-key.entity";
import type { StudentScoreRow } from "../../../domain/entities/grade-sheet.entity";

export const MOCK_KEY: ClassSubjectTermKey = {
  classId: "class-001",
  subjectId: "subj-toan-10",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

export const MOCK_SCHEME: AssessmentScheme = {
  subjectId: "subj-toan-10",
  yearLabel: "2024-2025",
  termId: "HK1",
  columns: [
    { id: "tx", type: "TX", label: "Thường xuyên", count: 2, weight: 20 },
    { id: "gk", type: "GK", label: "Giữa kỳ", count: 1, weight: 30 },
    { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 50 },
  ],
};

/**
 * Class-subject picker fixture (US-E18.12, ADR 0054) — mock-mode fallback for
 * `resolve-my-grade-subjects.ts`, shaped like the real composed
 * `GradeSubjectOption` (no more invented `csId`).
 */
export interface MockGradeSubject {
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;
}

export const MOCK_GRADE_SUBJECT_OPTIONS: MockGradeSubject[] = [
  {
    classId: "class-001",
    subjectId: "subj-toan-10",
    className: "10A1",
    subjectName: "Toán",
  },
  {
    classId: "class-002",
    subjectId: "subj-toan-10",
    className: "10A2",
    subjectName: "Toán",
  },
  {
    classId: "class-003",
    subjectId: "subj-toan-11",
    className: "11B1",
    subjectName: "Toán",
  },
];

/** Per-cell status rows (US-E18.12 — status lives per cell, not per row). */
export const MOCK_ROWS: StudentScoreRow[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: {
      tx: { value: 8, status: "DRAFT" },
      gk: { value: 7.5, status: "DRAFT" },
      ck: { value: 9, status: "DRAFT" },
    },
    average: null,
  },
  {
    studentId: "hs-002",
    studentName: "Trần Thị Bình",
    studentCode: "HS002",
    scores: {
      tx: { value: 4, status: "DRAFT" },
      gk: { value: 5, status: "DRAFT" },
      ck: { value: null, status: "DRAFT" },
    },
    average: null,
  },
  {
    studentId: "hs-003",
    studentName: "Lê Hoàng Cường",
    studentCode: "HS003",
    scores: {
      tx: { value: 9, status: "DRAFT" },
      gk: { value: 9.5, status: "DRAFT" },
      ck: { value: 10, status: "DRAFT" },
    },
    average: null,
  },
];
