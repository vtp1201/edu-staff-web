import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  AcademicRecordResult,
  IAcademicRecordsRepository,
} from "../../../domain/repositories/i-academic-records.repository";
import { buildAcademicRecord } from "../../../domain/use-cases/build-academic-record";
import { mapAcademicRecordRow } from "../../mappers/academic-record.mapper";
import {
  MOCK_CLASS_YEARS,
  MOCK_STUDENT_ACADEMIC_RECORDS,
  MOCK_SUBJECT_NAMES,
} from "./fixtures";

/**
 * Mock viewer repository. Its fixture is WIRE-SHAPED (a flat
 * `(classId, termId)` list), so it runs the exact same mapper + grouping as
 * `AcademicRecordsRepository` — the two branches cannot drift in how a record
 * becomes a year (US-E18.54). Only the two decoration collaborators are local
 * maps here instead of HTTP reads.
 */
export class MockAcademicRecordsRepository
  implements IAcademicRecordsRepository
{
  async getRecords(_memberId: string): Promise<AcademicRecordResult> {
    await mockDelay(200);
    const dto = structuredClone(MOCK_STUDENT_ACADEMIC_RECORDS);
    const rows = dto.records.map((record) =>
      mapAcademicRecordRow(record, MOCK_SUBJECT_NAMES),
    );
    return {
      ok: true,
      data: buildAcademicRecord(dto.studentMemberId, rows, MOCK_CLASS_YEARS),
    };
  }
}
