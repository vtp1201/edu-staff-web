/**
 * Ground-truthed against `core/docs/openapi.yaml` (`GradeEntry`/`GradeReport`
 * tags, ~L2167-2609) — US-E18.12, ADR 0054. camelCase wire fields.
 */

/**
 * `PUT .../columns/{columnId}` / `.../submit` / `.../approve` / `.../reject`
 * response.
 *
 * ⚠️ US-E18.44 (BE US-184): `rejectionReason`/`rejectedBy`/`rejectedAt` are
 * STAFF-ONLY — `core` strips them on every STUDENT/PARENT read
 * (`GET /members/{id}/grades`, `.../grade-report`). They are declared optional
 * here because ONE wire schema serves both caller tiers, but only
 * `mapStaffGradeCell` is allowed to read them: the student/parent entity path
 * goes through `mapGradeCell`, whose return type (`GradeCell`) cannot express
 * them. See `staff-rejection-privacy.test.ts`.
 */
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
  /** STAFF-ONLY (see the interface note). Latest rejection cycle, ≤500 chars. */
  rejectionReason?: string;
  /** STAFF-ONLY. Approver memberId. */
  rejectedBy?: string;
  /** STAFF-ONLY. ISO-8601. */
  rejectedAt?: string;
}

/** `POST .../columns/{columnId}/reject` request body (US-E18.44, BE US-184). */
export interface RejectGradeEntryRequestDto {
  /** REQUIRED, ≤500 chars — trimmed by the use-case before it reaches here. */
  reason: string;
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
