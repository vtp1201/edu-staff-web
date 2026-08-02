import type { ModerationStatsEntity } from "../../domain/entities/moderation-stats.entity";
import type {
  ReportEntity,
  ReportKind,
  ReportReason,
  ReportStatus,
} from "../../domain/entities/report.entity";
import type { ReportDetailEntity } from "../../domain/entities/report-detail.entity";
import type {
  ReportContentTypeFilter,
  ReportStatusTab,
} from "../../domain/entities/report-queue-filter.entity";
import type { ModerationStatsResponseDto } from "../dtos/moderation-stats-response.dto";
import type { ReportInboxItemDto } from "../dtos/report-response.dto";

type WireTargetType = ReportInboxItemDto["targetType"];
type WireReasonCategory = ReportInboxItemDto["reasonCategory"];

const KIND_BY_TARGET_TYPE: Record<WireTargetType, ReportKind> = {
  MESSAGE: "message",
  POST: "post",
  COMMENT: "comment",
};

const TARGET_TYPE_BY_KIND: Record<ReportKind, WireTargetType> = {
  message: "MESSAGE",
  post: "POST",
  comment: "COMMENT",
};

/**
 * Wire `reasonCategory` ↔ web `ReportReason`. Both are 5-value closed enums and
 * pair 1:1; the only non-obvious edge is `HARASSMENT` ↔ `bullying` (the shared
 * report dialog's Vietnamese label is "Bắt nạt").
 */
const REASON_BY_CATEGORY: Record<WireReasonCategory, ReportReason> = {
  HARASSMENT: "bullying",
  INAPPROPRIATE_CONTENT: "inappropriate-language",
  SPAM: "spam",
  MISINFORMATION: "misinformation",
  OTHER: "other",
};

const CATEGORY_BY_REASON: Record<ReportReason, WireReasonCategory> = {
  bullying: "HARASSMENT",
  "inappropriate-language": "INAPPROPRIATE_CONTENT",
  spam: "SPAM",
  misinformation: "MISINFORMATION",
  other: "OTHER",
};

/**
 * The wire's two-field lifecycle (`status` × `resolutionOutcome`) flattened to
 * the entity's single union. `ESCALATE` maps to its OWN state: this app cannot
 * issue it, but another ADMIN can, and calling it "dismissed" would misreport a
 * severity decision as a no-op.
 */
function toStatus(dto: ReportInboxItemDto): ReportStatus {
  if (dto.status === "PENDING") return "pending";
  switch (dto.resolutionOutcome) {
    case "DELETE":
      return "removed";
    case "ESCALATE":
      return "escalated";
    default:
      // The contract documents `resolutionOutcome` as present on every RESOLVED
      // row; this is the defensive branch only.
      return "dismissed";
  }
}

/** Pure DTO → entity mappers (unit-tested). No side effects, no framework. */
export const ModerationMapper = {
  /**
   * `ReportInboxItem` → `ReportEntity`. Every field the wire does NOT carry is
   * mapped to `null`, never to a placeholder: the reporter identity is
   * permanently omitted by design (NFR-098-01), and this service holds no
   * denormalized content preview / author / duplicate count at all.
   */
  toReportEntity(dto: ReportInboxItemDto): ReportEntity {
    return {
      id: dto.reportId,
      kind: KIND_BY_TARGET_TYPE[dto.targetType],
      contentId: dto.targetId,
      contentPreview: null,
      authorId: null,
      authorName: null,
      reporterId: null,
      reporterName: null,
      reason: REASON_BY_CATEGORY[dto.reasonCategory],
      note: dto.reasonFreeText ?? null,
      status: toStatus(dto),
      createdAt: dto.filedAt,
      duplicateCount: null,
      // An opaque user id — presentation must not label it a person's name.
      resolvedBy: dto.resolvedByUserId ?? null,
      resolvedAt: dto.resolvedAt ?? null,
      // No resolve-note concept exists on the wire.
      resolveNote: null,
    };
  },

  /**
   * The detail endpoint returns the SAME `ReportInboxItem`, so the three
   * enrichment sections are `null` = "not available", not `[]` = "none exist".
   */
  toReportDetailEntity(dto: ReportInboxItemDto): ReportDetailEntity {
    return {
      ...ModerationMapper.toReportEntity(dto),
      fullContent: null,
      context: null,
      duplicateReports: null,
    };
  },

  toStatsEntity(dto: ModerationStatsResponseDto): ModerationStatsEntity {
    return { pendingCount: dto.pending, resolvedCount: dto.resolved };
  },
};

/** kind → `targetType` (report submit + content-type filter). */
export function toWireTargetType(kind: ReportKind): WireTargetType {
  return TARGET_TYPE_BY_KIND[kind];
}

/** reason → `reasonCategory` (report submit). */
export function toWireReasonCategory(reason: ReportReason): WireReasonCategory {
  return CATEGORY_BY_REASON[reason];
}

/** Status tab → the ONE partition `GET /reports` reads (`all` is unsupported). */
export function toWireStatus(tab: ReportStatusTab): "PENDING" | "RESOLVED" {
  return tab === "resolved" ? "RESOLVED" : "PENDING";
}

/** Content-type filter → `contentType` param; `all` means "omit the param". */
export function toWireContentType(
  filter: ReportContentTypeFilter,
): WireTargetType | undefined {
  return filter === "all" ? undefined : TARGET_TYPE_BY_KIND[filter];
}
