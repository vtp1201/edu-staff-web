import type { AcademicRecord } from "../entities/academic-record.entity";
import type { AcademicRecordsFailure } from "../failures/academic-records.failure";

export type AcademicRecordResult =
  | { ok: true; data: AcademicRecord }
  | { ok: false; error: AcademicRecordsFailure };

export type AcademicYearListResult =
  | { ok: true; data: string[] } // year IDs like ["2023-2024","2024-2025","2025-2026"]
  | { ok: false; error: AcademicRecordsFailure };

export interface IAcademicRecordsRepository {
  getRecord(studentId: string, yearId?: string): Promise<AcademicRecordResult>;
  listYears(studentId: string): Promise<AcademicYearListResult>;
}
