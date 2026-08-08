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

/**
 * Which `academicRecord.*` namespace holds the empty-state copy for this viewer
 * (US-E18.57, BE ADR 0136).
 *
 * A TEACHER's read is homeroom-SCOPED: BE returns only the records of classes
 * the caller is the current GVCN of, and `200 { records: [] }` — never a 403 —
 * when that overlap is zero. The generic "chưa có bản ghi học bạ nào" copy
 * would then assert something probably false (the student usually DOES have
 * records; this teacher just may see none of them), so the teacher gets copy
 * that is accurate under BOTH readings.
 *
 * BE exposes no signal distinguishing "genuinely zero records" from "zero
 * authorized records" — deliberately not simulated client-side (probing for it
 * would itself be a scope leak), hence ONE teacher message rather than two.
 */
export function emptyStateCopyKey(
  role: AcademicRecordViewerRole,
): "empty" | "empty.teacherNoHomeroomAccess" {
  return role === "teacher" ? "empty.teacherNoHomeroomAccess" : "empty";
}
