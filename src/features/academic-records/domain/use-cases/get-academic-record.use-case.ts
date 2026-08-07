import type {
  AcademicRecordResult,
  IAcademicRecordsRepository,
} from "../repositories/i-academic-records.repository";

/**
 * Fetches every academic record a student holds (read-only) — one member-scoped
 * read, already grouped into the derived year view by the repository. Pure
 * delegation with an error boundary: any thrown repo error normalizes to an
 * 'unknown' failure.
 */
export class GetAcademicRecordUseCase {
  constructor(private readonly repo: IAcademicRecordsRepository) {}

  async execute(memberId: string): Promise<AcademicRecordResult> {
    try {
      return await this.repo.getRecords(memberId);
    } catch {
      return { ok: false, error: { type: "unknown" } };
    }
  }
}
