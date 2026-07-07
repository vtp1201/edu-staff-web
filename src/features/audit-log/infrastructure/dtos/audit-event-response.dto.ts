/**
 * Wire shape of an audit event from `GET /core/api/v1/audit-log` (US-E12.12).
 * camelCase per the api-integration rule. The interceptor unwraps the envelope,
 * so repos read this shape directly (with `meta.pagination` via parseEnvelope).
 */
export interface AuditEventResponseDto {
  id: string;
  occurredAt: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  beforeValue: unknown;
  afterValue: unknown;
}
