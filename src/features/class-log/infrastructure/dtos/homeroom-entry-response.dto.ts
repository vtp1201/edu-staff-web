import type { HomeroomEntryStatus } from "../../domain/entities/homeroom-entry-status.entity";

/** Mirrors core service `HomeroomEntryResponse` (camelCase wire fields). */
export interface HomeroomEntryResponseDto {
  entryId: string;
  classId: string;
  entryDate: string;
  summary: string;
  notableEvents?: string;
  status: HomeroomEntryStatus;
  authorMemberId: string;
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}
