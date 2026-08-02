import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { AuditEntryEntity } from "../../domain/entities/audit-entry.entity";
import type { ModerationStatsEntity } from "../../domain/entities/moderation-stats.entity";
import type {
  ReportEntity,
  ReportRef,
} from "../../domain/entities/report.entity";
import type { ReportDetailEntity } from "../../domain/entities/report-detail.entity";
import type { ReportQueueFilter } from "../../domain/entities/report-queue-filter.entity";
import type { ModerationFailure } from "../../domain/failures/moderation.failure";

/**
 * One page of the report queue (client flattens across pages).
 *
 * ⚠️ `hasMore === true` with an EMPTY `reports` array is legitimate while a
 * `contentType`/`search` filter is active — the service filters over a bounded
 * scan, so the caller must keep paging. The UI therefore keeps "load more"
 * available on an empty filtered page (US-E18.32).
 */
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

/** No `stats` here — counts have their own action (never derived from a page). */
export type ListReportsActionResult =
  | { ok: true; data: ReportQueuePage }
  | Fail;

export type GetReportStatsActionResult =
  | { ok: true; data: ModerationStatsEntity }
  | Fail;

export type GetReportDetailActionResult =
  | { ok: true; data: ReportDetailEntity }
  | Fail;

export type DismissReportActionResult = { ok: true } | Fail;

/**
 * Queue-driven removal. Carries the whole {@link ReportRef}: from the queue the
 * removal runs through `resolve(action: DELETE)`, whose CAS needs the echoed
 * `filedAt` — and which is the only comment-removal path addressable from a
 * report row (US-E18.32).
 */
export interface RemoveContentInput {
  kind: "post" | "comment";
  contentId: string;
  ref: ReportRef;
}
export type RemoveContentActionResult = { ok: true } | Fail;

export type GetModerationAuditLogActionResult =
  | { ok: true; data: AuditLogPage }
  | Fail;

/**
 * Server → client boundary for ModerationScreen. RSC pre-fetches queue page 1
 * (for the deep-linked filter) + the stat row; the client container re-fetches
 * on every filter/tab change and cursor "load more" through these Server Action
 * refs. The detail sheet is client-only and interaction-triggered — it is a
 * SHEET, not a route, precisely because the detail point-read needs the row's
 * `filedAt`/`status`, so an independently navigable URL could never work.
 */
export interface ModerationScreenVM {
  initialFilter: ReportQueueFilter;
  initialQueuePage: ReportQueuePage;
  /** `null` when the RSC stats read failed — the client re-fetches. */
  initialStats: ModerationStatsEntity | null;
  /** Non-null only if the RSC-side queue fetch itself failed (page still
   *  renders; the container shows the error state immediately). */
  initialErrorKey: ModerationFailure["type"] | null;
  /** Fixed audit scope resolved server-side. Only meaningful in mock mode. */
  auditScopeId: string;
  /**
   * Whether the moderation audit trail can be served at all. `false` outside
   * mock mode: no BE endpoint exists for this feature's dismiss/remove trail
   * (the room capability audit, US-086, is a different concept), and the real
   * repository degrades that read with zero HTTP. The tab is HIDDEN rather than
   * shown broken or, worse, filled with in-memory mock entries — a fabricated
   * compliance trail is worse than an absent one.
   */
  auditLogEnabled: boolean;
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
  getReportStatsAction: () => Promise<GetReportStatsActionResult>;
  getReportDetailAction: (
    ref: ReportRef,
  ) => Promise<GetReportDetailActionResult>;
  dismissReportAction: (ref: ReportRef) => Promise<DismissReportActionResult>;
  removeContentAction: (
    input: RemoveContentInput,
  ) => Promise<RemoveContentActionResult>;
  getModerationAuditLogAction: (
    scopeId: string,
    cursor: string | null,
  ) => Promise<GetModerationAuditLogActionResult>;
}

export type ModerationScreenProps = ModerationScreenVM;
