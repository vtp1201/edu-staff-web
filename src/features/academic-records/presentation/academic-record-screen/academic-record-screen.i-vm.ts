import type { AcademicRecord } from "../../domain/entities/academic-record.entity";
import type { AcademicRecordsFailure } from "../../domain/failures/academic-records.failure";

export type AcademicRecordViewerRole =
  | "student"
  | "teacher"
  | "parent"
  | "admin";

export interface AcademicRecordScreenVM {
  role: AcademicRecordViewerRole;
  studentId: string;
  record: AcademicRecord | null;
  selectedYearId: string | null;
  error: AcademicRecordsFailure["type"] | null;
}

/** Maps a viewer role to its roleBadge i18n key suffix (UPPER). */
export function roleBadgeKey(role: AcademicRecordViewerRole): string {
  return role.toUpperCase();
}
