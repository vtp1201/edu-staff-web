import "server-only";
import type { AxiosInstance } from "axios";
import { ACADEMIC_RECORDS_EP } from "@/bootstrap/endpoint/academic-records.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { AcademicRecordsFailure } from "../../domain/failures/academic-records.failure";
import type {
  AcademicRecordResult,
  AcademicYearListResult,
  IAcademicRecordsRepository,
} from "../../domain/repositories/i-academic-records.repository";
import type { AcademicRecordResponseDto } from "../dtos/academic-record-response.dto";
import { academicRecordMapper } from "../mappers/academic-record.mapper";

function toFailure(err: unknown): AcademicRecordsFailure {
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

export class AcademicRecordsRepository implements IAcademicRecordsRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getRecord(
    studentId: string,
    yearId?: string,
  ): Promise<AcademicRecordResult> {
    try {
      const url = yearId
        ? `${ACADEMIC_RECORDS_EP.record(studentId)}?year=${encodeURIComponent(yearId)}`
        : ACADEMIC_RECORDS_EP.record(studentId);
      const dto = (await this.http.get(
        url,
      )) as unknown as AcademicRecordResponseDto;
      return { ok: true, data: academicRecordMapper(dto) };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  async listYears(studentId: string): Promise<AcademicYearListResult> {
    try {
      const data = (await this.http.get(
        ACADEMIC_RECORDS_EP.years(studentId),
      )) as unknown as string[];
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }
}
