/**
 * Wire DTOs for the `core` grade-scale & assessment-scheme config endpoints
 * (US-E18.7, ground-truthed against `services/core/docs/openapi.yaml`, ADR 0053).
 *
 * Numeric grade-scale fields are wire **strings** (e.g. "10.0"); assessment
 * column `coefficient`/`ordinal` are JSON numbers. Request ≠ Response shapes.
 */

// ─── Grade scale ─────────────────────────────────────────────────────────────

export type WireScaleType = "HE_10" | "HE_4_GPA" | "LETTER_ABCD";

export interface WireLetterGrade {
  letter: string;
  minScore?: string;
  maxScore?: string;
}

export interface GradeScaleResponseDto {
  tenantId: string;
  scaleType: WireScaleType;
  minValue?: string;
  maxValue?: string;
  letterGrades?: WireLetterGrade[];
  effectiveFrom: string; // ISO date-time
  updatedAt: string;
}

export interface SetGradeScaleRequestDto {
  scaleType: WireScaleType;
  minValue?: string;
  maxValue?: string;
  letterGrades?: WireLetterGrade[];
  effectiveFrom: string;
}

// ─── Assessment scheme ───────────────────────────────────────────────────────

export type WireColumnType = "TX" | "GK" | "CK";

export interface AssessmentColumnResponseDto {
  columnId: string;
  name: string;
  columnType: WireColumnType;
  coefficient: number;
  ordinal: number;
}

export interface AssessmentSchemeResponseDto {
  tenantId: string;
  subjectId: string;
  academicYearLabel: string;
  termId: string;
  columns: AssessmentColumnResponseDto[];
  updatedAt: string;
}

export interface AssessmentColumnRequestDto {
  name: string;
  columnType: WireColumnType;
  coefficient: number;
  ordinal: number;
}

export interface SetAssessmentSchemeRequestDto {
  columns: AssessmentColumnRequestDto[];
}

// ─── Subjects (UNCHANGED — still mock-first, out of US-E18.7 scope) ───────────

export interface SubjectForGradeDto {
  id: string;
  name: string;
  gradeLevel: number;
  requiredAssessmentCount: number | null;
}
