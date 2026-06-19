import type {
  AcademicYearListResult,
  IAcademicRecordsRepository,
} from "../repositories/i-academic-records.repository";

/** Lists the year IDs that have an academic record for a student. */
export class ListAcademicYearsUseCase {
  constructor(private readonly repo: IAcademicRecordsRepository) {}

  async execute(studentId: string): Promise<AcademicYearListResult> {
    try {
      return await this.repo.listYears(studentId);
    } catch {
      return { ok: false, error: { type: "unknown" } };
    }
  }
}
