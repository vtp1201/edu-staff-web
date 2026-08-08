/**
 * REAL `core` wire shapes for the academic-record viewer (US-E18.54),
 * ground-truthed against `edu-api/services/core`'s
 * `internal/assessment/adapter/http/dto/academic_record_dto.go` (the Go struct,
 * not only `openapi.yaml`).
 *
 * The pre-remodel DTOs (`AcademicRecordResponseDto` with `years[]` /
 * `SubjectScoreDto` with tx1/tx2/giuaKy/cuoiKy) were an ANTICIPATORY shape no
 * server ever produced — deleted, not adapted.
 */

/** One frozen grade column. `coefficient`/`value` are DECIMAL STRINGS. */
export interface GradeSnapshotItemDto {
  subjectId: string;
  columnId: string;
  columnName: string;
  columnType: string;
  /** e.g. `"1.0"`, `"2.0"` — a string on the wire, parsed by the mapper. */
  coefficient: string;
  /** Frozen grade value at seal time, e.g. `"8.50"` — a string on the wire. */
  value: string;
}

/**
 * ONE `(classId, termId, studentMemberId)` record. Go marshals the pointer
 * fields with `omitempty`, so `sealedAt`/`sealedBy`/`unsealReason`/
 * `unsealedBy`/`unsealedAt` are ABSENT (not `null`) when unset — hence
 * optional, never defaulted. `termAverage` is a plain string field that is
 * `""` when the server computed none.
 */
export interface AcademicRecordRowDto {
  classId: string;
  /** Free-form (`"HK1"` / uuid) — a clustering key, not a constrained enum. */
  termId: string;
  /**
   * DENORMALIZED academic year, e.g. `"2025-2026"` (BE ask #47, migration 051 —
   * US-E18.56). `omitempty`: always present on a new seal, and healed lazily on
   * this list read for a pre-migration one. ABSENT on a genuinely old row whose
   * first heal has not run (or whose best-effort lookup failed) — that is a
   * legitimate degrade, never an error.
   */
  academicYear?: string;
  studentMemberId: string;
  status: "PENDING" | "SEALED" | "UNSEALED";
  gradeSnapshot: GradeSnapshotItemDto[];
  termAverage: string;
  sealedAt?: string;
  sealedBy?: string;
  unsealReason?: string;
  unsealedBy?: string;
  unsealedAt?: string;
  resealCount: number;
}

/** `GET /members/{memberId}/academic-records` payload (UNPAGINATED). */
export interface ListStudentAcademicRecordsResponseDto {
  studentMemberId: string;
  records: AcademicRecordRowDto[];
}
