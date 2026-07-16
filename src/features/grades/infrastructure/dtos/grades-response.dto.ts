/**
 * Ground-truthed against `core/docs/openapi.yaml` (`GradeEntry`/`GradeReport`
 * tags, ~L2167-2609) — US-E18.12, ADR 0054. camelCase wire fields.
 */

/** `PUT .../columns/{columnId}` / `.../submit` / `.../approve` response. */
export interface GradeEntryResponseDto {
  classId: string;
  subjectId: string;
  termId: string;
  studentMemberId: string;
  columnId: string;
  value: string; // wire sends the raw value as a string
  status: "DRAFT" | "SUBMITTED" | "PENDING_APPROVAL" | "PUBLISHED" | "LOCKED";
  enteredBy: string;
  enteredAt: string;
  submittedAt?: string;
  updatedAt: string;
}

export interface GradeColumnResponseDto {
  columnId: string;
  name: string;
  columnType: string;
  coefficient: number;
  ordinal: number;
}

export interface StudentGradeRowResponseDto {
  studentMemberId: string;
  entries: GradeEntryResponseDto[];
  termAverage: string; // "" for non-numeric scales
}

/** `GET .../classes/{classId}/subjects/{subjectId}/terms/{termId}/grades` */
export interface ListGradesResponseDto {
  classId: string;
  subjectId: string;
  termId: string;
  columns: GradeColumnResponseDto[];
  students: StudentGradeRowResponseDto[];
}

/** `POST .../terms/{termId}/lock` response. */
export interface LockGradeResponseDto {
  lockedCount: number;
}
