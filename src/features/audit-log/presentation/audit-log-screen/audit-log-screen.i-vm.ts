import type {
  AuditAction,
  AuditEntityType,
  AuditEvent,
} from "../../domain/entities/audit-event.entity";
import type { AuditLogFilter } from "../../domain/entities/audit-log-filter.entity";
import type { AuditLogFailure } from "../../domain/failures/audit-log.failure";

/** One page of results, as returned by getAuditLogAction and each
 *  useInfiniteQuery page (the container flattens these client-side). */
export interface AuditLogPage {
  events: AuditEvent[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Server-Action result — stable failure key + retryable flag (no i18n). */
export type AuditLogActionResult =
  | { ok: true; data: AuditLogPage }
  | { ok: false; errorKey: AuditLogFailure["type"]; retryable: boolean };

/**
 * Server → client boundary contract for AuditLogScreen (US-E12.12). RSC
 * pre-fetches page 1 server-side; AuditLogScreen (container) re-fetches
 * subsequent pages / filters client-side through the same action ref.
 */
export interface AuditLogScreenVM {
  initialFilter: AuditLogFilter;
  initialPage: AuditLogPage;
  /** Non-null only if the RSC-side first fetch itself failed (rare — page
   *  still renders, AuditLogScreen shows the error banner immediately). */
  initialErrorKey: AuditLogFailure["type"] | null;
  /** Server Action ref — reused for every filter change and "Tải thêm" click.
   *  Never called from a presentational leaf; only the container calls it via
   *  TanStack Query's queryFn. */
  getAuditLogAction: (
    filter: AuditLogFilter,
    cursor: string | null,
  ) => Promise<AuditLogActionResult>;
}

export type AuditLogScreenProps = AuditLogScreenVM;

export type { AuditAction, AuditEntityType, AuditEvent, AuditLogFilter };
