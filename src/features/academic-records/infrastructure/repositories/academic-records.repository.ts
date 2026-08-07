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
import type { ResolveYearByClassId } from "./enrollment-year.resolver";

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
 * UNPAGINATED. Two OPTIONAL collaborators decorate it, both composed in
 * `bootstrap/di` (decision 0017) and both FAIL-SOFT:
 *
 * - `resolveYears` — the `classId → academicYearLabel` join the year grouping
 *   needs, because the record wire carries no year and BE confirmed it never
 *   will. Called ONCE with the DISTINCT classIds; whatever it cannot resolve
 *   degrades into the viewer's "unresolved year" bucket. Absent collaborator =
 *   every record degrades — which is the honest outcome for a PARENT, who is
 *   in no class-context read's allow-list (cross-repo ask #47).
 * - `resolveSubjectNames` — the subject catalogue. Absent/failed = `null`
 *   names; a subjectId uuid is never shown as a subject label.
 *
 * The student id used for the join is the one the SERVER echoed
 * (`studentMemberId` on the payload), not the caller's argument.
 */
export class AcademicRecordsRepository implements IAcademicRecordsRepository {
  constructor(
    private readonly http: AxiosInstance,
    private readonly resolveYears?: ResolveYearByClassId,
    private readonly resolveSubjectNames?: ResolveSubjectNames,
  ) {}

  async getRecords(memberId: string): Promise<AcademicRecordResult> {
    try {
      const dto = (await this.http.get(
        ACADEMIC_RECORDS_EP.memberRecords(memberId),
      )) as unknown as ListStudentAcademicRecordsResponseDto;

      const studentMemberId = dto?.studentMemberId ?? memberId;
      const subjectNames = this.resolveSubjectNames
        ? await this.resolveSubjectNames()
        : new Map<string, string>();
      const rows = (dto?.records ?? []).map((record) =>
        mapAcademicRecordRow(record, subjectNames),
      );

      const classIds = rows.map((r) => r.classId);
      const years =
        this.resolveYears && classIds.length > 0
          ? await this.resolveYears([...new Set(classIds)], studentMemberId)
          : new Map<string, string>();

      return {
        ok: true,
        data: buildAcademicRecord(studentMemberId, rows, years),
      };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }
}
