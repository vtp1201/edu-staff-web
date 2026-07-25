/**
 * One append-only audit event on a parent-student link (US-E20.3, INT-101).
 *
 * FEATURE-SCOPED BY DESIGN (ADR `0064`, binding): this entity is owned by
 * `features/admin/parent-links/` and MUST NOT be folded into the shared
 * audit feature or its `AuditEntityType` union.
 *
 * No `tenantId`/`ipAddress`/`deviceInfo` — those are not captured by any
 * mutation today and are deliberately not invented (DR-023 exclusion).
 */
export type LinkAuditAction = "created" | "unlinked";

export interface LinkAuditEntry {
  entryId: string;
  linkId: string;
  action: LinkAuditAction;
  actorId: string;
  actorName: string;
  /** ISO 8601, produced by the repository's injectable clock (NFR-102). */
  occurredAt: string;
  /** Populated ONLY for `action === "created"`; always `null` on "unlinked". */
  note: string | null;
}
