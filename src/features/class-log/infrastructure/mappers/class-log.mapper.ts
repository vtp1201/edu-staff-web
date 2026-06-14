import type { HomeroomEntry } from "../../domain/entities/homeroom-entry.entity";
import type { HomeroomEntryResponseDto } from "../dtos/homeroom-entry-response.dto";

/** DTO → Entity. Status enum passes through (same literal union). */
export const ClassLogMapper = {
  toEntity(dto: HomeroomEntryResponseDto): HomeroomEntry {
    return {
      entryId: dto.entryId,
      classId: dto.classId,
      entryDate: dto.entryDate,
      summary: dto.summary,
      notableEvents: dto.notableEvents,
      status: dto.status,
      authorMemberId: dto.authorMemberId,
      decidedBy: dto.decidedBy,
      decidedAt: dto.decidedAt,
      reason: dto.reason,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  },
};
