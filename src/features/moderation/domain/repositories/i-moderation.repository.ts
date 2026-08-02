import type { AuditEntryEntity } from "../entities/audit-entry.entity";
import type { ModerationStatsEntity } from "../entities/moderation-stats.entity";
import type {
  ReportEntity,
  ReportKind,
  ReportReason,
  ReportRef,
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

/**
 * One page of the report queue.
 *
 * **No `stats` here (US-E18.32).** Counts live behind their own
 * `getReportStats()` call precisely so they can never be derived from — or
 * silently narrowed by — a filtered, cursor-paginated page.
 *
 * ⚠️ `hasMore === true` with a SHORT or even EMPTY `reports` array is NORMAL
 * when a `contentType`/`search` filter is active: the service applies those
 * filters in-app over a bounded scan (10 × 100 rows per request), so a page can
 * legitimately yield zero matches while more remain. Callers MUST keep paging
 * while `hasMore` — an empty first page is NOT "no matches exist".
 */
export interface ReportQueuePageResult {
  reports: ReportEntity[];
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

/**
 * Remove-content input. TWO distinct real paths, chosen by whether an
 * originating report is in scope (US-E18.32):
 *
 * - **Report-driven** (moderation queue): `ref` present →
 *   `POST /reports/{reportId}/resolve` with `action: DELETE`. This single call
 *   deletes the target AND resolves the report atomically, and it is the ONLY
 *   removal path that works for a COMMENT target reached from the queue (the
 *   direct comment route needs the parent `postId`, which a report row does not
 *   carry — it only has the `commentId`).
 * - **Direct** (feed's own removal affordance, ADR 0052): `ref` absent → the
 *   direct `moderate-delete` route for the kind. A comment then REQUIRES
 *   `parentId` (the postId path segment); the feed has it in scope.
 */
export interface RemoveContentRepoInput {
  kind: "post" | "comment";
  contentId: string;
  /** Originating report tuple — present only on the queue-driven path. */
  ref?: ReportRef;
  /** Parent postId — REQUIRED for `kind: "comment"` on the direct path. */
  parentId?: string;
}

/**
 * Moderation repository contract. Implementations return a Result (no throw);
 * errors are normalised from the BE `ApiError` by `error.code`/status (never
 * message). Wire fields are camelCase. One service (`social`).
 *
 * Every point-read / CAS write takes a {@link ReportRef}, not a bare id — see
 * that type for why a lone `reportId` cannot address a row.
 */
export interface IModerationRepository {
  createReport(input: CreateReportInput): Promise<ModerationActionResult>;
  listReports(
    filter: ReportQueueFilter,
    cursor: string | null,
  ): Promise<ModerationResult<ReportQueuePageResult>>;
  /** Tenant-wide counts — independent of any list filter (US-172). */
  getReportStats(): Promise<ModerationResult<ModerationStatsEntity>>;
  getReportDetail(
    ref: ReportRef,
  ): Promise<ModerationResult<ReportDetailEntity>>;
  dismissReport(ref: ReportRef): Promise<ModerationActionResult>;
  removeContent(input: RemoveContentRepoInput): Promise<ModerationActionResult>;
  getModerationAuditLog(
    scopeId: string,
    cursor: string | null,
  ): Promise<ModerationResult<AuditLogPageResult>>;
}

/** Page size for cursor-paginated queue + audit reads (wire max is 50). */
export const MODERATION_PAGE_SIZE = 20;
