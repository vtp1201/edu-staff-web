import type { AuditAction, AuditEntityType } from "./audit-event.entity";

/**
 * Filter applied to the audit-log query (US-E12.12). All fields optional — an
 * empty filter means "no constraint". `from`/`to` are ISO calendar dates
 * ("YYYY-MM-DD"), inclusive on both ends.
 */
export interface AuditLogFilter {
  entityType?: AuditEntityType;
  action?: AuditAction;
  /** Free-text actor-name search (server-side substring match). */
  actorQuery?: string;
  from?: string;
  to?: string;
}
