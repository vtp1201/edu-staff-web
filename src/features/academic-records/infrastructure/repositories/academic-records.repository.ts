import "server-only";
import type { AxiosInstance } from "axios";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { AcademicRecordsFailure } from "../../domain/failures/academic-records.failure";
import type {
  AcademicRecordResult,
  AcademicYearListResult,
  IAcademicRecordsRepository,
} from "../../domain/repositories/i-academic-records.repository";

/**
 * Map a normalised ApiError to the viewer failure union. Dormant since
 * US-E18.21 (the methods below never call HTTP), kept correct + unit-tested as
 * the reference mapping for the day this surface unblocks — same convention as
 * `staff-leave.repository.ts`'s `toFailure`.
 */
export function toFailure(err: unknown): AcademicRecordsFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);
  if (
    code === "USER_NOT_FOUND" ||
    code === "RECORD_NOT_FOUND" ||
    status === 404
  )
    return { type: "not-found" };
  if (code === "FORBIDDEN" || status === 403) return { type: "forbidden" };
  if (code === "NETWORK_ERROR") return { type: "network-error" };
  return { type: "unknown" };
}

/**
 * Real `core` academic-record VIEWER repository (US-E14.5 / US-E18.21).
 *
 * **PERMANENTLY blocked, regardless of `USE_MOCK`** — `academic-records.di.ts`'s
 * `makeRepository()` always constructs `MockAcademicRecordsRepository`
 * (US-E18.21, closing ADR `0055` §Follow-Up). Ground-truthed against
 * `edu-api/services/core/docs/openapi.yaml` (`AcademicRecords` tag), the
 * student/parent multi-year gradebook viewer cannot be wired at all — it is a
 * model mismatch, not a path fix (ADR 0055 §Context point 6):
 *
 * 1. **Wrong lookup key.** The real `AcademicRecordResponse` is keyed by
 *    `(classId, termId, studentMemberId)` (`GET /classes/{classId}/terms/{termId}/students/{studentId}/academic-record`);
 *    this interface asks for `(studentId, yearId?)`. `GET /members/{memberId}/academic-records`
 *    returns a flat array of that same per-class-term shape and restores no
 *    year index either — `listYears` has no wire source at all.
 * 2. **Wrong grade shape.** `GradeSnapshotItemResponse` is a *dynamic* column
 *    array (`{subjectId, columnId, columnName, columnType, coefficient,
 *    value}`, US-E18.7's real assessment-column model). There is no fixed
 *    `tx1`/`tx2`/`giuaKy`/`cuoiKy` slot concept, which this feature's entire
 *    entity + timeline UI is built around.
 * 3. **No student identity, no year grouping.** `studentName`/`studentCode`/
 *    `dateOfBirth` are absent with no batch/by-id profile lookup to backfill
 *    them (cross-repo ask #9), and no `yearId`/`yearLabel` concept exists
 *    anywhere on the wire.
 *
 * Remapping the viewer onto that contract is a `uiux`/`ba`-level model
 * redesign, not an `fe`-wiring remap. Both methods are therefore permanent
 * blocked stubs — they resolve a deterministic `network-error` failure
 * *synchronously, without ever performing an HTTP call* (mirrors
 * `StaffLeaveRepository`, US-E18.8) — kept only to satisfy
 * `IAcademicRecordsRepository` for the day this unblocks. `toFailure` above is
 * kept correct + unit-tested for that day.
 */
export class AcademicRecordsRepository implements IAcademicRecordsRepository {
  // Kept for constructor-signature parity with every other repo (callers do
  // `new AcademicRecordsRepository(http)`) even though both methods below are
  // permanent blocked stubs — see class doc above.
  // biome-ignore lint/complexity/noUselessConstructor: signature parity, see comment above.
  constructor(_http: AxiosInstance) {}

  async getRecord(
    _studentId: string,
    _yearId?: string,
  ): Promise<AcademicRecordResult> {
    return { ok: false, error: { type: "network-error" } };
  }

  async listYears(_studentId: string): Promise<AcademicYearListResult> {
    return { ok: false, error: { type: "network-error" } };
  }
}
