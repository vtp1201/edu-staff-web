import type { SubjectStatus } from "../../domain/entities/subject.entity";

/** Forward-compatible `{type, ref}` reference (core ADR 0037). */
export interface ResourceRefDto {
  type: string;
  ref: string;
}

/**
 * Grade-scoped master ("chuẩn") fields — all optional on the wire. The web
 * entity flattens these to top-level fields with defaults (null numbers, ""
 * strings); `learningOutcomes`/`requiredExamCount` rename to the entity's
 * `outcomeTargets`/`requiredAssessmentCount`.
 */
export interface MasterFieldsDto {
  masterSyllabus?: string;
  periodCount?: number;
  learningOutcomes?: string;
  requiredExamCount?: number;
  exerciseBankRef?: ResourceRefDto;
  examBankRef?: ResourceRefDto;
}

/**
 * Wire shape of `SubjectResponse` (core `openapi.yaml`, US-E18.3).
 * - id is `subjectId`, parent is `subjectParentId`;
 * - master fields nested under `master` (may be absent);
 * - `inUse` is NOT on the wire (derived `false` in the mapper — the archive
 *   409 `SUBJECT_IN_USE` remains the real guard; see repository/story §7).
 */
export interface SubjectResponseDto {
  subjectId: string;
  tenantId: string;
  subjectParentId: string;
  name: string;
  code: string | null;
  gradeLevel: number;
  master?: MasterFieldsDto;
  status: SubjectStatus;
  createdAt: string;
  updatedAt: string;
}

/** Wire body for `POST /subjects` (`CreateSubjectRequest`). */
export interface CreateSubjectRequestDto {
  subjectParentId: string;
  name: string;
  code?: string;
  gradeLevel: number;
  master?: MasterFieldsDto;
}

/**
 * Wire body for `PATCH /subjects/{id}` (`UpdateSubjectRequest`).
 * `subjectParentId` + `gradeLevel` are immutable; `name` is required.
 */
export interface UpdateSubjectRequestDto {
  name: string;
  code?: string;
  master?: MasterFieldsDto;
}
