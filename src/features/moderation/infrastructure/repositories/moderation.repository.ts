import "server-only";
import type { AxiosInstance } from "axios";
import { MODERATION_EP } from "@/bootstrap/endpoint/moderation.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  isApiError,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { ReportDetailEntity } from "../../domain/entities/report-detail.entity";
import type { ReportQueueFilter } from "../../domain/entities/report-queue-filter.entity";
import type {
  ModerationFailure,
  ModerationValidationField,
} from "../../domain/failures/moderation.failure";
import type {
  AuditLogPageResult,
  CreateReportInput,
  IModerationRepository,
  ModerationActionResult,
  ModerationResult,
  RemoveContentRepoInput,
  ReportQueuePageResult,
} from "../../domain/repositories/i-moderation.repository";
import type { AuditEntryResponseDto } from "../dtos/audit-entry-response.dto";
import type { ReportDetailResponseDto } from "../dtos/report-detail-response.dto";
import type { ReportListResponseDto } from "../dtos/report-response.dto";
import { ModerationMapper } from "../mappers/moderation.mapper";

/**
 * Which failure a bare status-409 (no recognizable conflict code) maps to —
 * `already-reported` for create, `already-resolved` for resolve/remove.
 */
type ConflictAs = "already-reported" | "already-resolved";

/**
 * THE central high-risk mapping (AC-1928.6 / AC-1928.9 / NFR-101). Branches
 * STRICTLY on error.code (UPPER_SNAKE) / HTTP status — NEVER on error.message.
 * The `conflictAs` parameter disambiguates a bare 409 by *operation*, not by
 * reading any message text. Proven code-only by the misleading-message test.
 */
export function toFailure(
  err: unknown,
  conflictAs: ConflictAs = "already-resolved",
): ModerationFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  // Transport / no response → retryable network error.
  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  // Authorization rejection — DISTINCT, never retryable (the 403 crux).
  if (status === 403 || code === "FORBIDDEN" || code === "NOT_PRINCIPAL") {
    return { type: "forbidden" };
  }
  // Validation (carry field errors when present).
  if (status === 422 || code === "VALIDATION_ERROR") {
    const fields =
      isApiError(err) && err.fields
        ? (err.fields as ModerationValidationField[])
        : undefined;
    return fields ? { type: "validation", fields } : { type: "validation" };
  }
  // Not found (detail 404).
  if (status === 404 || code === "REPORT_NOT_FOUND" || code === "NOT_FOUND") {
    return { type: "not-found" };
  }
  // Explicit conflict codes first (code-first), then the bare-409 fallback.
  if (code === "ALREADY_REPORTED") {
    return { type: "already-reported" };
  }
  if (code === "ALREADY_RESOLVED" || code === "REPORT_ALREADY_RESOLVED") {
    return { type: "already-resolved" };
  }
  if (status === 409) {
    return { type: conflictAs };
  }
  // Everything else (429/5xx transient, unknown) → retryable network bucket.
  return { type: "network-error" };
}

/**
 * Real `social` moderation repository (US-E19.2). The `social` service has no
 * published openapi.yaml (mock-first, decision 0014) — DI selects
 * {@link MockModerationRepository} while NEXT_PUBLIC_USE_MOCK=true, so this
 * class is unused until BE confirms the contract. It is nonetheless fully wired
 * (cursor pagination via `{ raw: true }` + parseEnvelope, camelCase params,
 * ApiError.code → failure mapping) so flipping USE_MOCK=false needs no
 * domain/presentation rework.
 */
export class ModerationRepository implements IModerationRepository {
  constructor(private readonly http: AxiosInstance) {}

  async createReport(
    input: CreateReportInput,
  ): Promise<ModerationActionResult> {
    try {
      await this.http.post(MODERATION_EP.reports, {
        kind: input.kind,
        contentId: input.contentId,
        reason: input.reason,
        ...(input.note ? { note: input.note } : {}),
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err, "already-reported") };
    }
  }

  async listReports(
    filter: ReportQueueFilter,
    cursor: string | null,
  ): Promise<ModerationResult<ReportQueuePageResult>> {
    try {
      const params: Record<string, unknown> = {
        status: filter.status,
        contentType: filter.contentType,
      };
      if (filter.search.trim()) params.search = filter.search.trim();
      if (cursor) params.cursor = cursor;

      const envelope = (await this.http.get(MODERATION_EP.reports, {
        params,
        ...({ raw: true } as Record<string, unknown>),
      })) as unknown as ApiEnvelope<ReportListResponseDto>;

      const { data, pagination } = parseEnvelope(envelope);
      return {
        ok: true,
        value: {
          reports: (data.reports ?? []).map(ModerationMapper.toReportEntity),
          stats: ModerationMapper.toStatsEntity(data.stats),
          nextCursor: pagination?.nextCursor ?? null,
          hasMore: pagination?.hasMore ?? false,
        },
      };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  async getReportDetail(
    reportId: string,
  ): Promise<ModerationResult<ReportDetailEntity>> {
    try {
      const dto = (await this.http.get(
        MODERATION_EP.reportById(reportId),
      )) as unknown as ReportDetailResponseDto;
      return { ok: true, value: ModerationMapper.toReportDetailEntity(dto) };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  async dismissReport(reportId: string): Promise<ModerationActionResult> {
    try {
      await this.http.post(MODERATION_EP.resolveReport(reportId), {
        action: "dismiss",
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  async removeContent(
    input: RemoveContentRepoInput,
  ): Promise<ModerationActionResult> {
    try {
      const url =
        input.kind === "post"
          ? MODERATION_EP.moderateDeletePost(input.contentId)
          : MODERATION_EP.moderateDeleteComment(
              // parentId is the post owning the comment; unconfirmed contract
              // (falls back to contentId only if BE ever accepts it flat).
              input.parentId ?? input.contentId,
              input.contentId,
            );
      await this.http.delete(url, {
        data: {
          reportId: input.reportId,
          ...(input.resolveNote ? { reason: input.resolveNote } : {}),
        },
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  async getModerationAuditLog(
    scopeId: string,
    cursor: string | null,
  ): Promise<ModerationResult<AuditLogPageResult>> {
    try {
      const params: Record<string, unknown> = {};
      if (cursor) params.cursor = cursor;

      const envelope = (await this.http.get(
        MODERATION_EP.moderationAuditLog(scopeId),
        { params, ...({ raw: true } as Record<string, unknown>) },
      )) as unknown as ApiEnvelope<AuditEntryResponseDto[]>;

      const { data, pagination } = parseEnvelope(envelope);
      return {
        ok: true,
        value: {
          entries: (data ?? []).map(ModerationMapper.toAuditEntryEntity),
          nextCursor: pagination?.nextCursor ?? null,
          hasMore: pagination?.hasMore ?? false,
        },
      };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }
}
