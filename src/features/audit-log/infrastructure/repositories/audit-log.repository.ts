import "server-only";
import type { AxiosInstance } from "axios";
import { AUDIT_LOG_EP } from "@/bootstrap/endpoint/audit-log.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  isApiError,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { AuditLogFilter } from "../../domain/entities/audit-log-filter.entity";
import type { AuditLogFailure } from "../../domain/failures/audit-log.failure";
import type {
  AuditLogPageResult,
  AuditLogResult,
  IAuditLogRepository,
} from "../../domain/repositories/i-audit-log.repository";
import type { AuditEventResponseDto } from "../dtos/audit-event-response.dto";
import { toAuditEvent } from "../mappers/audit-log.mapper";

/**
 * Map a normalised ApiError to the audit-log failure union (US-E12.12).
 * Branch on error.code (UPPER_SNAKE) / status — never on message.
 */
export function toFailure(err: unknown): AuditLogFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);
  // Thread the BE retryable signal (408/429/502/503/504 → retryable) so a
  // retryable 5xx that maps to `unknown` still gets the query's retry treatment.
  const retryable = isApiError(err) ? err.retryable : false;

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error", retryable: true };
  }
  if (status === 401 || code === "UNAUTHORIZED" || code === "TOKEN_EXPIRED") {
    return { type: "unauthorized", retryable };
  }
  if (status === 403 || code === "FORBIDDEN" || code === "SCHOOL_FORBIDDEN") {
    return { type: "forbidden", retryable };
  }
  if (status === 400 || status === 422 || code === "VALIDATION_ERROR") {
    return { type: "invalid-filter", retryable };
  }
  return { type: "unknown", retryable };
}

/** Build the wire query params from a filter (+ cursor/limit). camelCase. */
export function buildAuditLogParams(
  filter: AuditLogFilter,
  cursor: string | null,
  limit: number,
): Record<string, unknown> {
  const params: Record<string, unknown> = { limit };
  if (filter.entityType) params.entityType = filter.entityType;
  if (filter.action) params.action = filter.action;
  if (filter.actorQuery?.trim()) params.actorQuery = filter.actorQuery.trim();
  if (filter.from) params.from = filter.from;
  if (filter.to) params.to = filter.to;
  if (cursor) params.cursor = cursor;
  return params;
}

/**
 * Real `core` audit-log repository (US-E12.12). The `core` service audit
 * endpoint is not confirmed live yet (mock-first, decision 0014) — DI selects
 * {@link MockAuditLogRepository} while NEXT_PUBLIC_USE_MOCK=true, so this class
 * is unused until BE US-064 ships. It is nonetheless fully wired to the
 * documented contract (cursor pagination via `{ raw: true }` + parseEnvelope,
 * camelCase params, ApiError.code → failure mapping) so flipping USE_MOCK=false
 * requires no domain/presentation rework.
 */
export class AuditLogRepository implements IAuditLogRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getAuditLog(
    filter: AuditLogFilter,
    cursor: string | null,
    limit: number,
  ): Promise<AuditLogResult<AuditLogPageResult>> {
    try {
      const params = buildAuditLogParams(filter, cursor, limit);
      const envelope = (await this.http.get(AUDIT_LOG_EP.list, {
        params,
        // raw: true needed to access meta.pagination (cursor pagination).
        ...({ raw: true } as Record<string, unknown>),
      })) as unknown as ApiEnvelope<AuditEventResponseDto[]>;

      const { data, pagination } = parseEnvelope(envelope);
      return {
        ok: true,
        value: {
          events: (data ?? []).map(toAuditEvent),
          nextCursor: pagination?.nextCursor ?? null,
          hasMore: pagination?.hasMore ?? false,
        },
      };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }
}
