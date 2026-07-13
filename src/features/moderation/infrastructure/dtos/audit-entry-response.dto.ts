/** Audit-log entry wire shape (INT-191-07) — camelCase. */
export interface AuditEntryResponseDto {
  entryId: string;
  actorId: string;
  actorName: string;
  action: "removed" | "dismissed";
  contentRef: {
    kind: "post" | "comment" | "message";
    contentId: string;
  };
  reason?: string | null;
  timestamp: string;
}
