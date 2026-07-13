import type { AuditEntryEntity } from "../entities/audit-entry.entity";
import type { ModerationStatsEntity } from "../entities/moderation-stats.entity";
import type {
  ReportEntity,
  ReportKind,
  ReportReason,
} from "../entities/report.entity";
import type { ReportDetailEntity } from "../entities/report-detail.entity";
import type { ReportQueueFilter } from "../entities/report-queue-filter.entity";
import type { ModerationFailure } from "../failures/moderation.failure";

/** Result type used across the moderation repository contract. */
export type ModerationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ModerationFailure };

export type ModerationActionResult =
  | { ok: true }
  | { ok: false; error: ModerationFailure };

/** One page of the report queue — reports + the stat row + cursor pagination. */
export interface ReportQueuePageResult {
  reports: ReportEntity[];
  stats: ModerationStatsEntity;
  nextCursor: string | null;
  hasMore: boolean;
}

/** One page of the audit timeline (reverse-chronological). */
export interface AuditLogPageResult {
  entries: AuditEntryEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreateReportInput {
  kind: ReportKind;
  contentId: string;
  reason: ReportReason;
  note?: string;
}

/** Remove-content targets a post or a comment only (INT-191-05). */
export interface RemoveContentRepoInput {
  kind: "post" | "comment";
  contentId: string;
  reportId: string;
  /**
   * Parent post id — ONLY needed for `kind: "comment"`, whose canonical
   * moderate-delete path is `/feeds/posts/{postId}/comments/{commentId}/...`.
   * Optional because the contract is unconfirmed (integration.md open question);
   * the mock ignores it. Flagged to fe-lead as a real BE-contract gap.
   */
  parentId?: string;
  resolveNote?: string;
}

/**
 * Moderation repository contract (US-E19.2). Implementations return a Result
 * (no throw); errors are normalised from the BE ApiError by error.code/status
 * (never message). Wire fields are camelCase (api-integration.md). One service
 * (`social`) — INT-191-01…05/07.
 */
export interface IModerationRepository {
  createReport(input: CreateReportInput): Promise<ModerationActionResult>;
  listReports(
    filter: ReportQueueFilter,
    cursor: string | null,
  ): Promise<ModerationResult<ReportQueuePageResult>>;
  getReportDetail(
    reportId: string,
  ): Promise<ModerationResult<ReportDetailEntity>>;
  dismissReport(reportId: string): Promise<ModerationActionResult>;
  removeContent(input: RemoveContentRepoInput): Promise<ModerationActionResult>;
  getModerationAuditLog(
    scopeId: string,
    cursor: string | null,
  ): Promise<ModerationResult<AuditLogPageResult>>;
}

/** Page size for cursor-paginated queue + audit reads. */
export const MODERATION_PAGE_SIZE = 20;
