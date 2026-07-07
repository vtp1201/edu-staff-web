import type { StatusTone } from "@/components/shared/status-badge";
import type {
  AuditAction,
  AuditEntityType,
} from "../../../domain/entities/audit-event.entity";

const ENTITY_TONE: Record<AuditEntityType, StatusTone> = {
  grade: "success",
  conduct: "warning",
  record: "primary",
  setting: "info",
};

/**
 * Badge tone for an audit event (US-E12.12). Tone is driven by `entityType`,
 * EXCEPT `action === "DELETE"` which always renders `error` regardless of
 * entity type (story.md line 26 + fe-lead ruling).
 */
export function auditBadgeTone(
  entityType: AuditEntityType,
  action: AuditAction,
): StatusTone {
  if (action === "DELETE") return "error";
  return ENTITY_TONE[entityType];
}
