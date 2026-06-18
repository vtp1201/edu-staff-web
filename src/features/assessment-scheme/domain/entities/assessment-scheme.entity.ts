export type ColumnType = "TX" | "GK" | "CK";

export interface AssessmentColumn {
  id: string;
  type: ColumnType;
  label: string; // custom name e.g. "Thường xuyên", "Giữa kỳ", "Cuối kỳ"
  count: number; // number of assessments (>= 1)
  weight: number; // percentage 1-100; all weights in scheme must sum to 100
}

export interface AssessmentScheme {
  subjectId: string;
  yearLabel: string; // e.g. "2024-2025"
  columns: AssessmentColumn[];
}

export interface SubjectForGrade {
  id: string;
  name: string;
  gradeLevel: number;
  requiredAssessmentCount: number | null;
}

// TT22 preset (Thông tư 22/2021)
export const TT22_PRESET: AssessmentColumn[] = [
  { id: "tx", type: "TX", label: "Thường xuyên", count: 2, weight: 20 },
  { id: "gk", type: "GK", label: "Giữa kỳ", count: 1, weight: 30 },
  { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 50 },
];
