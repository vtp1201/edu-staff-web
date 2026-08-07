export type ColumnType = "TX" | "GK" | "CK";

/** BE cap on a column's `requiredCount` (US-189: integer 1..100). */
export const MAX_REQUIRED_COUNT = 100;

export interface AssessmentColumn {
  id: string;
  type: ColumnType;
  label: string; // custom name e.g. "Thường xuyên", "Giữa kỳ", "Cuối kỳ"
  /**
   * Expected number of assessments — the wire's optional `requiredCount`
   * (US-E18.49 / BE US-189). `null` means UNSET: the BE omits the field
   * entirely when unspecified, and that absence is a real state, never a
   * default of 1.
   *
   * ⚠️ Display metadata only — the backend does NOT enforce it against
   * recorded grade entries. UI copy must not imply enforcement.
   */
  count: number | null;
  weight: number; // percentage 1-100; all weights in scheme must sum to 100
}

export interface AssessmentScheme {
  subjectId: string;
  yearLabel: string; // e.g. "2024-2025"
  termId: string; // e.g. "HK1" — wire path/response field (US-E18.7)
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
