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
 * Which failure a bare status-409 (no recognizable conflict code) maps to.
 *
 * US-E18.20: the real contract has NO duplicate-report concept — reports are
 * rate-limited (`REPORT_RATE_LIMITED`, 429), never deduped, and
 * `POST /api/v1/reports` cannot return 409. `already-reported` is therefore
 * retained ONLY as create's defensive bare-409 fallback; the failure TYPE stays
 * in the union because the shipped (mock-served) UX + `feed-screen`'s
 * info-toned branch render distinct copy for it. No real error code produces it.
 */
type ConflictAs = "already-reported" | "already-resolved";

/**
 * THE central high-risk mapping (AC-1928.6 / AC-1928.9 / NFR-101). Branches
 * STRICTLY on error.code (UPPER_SNAKE) / HTTP status — NEVER on error.message.
 * The `conflictAs` parameter disambiguates a bare 409 by *operation*, not by
 * reading any message text. Proven code-only by the misleading-message test.
 *
 * US-E18.20 ground-truth: codes read verbatim from
 * `edu-api/services/social/docs/ERROR_CODES.md` §"Moderation errors (US-098,
 * ADR 0078)". They are UPPER_SNAKE on the wire via `pkg/kit/response/error.go`'s
 * `codeFromKey()` (same as `core`; unlike `iam`, US-E18.6). The
 * previously-guessed generic codes (`FORBIDDEN`, `NOT_PRINCIPAL`, `NOT_FOUND`,
 * `VALIDATION_ERROR`, `ALREADY_REPORTED`, `ALREADY_RESOLVED`) do not exist on
 * this service; the status fallbacks are kept as a defensive net.
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
  // `REPORT_NOT_TENANT_MEMBER` = submit gate; `REPORT_NOT_ADMIN` = queue-list /
  // resolve gate; `UNAUTHORIZED_MODERATION_ACTION` = moderate-delete gate.
  if (
    code === "REPORT_NOT_TENANT_MEMBER" ||
    code === "REPORT_NOT_ADMIN" ||
    code === "UNAUTHORIZED_MODERATION_ACTION" ||
    status === 403
  ) {
    return { type: "forbidden" };
  }
  // Validation — the shared 422 code (reasonCategory enum, reasonFreeText
  // required-iff-OTHER/max-500, resolve `action`/`filedAt`). Carries fields.
  if (code === "VALIDATION_FAILED" || status === 422) {
    const fields =
      isApiError(err) && err.fields
        ? (err.fields as ModerationValidationField[])
        : undefined;
    return fields ? { type: "validation", fields } : { type: "validation" };
  }
  // 404 — report row absent (`REPORT_NOT_FOUND`), reported target absent on
  // submit (`REPORT_TARGET_NOT_FOUND`), or moderate-delete target absent /
  // cross-tenant (`MODERATION_TARGET_NOT_FOUND`).
  if (
    code === "REPORT_NOT_FOUND" ||
    code === "REPORT_TARGET_NOT_FOUND" ||
    code === "MODERATION_TARGET_NOT_FOUND" ||
    status === 404
  ) {
    return { type: "not-found" };
  }
  // Explicit 409 conflict codes first (code-first), then the bare-409 fallback.
  // `MODERATION_TARGET_ALREADY_DELETED` is the moderate-delete idempotency
  // guard — same "someone already handled this" copy as a resolved report.
  if (
    code === "REPORT_ALREADY_RESOLVED" ||
    code === "MODERATION_TARGET_ALREADY_DELETED"
  ) {
    return { type: "already-resolved" };
  }
  if (status === 409) {
    return { type: conflictAs };
  }
  // Everything else → retryable network bucket. Notably `REPORT_RATE_LIMITED`
  // (429, 10 reports/hour) is documented retryable, so it belongs here.
  return { type: "network-error" };
}

/**
 * Real `social` moderation repository (US-E19.2 / re-ground-truthed US-E18.20).
 *
 * **PERMANENTLY dead regardless of `USE_MOCK`** — `moderation.di.ts` always
 * constructs the mock. `social`'s openapi.yaml IS now published, so the
 * mock-first premise (decision 0014) no longer applies; the hold is a
 * list/detail/audit shape gap instead (full rationale in `moderation.di.ts`).
 *
 * Kept correct + unit-tested for the day that unblocks, per this epic's
 * precedent (`staff-leave.repository.ts`, `teaching-plan.repository.ts`).
 * Remaining known drift vs. the real contract, deliberately NOT changed here
 * because each needs a domain-signature or product decision beyond US-E18.20's
 * scope (flagged to fe-lead):
 * - `createReport` sends `{ kind, contentId, reason, note }`; real
 *   `SubmitReportRequest` is `{ targetType: MESSAGE|POST, targetId,
 *   reasonCategory, reasonFreeText? }` — and has NO `COMMENT` target type, so
 *   the shipped comment-report flow has no real endpoint at all.
 * - `listReports` sends `status`/`contentType`/`search`; the real `GET /reports`
 *   accepts cursor+limit only and is hardcoded to the tenant's PENDING rows,
 *   with no `stats` in the response.
 * - `getReportDetail` calls a path that does not exist (no
 *   `GET /reports/{reportId}` in the contract).
 * - `dismissReport` sends `{ action: "dismiss" }`; the real
 *   `ResolveReportRequest` requires `{ action: DISMISS|DELETE|ESCALATE,
 *   filedAt }` — the `filedAt` CAS key is not in the repository signature.
 * - `getModerationAuditLog` hits the ROOM capability-change audit (US-086), a
 *   different concept from this feature's content-moderation trail.
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

  /**
   * Moderator content removal. US-E18.20 ground-truth:
   *
   * - `kind: "post"` → `POST /api/v1/feeds/posts/{postId}/moderate-delete`,
   *   a **bare POST with NO request body** (204 on success). Neither `reportId`
   *   nor `resolveNote` is accepted — the endpoint is not report-driven (the
   *   report-driven route is `POST /reports/{id}/resolve` with
   *   `action=DELETE`, which is a different call). The previous `DELETE` +
   *   `{ reportId, resolveNote }` body was invented.
   * - `kind: "comment"` → **no real endpoint exists** (only the post variant
   *   above). Fails fast WITHOUT any HTTP call, mirroring
   *   `MessagingRepository.createConversation`'s unsupported multi-party-group
   *   branch. `forbidden` is chosen as the terminal, non-retryable failure
   *   whose copy ("Bạn không có quyền thực hiện hành động này") does not
   *   mislead the moderator into retrying, unlike `network-error` (retryable)
   *   or `not-found` (implies the report was deleted). The MOCK repository's
   *   comment support is untouched — it serves the shipped UX.
   */
  async removeContent(
    input: RemoveContentRepoInput,
  ): Promise<ModerationActionResult> {
    if (input.kind === "comment") {
      return { ok: false, error: { type: "forbidden" } };
    }
    try {
      await this.http.post(MODERATION_EP.moderateDeletePost(input.contentId));
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
