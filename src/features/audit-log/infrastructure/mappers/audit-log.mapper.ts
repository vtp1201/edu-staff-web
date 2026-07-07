import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  type AuditAction,
  type AuditEntityType,
  type AuditEvent,
} from "../../domain/entities/audit-event.entity";
import type { AuditEventResponseDto } from "../dtos/audit-event-response.dto";

const ACTION_SET = new Set<string>(AUDIT_ACTIONS);
const ENTITY_TYPE_SET = new Set<string>(AUDIT_ENTITY_TYPES);

/** Unknown wire action → UPDATE (safest generic mutation). */
function toAction(value: string): AuditAction {
  return ACTION_SET.has(value) ? (value as AuditAction) : "UPDATE";
}

/** Unknown wire entity type → setting (catch-all bucket). */
function toEntityType(value: string): AuditEntityType {
  return ENTITY_TYPE_SET.has(value) ? (value as AuditEntityType) : "setting";
}

/** Pure DTO → entity mapper (US-E12.12). No i18n, no side effects. */
export function toAuditEvent(dto: AuditEventResponseDto): AuditEvent {
  return {
    id: dto.id,
    occurredAt: dto.occurredAt,
    actorId: dto.actorId,
    actorName: dto.actorName,
    actorRole: dto.actorRole,
    action: toAction(dto.action),
    entityType: toEntityType(dto.entityType),
    entityId: dto.entityId,
    entityLabel: dto.entityLabel,
    beforeValue: dto.beforeValue,
    afterValue: dto.afterValue,
  };
}
