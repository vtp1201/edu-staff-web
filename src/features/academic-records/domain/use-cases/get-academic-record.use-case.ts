import type {
  AcademicRecordResult,
  IAcademicRecordsRepository,
} from "../repositories/i-academic-records.repository";

/** Fetches a student's academic record (read-only). Pure delegation with an
 * error boundary — any thrown repo error normalizes to an 'unknown' failure. */
export class GetAcademicRecordUseCase {
  constructor(private readonly repo: IAcademicRecordsRepository) {}

  async execute(
    studentId: string,
    yearId?: string,
  ): Promise<AcademicRecordResult> {
    try {
      return await this.repo.getRecord(studentId, yearId);
    } catch {
      return { ok: false, error: { type: "unknown" } };
    }
  }
}
