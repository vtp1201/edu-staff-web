import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { AuditEntryEntity } from "../../domain/entities/audit-entry.entity";
import type { ModerationStatsEntity } from "../../domain/entities/moderation-stats.entity";
import type { ReportEntity } from "../../domain/entities/report.entity";
import type { ReportDetailEntity } from "../../domain/entities/report-detail.entity";
import type { ReportQueueFilter } from "../../domain/entities/report-queue-filter.entity";
import type { ModerationFailure } from "../../domain/failures/moderation.failure";

/** One page of the report queue (client flattens across pages). */
export interface ReportQueuePage {
  reports: ReportEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** One page of the audit timeline. */
export interface AuditLogPage {
  entries: AuditEntryEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Stable failure key + retryable flag — no i18n at this boundary (i18n.md). */
type Fail = {
  ok: false;
  errorKey: ModerationFailure["type"];
  retryable: boolean;
};

export type ListReportsActionResult =
  | { ok: true; data: ReportQueuePage; stats: ModerationStatsEntity }
  | Fail;

export type GetReportDetailActionResult =
  | { ok: true; data: ReportDetailEntity }
  | Fail;

export type DismissReportActionResult = { ok: true } | Fail;

export interface RemoveContentInput {
  kind: "post" | "comment";
  contentId: string;
  reportId: string;
  /** Parent post id for a comment (unconfirmed contract — see repo). */
  parentId?: string;
  /** [OPEN QUESTION spec.md §8 — required-ness TBC with BE.] */
  resolveNote?: string;
}
export type RemoveContentActionResult = { ok: true } | Fail;

export type GetModerationAuditLogActionResult =
  | { ok: true; data: AuditLogPage }
  | Fail;

/**
 * Server → client boundary for ModerationScreen (US-E19.2). RSC pre-fetches
 * page 1 of the queue (for the deep-linked filter) + stats; the client
 * container re-fetches on every filter/tab change and cursor "load more"
 * through these Server Action refs (mirrors AuditLogScreenVM). Detail sheet +
 * audit tab are client-only, interaction-triggered (never RSC-prefetched).
 */
export interface ModerationScreenVM {
  initialFilter: ReportQueueFilter;
  initialQueuePage: ReportQueuePage;
  initialStats: ModerationStatsEntity;
  /** Non-null only if the RSC-side fetch itself failed (page still renders;
   *  container shows the error state immediately). */
  initialErrorKey: ModerationFailure["type"] | null;
  /** Fixed audit scope resolved server-side (state-design §1 open-question). */
  auditScopeId: string;
  /**
   * Defensive-only — the ROUTE is the real gate. Hides the Remove entry point
   * client-side (AC-1928.1 defense-in-depth) and lets Storybook prove the
   * non-principal case without a second route.
   */
  viewerRole: UserRole;

  listReportsAction: (
    filter: ReportQueueFilter,
    cursor: string | null,
  ) => Promise<ListReportsActionResult>;
  getReportDetailAction: (
    reportId: string,
  ) => Promise<GetReportDetailActionResult>;
  dismissReportAction: (reportId: string) => Promise<DismissReportActionResult>;
  removeContentAction: (
    input: RemoveContentInput,
  ) => Promise<RemoveContentActionResult>;
  getModerationAuditLogAction: (
    scopeId: string,
    cursor: string | null,
  ) => Promise<GetModerationAuditLogActionResult>;
}

export type ModerationScreenProps = ModerationScreenVM;
