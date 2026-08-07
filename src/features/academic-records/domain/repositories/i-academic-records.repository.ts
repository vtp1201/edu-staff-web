import type { AcademicRecord } from "../entities/academic-record.entity";
import type { AcademicRecordsFailure } from "../failures/academic-records.failure";

export type AcademicRecordResult =
  | { ok: true; data: AcademicRecord }
  | { ok: false; error: AcademicRecordsFailure };

/**
 * Read-only academic-record VIEWER port (US-E18.54 remodel).
 *
 * ONE member-scoped read returns EVERYTHING (`GET /members/{memberId}/
 * academic-records` — every `(classId, termId)` record the student has). The
 * previous `getRecord(studentId, yearId?)` + `listYears(studentId)` pair
 * modelled a year-keyed wire contract that never existed and that BE has now
 * confirmed will never exist, so both are gone: there is no year narrowing on
 * the wire (the viewer's year switch is a client-side filter over the derived
 * {@link AcademicRecord.years}) and no year enumeration endpoint to call.
 */
export interface IAcademicRecordsRepository {
  getRecords(memberId: string): Promise<AcademicRecordResult>;
}
