import type { ReportKind } from "./report.entity";

/** Moderation action recorded in the audit trail (FR-109). */
export type ModerationAction = "removed" | "dismissed";

export interface AuditContentRef {
  kind: ReportKind;
  contentId: string;
}

/**
 * One read-only audit-log entry (INT-191-07). The audit trail is the NFR-101
 * compliance proof surface — every dismiss/remove produces one, retrievable
 * reverse-chronologically.
 */
export interface AuditEntryEntity {
  entryId: string;
  actorId: string;
  actorName: string;
  action: ModerationAction;
  contentRef: AuditContentRef;
  reason: string | null;
  timestamp: string;
}
