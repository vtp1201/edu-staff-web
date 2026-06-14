import type { HomeroomEntryStatus } from "./homeroom-entry-status.entity";

/**
 * A homeroom (class-log / "sổ đầu bài") entry — the record a homeroom teacher
 * keeps per teaching session, submitted to BGH (principal) for approval.
 * Mirrors the core service `HomeroomEntryResponse` (camelCase wire fields).
 */
export interface HomeroomEntry {
  entryId: string;
  classId: string;
  /** YYYY-MM-DD */
  entryDate: string;
  /** Main lesson content (required). */
  summary: string;
  /** Notable events / class notes (optional). */
  notableEvents?: string;
  status: HomeroomEntryStatus;
  authorMemberId: string;
  /** Present after approve/reject. */
  decidedBy?: string;
  /** ISO datetime — present after approve/reject. */
  decidedAt?: string;
  /** Present on rejected entries that carry a reason. */
  reason?: string;
  createdAt: string;
  updatedAt: string;
}
