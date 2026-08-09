import "server-only";
import type { AxiosInstance } from "axios";
import { ACADEMIC_RECORDS_EP } from "@/bootstrap/endpoint/academic-records.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { AcademicRecordsFailure } from "../../domain/failures/academic-records.failure";
import type {
  AcademicRecordResult,
  IAcademicRecordsRepository,
} from "../../domain/repositories/i-academic-records.repository";
import { buildAcademicRecord } from "../../domain/use-cases/build-academic-record";
import type { ListStudentAcademicRecordsResponseDto } from "../dtos/academic-record-response.dto";
import { mapAcademicRecordRow } from "../mappers/academic-record.mapper";

/**
 * Map a normalised ApiError to the viewer failure union. Branch on
 * `error.code` (UPPER_SNAKE) / status, never on message (decision 0008).
 * `ROSTER_ACCESS_FORBIDDEN` is listed because the RBAC gate for a
 * STUDENT/PARENT read is enforced in `core`'s use case, not the router.
 */
export function toFailure(err: unknown): AcademicRecordsFailure {
  const code = errorCodeOf(err) ?? "";
  const status = statusOf(err) ?? 0;
  if (code === "FORBIDDEN" || code.endsWith("_FORBIDDEN") || status === 403)
    return { type: "forbidden" };
  if (code.endsWith("_NOT_FOUND") || status === 404)
    return { type: "not-found" };
  if (code === "NETWORK_ERROR" || status === 0 || status >= 500)
    return { type: "network-error" };
  return { type: "unknown" };
}

/** Tenant subject catalogue lookup (`subjectId → name`), composed in DI. */
export type ResolveSubjectNames = () => Promise<Map<string, string>>;

/**
 * REAL `core` academic-record VIEWER repository — un-blocked by US-E18.54.
 *
 * ONE member-scoped read (`GET /members/{memberId}/academic-records`, BE
 * US-064) returns every `(classId, termId)` record the student holds,
 * UNPAGINATED — and, since US-E18.56, each row carries its own denormalized
 * `academicYear` (BE closed ask #47 with migration 051). That killed the
 * enrollment point-read fan-out this repository used to compose: the year
 * grouping now reads a field already on the row, so a PARENT — who is in no
 * class-context read's allow-list — finally sees real years, and every role
 * pays FEWER network calls. A row whose `academicYear` is absent (an unhealed
 * pre-migration row) still degrades into the viewer's "unresolved year" bucket.
 *
 * ONE OPTIONAL collaborator remains, composed in `bootstrap/di` (decision 0017)
 * and FAIL-SOFT so a decoration failure can never take the record read down:
 * `resolveSubjectNames` — the subject catalogue. Absent/failed = `null` names;
 * a subjectId uuid is never shown as a subject label.
 *
 * The student id on the result is the one the SERVER echoed
 * (`studentMemberId` on the payload), not the caller's argument.
 *
 * RBAC lives entirely BE-side (no role parameter on the wire). Since BE's
 * ADR 0136 (US-E18.57) a TEACHER reads a homeroom-FILTERED subset, and zero
 * homeroom overlap is `200 { records: [] }` — a SUCCESS. This repository must
 * therefore never treat an empty `records[]` as an authorization failure: an
 * empty list maps to an empty record, and only a real wire error maps to a
 * failure.
 */
/** Runs an optional name lookup, degrading to "no names" on any failure. */
async function bestEffort(
  resolve?: () => Promise<Map<string, string>>,
): Promise<Map<string, string>> {
  if (!resolve) return new Map();
  try {
    return await resolve();
  } catch {
    return new Map();
  }
}

export class AcademicRecordsRepository implements IAcademicRecordsRepository {
  constructor(
    private readonly http: AxiosInstance,
    private readonly resolveSubjectNames?: ResolveSubjectNames,
    /** `termId → name` from the calendar; absent leaves headings unnamed. */
    private readonly resolveTermNames?: () => Promise<Map<string, string>>,
  ) {}

  async getRecords(memberId: string): Promise<AcademicRecordResult> {
    try {
      const dto = (await this.http.get(
        ACADEMIC_RECORDS_EP.memberRecords(memberId),
      )) as unknown as ListStudentAcademicRecordsResponseDto;

      const studentMemberId = dto?.studentMemberId ?? memberId;
      // Both lookups are DECORATION: a catalogue/calendar hiccup must never
      // turn a readable record into an error screen.
      const [subjectNames, termNames] = await Promise.all([
        bestEffort(this.resolveSubjectNames),
        bestEffort(this.resolveTermNames),
      ]);
      const rows = (dto?.records ?? []).map((record) =>
        mapAcademicRecordRow(record, subjectNames, termNames),
      );

      return {
        ok: true,
        data: buildAcademicRecord(studentMemberId, rows),
      };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }
}
