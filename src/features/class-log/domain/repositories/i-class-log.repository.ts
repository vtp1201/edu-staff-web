import type { HomeroomEntry } from "../entities/homeroom-entry.entity";

export interface ListEntriesParams {
  classId: string;
  fromDate?: string;
  toDate?: string;
  cursor?: string;
  limit?: number;
}

export interface ListEntriesResult {
  entries: HomeroomEntry[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Class-log (homeroom-entries) repository contract (US-E13.3).
 * Implementations throw a `ClassLogFailure` on error (mapped from the
 * normalised ApiError by error.code); use-cases / actions catch and surface a
 * stable error key. Wire fields are camelCase per api-integration rule.
 */
export interface IClassLogRepository {
  createEntry(
    classId: string,
    entryDate: string,
    summary: string,
    notableEvents?: string,
  ): Promise<HomeroomEntry>;
  listEntries(params: ListEntriesParams): Promise<ListEntriesResult>;
  submitEntry(classId: string, entryId: string): Promise<HomeroomEntry>;
  reviseEntry(classId: string, entryId: string): Promise<HomeroomEntry>;
  approveEntry(classId: string, entryId: string): Promise<HomeroomEntry>;
  rejectEntry(
    classId: string,
    entryId: string,
    reason?: string,
  ): Promise<HomeroomEntry>;
}
