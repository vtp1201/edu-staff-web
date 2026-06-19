import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  AcademicRecordResult,
  AcademicYearListResult,
  IAcademicRecordsRepository,
} from "../../../domain/repositories/i-academic-records.repository";
import { academicRecordMapper } from "../../mappers/academic-record.mapper";
import { ACADEMIC_RECORD_YEAR_IDS, MOCK_ACADEMIC_RECORD } from "./fixtures";

export class MockAcademicRecordsRepository
  implements IAcademicRecordsRepository
{
  async getRecord(
    _studentId: string,
    yearId?: string,
  ): Promise<AcademicRecordResult> {
    await mockDelay(200);
    const dto = structuredClone(MOCK_ACADEMIC_RECORD);
    const data = academicRecordMapper(dto);
    if (yearId) {
      // Narrow to the requested year while preserving the year list (timeline).
      const match = data.years.find((y) => y.yearId === yearId);
      if (!match) return { ok: false, error: { type: "not-found" } };
    }
    return { ok: true, data };
  }

  async listYears(_studentId: string): Promise<AcademicYearListResult> {
    await mockDelay(200);
    return { ok: true, data: [...ACADEMIC_RECORD_YEAR_IDS] };
  }
}
