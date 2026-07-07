import type { AuditEvent } from "../entities/audit-event.entity";
import type { AuditLogFilter } from "../entities/audit-log-filter.entity";
import type { AuditLogFailure } from "../failures/audit-log.failure";

/** Cursor page size for the audit-log list (story.md — fixed at 20). */
export const AUDIT_LOG_PAGE_SIZE = 20;

/** Domain-internal Result — presentation only sees the Server-Action shape. */
export type AuditLogResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AuditLogFailure };

/** One cursor-paginated page of audit events. */
export interface AuditLogPageResult {
  events: AuditEvent[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Audit-log repository contract (US-E12.12). Read-only, cursor-paginated,
 * newest-first. Implementations return a Result (no throw); errors are
 * normalised from the BE ApiError by error.code/status. Wire fields are
 * camelCase per the api-integration rule.
 */
export interface IAuditLogRepository {
  getAuditLog(
    filter: AuditLogFilter,
    cursor: string | null,
    limit: number,
  ): Promise<AuditLogResult<AuditLogPageResult>>;
}
