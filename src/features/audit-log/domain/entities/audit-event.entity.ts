/**
 * Audit event domain entity (US-E12.12). Pure TypeScript — no framework deps.
 * One append-only record of a significant mutation (grade / conduct / record /
 * setting) captured for the Nghị định 13/2023 personal-data audit trail.
 */

/** Significant mutation kinds tracked in the audit log (reconciled fe-lead ruling). */
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "LOCK"
  | "SEAL"
  | "UNSEAL";

/** Domain object whose mutation was recorded. */
export type AuditEntityType = "grade" | "conduct" | "record" | "setting";

export interface AuditEvent {
  id: string;
  /** ISO-8601 timestamp of when the mutation happened (newest first in lists). */
  occurredAt: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  /** Human-readable label of the affected entity (e.g. "Toán · Cuối kỳ"). */
  entityLabel: string;
  /** Value before the mutation — opaque; `null` for state-only actions. */
  beforeValue: unknown;
  /** Value after the mutation — opaque; `null` for state-only actions. */
  afterValue: unknown;
}

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "LOCK",
  "SEAL",
  "UNSEAL",
];

export const AUDIT_ENTITY_TYPES: readonly AuditEntityType[] = [
  "grade",
  "conduct",
  "record",
  "setting",
];
