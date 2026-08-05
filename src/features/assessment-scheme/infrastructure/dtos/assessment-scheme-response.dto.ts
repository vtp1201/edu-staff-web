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

// ─── Subjects (real `GET /subjects`, US-E18.42 / BE US-177) ──────────────────

/**
 * Grade-scoped master ("chuẩn") fields. The Go response struct embeds
 * `MasterFieldsBody` by value with no `omitempty`, so `master` is ALWAYS present
 * on the wire and its numbers are `0` when unset — declared optional anyway so a
 * leaner payload cannot crash the mapper.
 */
export interface SubjectMasterFieldsDto {
  masterSyllabus?: string;
  periodCount?: number;
  learningOutcomes?: string;
  requiredExamCount?: number;
}

/**
 * Wire shape of one `SubjectResponse` item from `GET /core/api/v1/subjects`
 * (ground-truthed against `services/core/docs/openapi.yaml` +
 * `internal/curriculum/adapter/http/dto/subject.go`, US-E18.42).
 *
 * ⚠️ The pre-US-E18.42 shape here (`{ id, name, gradeLevel,
 * requiredAssessmentCount }`) was MOCK-ERA INVENTION — no endpoint ever emitted
 * it. The real payload keys the id as `subjectId` and nests the assessment count
 * as `master.requiredExamCount`, matching the subject-catalogue feature's own
 * `SubjectResponseDto` (US-E18.3), which reads the SAME endpoint.
 */
export interface SubjectListItemDto {
  subjectId: string;
  tenantId: string;
  subjectParentId: string;
  name: string;
  code: string | null;
  gradeLevel: number;
  master?: SubjectMasterFieldsDto;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}
