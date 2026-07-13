import type { AuditEntryEntity } from "../../domain/entities/audit-entry.entity";
import type { ModerationStatsEntity } from "../../domain/entities/moderation-stats.entity";
import type {
  ReportEntity,
  ReportReason,
} from "../../domain/entities/report.entity";
import type { ReportDetailEntity } from "../../domain/entities/report-detail.entity";
import type { AuditEntryResponseDto } from "../dtos/audit-entry-response.dto";
import type { ModerationStatsResponseDto } from "../dtos/moderation-stats-response.dto";
import type { ReportDetailResponseDto } from "../dtos/report-detail-response.dto";
import type { ReportResponseDto } from "../dtos/report-response.dto";

/** Pure DTO → entity mappers (unit-tested). No side effects, no framework. */
export const ModerationMapper = {
  toReportEntity(dto: ReportResponseDto): ReportEntity {
    return {
      id: dto.reportId,
      kind: dto.kind,
      contentId: dto.contentId,
      contentPreview: dto.contentPreview,
      authorId: dto.authorId,
      authorName: dto.authorName,
      reporterId: dto.reporterId,
      reporterName: dto.reporterName,
      reason: dto.reason as ReportReason,
      note: dto.note ?? null,
      status: dto.status,
      createdAt: dto.createdAt,
      duplicateCount: dto.duplicateCount,
      resolvedBy: dto.resolvedBy ?? null,
      resolvedAt: dto.resolvedAt ?? null,
      resolveNote: dto.resolveNote ?? null,
    };
  },

  toReportDetailEntity(dto: ReportDetailResponseDto): ReportDetailEntity {
    return {
      ...ModerationMapper.toReportEntity(dto),
      fullContent: dto.fullContent,
      context: (dto.context ?? []).map((c) => ({
        authorName: c.authorName,
        text: c.text,
        highlighted: c.highlighted,
      })),
      duplicateReports: (dto.duplicateReports ?? []).map((d) => ({
        reportId: d.reportId,
        reporterName: d.reporterName,
        createdAt: d.createdAt,
      })),
    };
  },

  toStatsEntity(dto: ModerationStatsResponseDto): ModerationStatsEntity {
    return {
      pendingCount: dto.pendingCount,
      resolvedThisWeekCount: dto.resolvedThisWeekCount,
      removedCount: dto.removedCount,
    };
  },

  toAuditEntryEntity(dto: AuditEntryResponseDto): AuditEntryEntity {
    return {
      entryId: dto.entryId,
      actorId: dto.actorId,
      actorName: dto.actorName,
      action: dto.action,
      contentRef: {
        kind: dto.contentRef.kind,
        contentId: dto.contentRef.contentId,
      },
      reason: dto.reason ?? null,
      timestamp: dto.timestamp,
    };
  },
};
