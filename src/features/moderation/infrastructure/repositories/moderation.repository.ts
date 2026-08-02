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
import type { ModerationStatsEntity } from "../../domain/entities/moderation-stats.entity";
import type { ReportRef } from "../../domain/entities/report.entity";
import type { ReportDetailEntity } from "../../domain/entities/report-detail.entity";
import type { ReportQueueFilter } from "../../domain/entities/report-queue-filter.entity";
import type {
  ModerationFailure,
  ModerationValidationField,
} from "../../domain/failures/moderation.failure";
import {
  type AuditLogPageResult,
  type CreateReportInput,
  type IModerationRepository,
  MODERATION_PAGE_SIZE,
  type ModerationActionResult,
  type ModerationResult,
  type RemoveContentRepoInput,
  type ReportQueuePageResult,
} from "../../domain/repositories/i-moderation.repository";
import type { ModerationStatsResponseDto } from "../dtos/moderation-stats-response.dto";
import type {
  ReportInboxItemDto,
  ResolveReportRequestDto,
  SubmitReportRequestDto,
} from "../dtos/report-response.dto";
import {
  ModerationMapper,
  toWireContentType,
  toWireReasonCategory,
  toWireStatus,
  toWireTargetType,
} from "../mappers/moderation.mapper";

/**
 * Which failure a bare status-409 (no recognizable conflict code) maps to.
 *
 * The real contract has NO duplicate-report concept — reports are rate-limited
 * (`REPORT_RATE_LIMITED`, 429), never deduped, and `POST /reports` cannot
 * return 409. `already-reported` is therefore retained ONLY as create's
 * defensive bare-409 fallback; it has no live producer.
 */
type ConflictAs = "already-reported" | "already-resolved";

/**
 * THE central high-risk mapping (AC-1928.6 / AC-1928.9 / NFR-101). Branches
 * STRICTLY on error.code (UPPER_SNAKE) / HTTP status — NEVER on error.message.
 * The `conflictAs` parameter disambiguates a bare 409 by *operation*, not by
 * reading any message text. Proven code-only by the misleading-message tests.
 *
 * Codes read verbatim from `edu-api/services/social/docs/ERROR_CODES.md`
 * §"Moderation errors (US-098, ADR 0078)". They are UPPER_SNAKE on the wire via
 * `pkg/kit/response/error.go`'s `codeFromKey()`.
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
  // stats / detail / resolve gate; `UNAUTHORIZED_MODERATION_ACTION` =
  // moderate-delete gate.
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
  // 400 — a rejected query parameter (unknown `status`/`contentType`, a
  // `search` over 200 chars, a malformed `reportId`/cursor). A caller bug, not
  // a transient one: retrying the identical call cannot succeed.
  if (code === "INVALID_REQUEST_PARAMETERS" || code === "INVALID_CURSOR") {
    return { type: "validation" };
  }
  // 404 — report tuple unresolvable (`REPORT_NOT_FOUND`, incl. cross-tenant),
  // reported target absent on submit (`REPORT_TARGET_NOT_FOUND`), or
  // moderate-delete target absent (`MODERATION_TARGET_NOT_FOUND`).
  if (
    code === "REPORT_NOT_FOUND" ||
    code === "REPORT_TARGET_NOT_FOUND" ||
    code === "MODERATION_TARGET_NOT_FOUND" ||
    status === 404
  ) {
    return { type: "not-found" };
  }
  // Explicit 409 conflict codes first (code-first), then the bare-409 fallback.
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

/** A ref's status partition on the wire (only `pending` reads PENDING). */
function wireStatusOfRef(ref: ReportRef): "PENDING" | "RESOLVED" {
  return ref.status === "pending" ? "PENDING" : "RESOLVED";
}

/**
 * Real `social` moderation repository — LIVE since US-E18.32 (BE US-172/US-166
 * closed the filter/stats/detail/COMMENT-target gaps). `moderation.di.ts` now
 * wires `USE_MOCK ? Mock : this`.
 *
 * One method still has no backing endpoint: `getModerationAuditLog`. It
 * degrades honestly (typed failure, ZERO HTTP) rather than reading the
 * unrelated room capability audit or falling back to in-memory mock entries —
 * a fabricated compliance trail is worse than an absent one. The screen hides
 * that tab outside mock mode so the degrade is never user-visible.
 */
export class ModerationRepository implements IModerationRepository {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * `POST /reports`. Targets MESSAGE, POST **and COMMENT** (US-166).
   * `reasonFreeText` is sent only when non-empty — the service requires it iff
   * `reasonCategory=OTHER` and rejects an empty string with a 422.
   */
  async createReport(
    input: CreateReportInput,
  ): Promise<ModerationActionResult> {
    const note = input.note?.trim();
    const body: SubmitReportRequestDto = {
      targetType: toWireTargetType(input.kind),
      targetId: input.contentId,
      reasonCategory: toWireReasonCategory(input.reason),
      ...(note ? { reasonFreeText: note } : {}),
    };
    try {
      await this.http.post(MODERATION_EP.reports, body);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err, "already-reported") };
    }
  }

  /**
   * `GET /reports` — ONE partition read per page, narrowed SERVER-side.
   *
   * `contentType`/`search` are applied in-app by the service over a bounded
   * scan, so a short (even empty) page with `hasMore=true` is normal and is
   * passed through verbatim: the caller keeps paging. Nothing is re-filtered
   * client-side, and no count is derived here (see `getReportStats`).
   */
  async listReports(
    filter: ReportQueueFilter,
    cursor: string | null,
  ): Promise<ModerationResult<ReportQueuePageResult>> {
    try {
      const contentType = toWireContentType(filter.contentType);
      const search = filter.search.trim();
      const params: Record<string, unknown> = {
        status: toWireStatus(filter.status),
        limit: MODERATION_PAGE_SIZE,
      };
      if (contentType) params.contentType = contentType;
      if (search) params.search = search;
      if (cursor) params.cursor = cursor;

      const envelope = (await this.http.get(MODERATION_EP.reports, {
        params,
        // config-level sibling of `params` — nesting it silently breaks unwrap.
        ...({ raw: true } as Record<string, unknown>),
      })) as unknown as ApiEnvelope<ReportInboxItemDto[]>;

      const { data, pagination } = parseEnvelope(envelope);
      return {
        ok: true,
        value: {
          reports: (data ?? []).map(ModerationMapper.toReportEntity),
          nextCursor: pagination?.nextCursor ?? null,
          hasMore: pagination?.hasMore ?? false,
        },
      };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  /**
   * `GET /reports/stats` — tenant-wide `{pending, resolved}` counters. Sends NO
   * parameters: the counts are unfiltered BY CONTRACT and must never be
   * narrowed to, or derived from, the currently displayed list page.
   */
  async getReportStats(): Promise<ModerationResult<ModerationStatsEntity>> {
    try {
      const dto = (await this.http.get(
        MODERATION_EP.reportStats,
      )) as unknown as ModerationStatsResponseDto;
      return { ok: true, value: ModerationMapper.toStatsEntity(dto) };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  /**
   * `GET /reports/{reportId}?filedAt=&status=`. Both query params are the
   * PARTITION-LOCATING key echoed from the list row — `reportId` is a
   * clustering column and cannot address a row alone, which is exactly why the
   * caller must hold a {@link ReportRef} and no bookmarkable detail URL exists.
   */
  async getReportDetail(
    ref: ReportRef,
  ): Promise<ModerationResult<ReportDetailEntity>> {
    try {
      const dto = (await this.http.get(MODERATION_EP.reportById(ref.reportId), {
        params: { filedAt: ref.filedAt, status: wireStatusOfRef(ref) },
      })) as unknown as ReportInboxItemDto;
      return { ok: true, value: ModerationMapper.toReportDetailEntity(dto) };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  /** `POST /reports/{reportId}/resolve` with `action: DISMISS` + the CAS key. */
  async dismissReport(ref: ReportRef): Promise<ModerationActionResult> {
    return this.resolve(ref, "DISMISS");
  }

  /**
   * Two real removal paths (see {@link RemoveContentRepoInput}):
   *
   * - **report-driven** (`ref` present) → `resolve` with `action: DELETE`. One
   *   atomic call that deletes the target AND closes the report, and the only
   *   path that can remove a COMMENT from the queue (a report row carries the
   *   commentId but not its parent postId, which the direct route needs).
   * - **direct** (`ref` absent — the feed's own affordance, ADR 0052) → the
   *   bare `moderate-delete` route, 204, no body. A comment REQUIRES
   *   `parentId`; without it the URL is unaddressable, so this fails fast with
   *   ZERO HTTP rather than guessing a path.
   */
  async removeContent(
    input: RemoveContentRepoInput,
  ): Promise<ModerationActionResult> {
    if (input.ref) return this.resolve(input.ref, "DELETE");

    if (input.kind === "comment" && !input.parentId) {
      return { ok: false, error: { type: "validation" } };
    }
    const url =
      input.kind === "comment" && input.parentId
        ? MODERATION_EP.moderateDeleteComment(input.parentId, input.contentId)
        : MODERATION_EP.moderateDeletePost(input.contentId);
    try {
      await this.http.post(url);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  /**
   * NO backing endpoint (the one gap US-172 did not close).
   * `GET /rooms/{roomId}/moderation-audit` (US-086) is a ROOM
   * role/mute/capability audit — a different concept from this feature's
   * dismiss/remove content-moderation trail — and there is no tenant-wide
   * equivalent. Degrades to a terminal, non-retryable failure with ZERO HTTP.
   */
  async getModerationAuditLog(
    _scopeId: string,
    _cursor: string | null,
  ): Promise<ModerationResult<AuditLogPageResult>> {
    return { ok: false, error: { type: "forbidden" } };
  }

  private async resolve(
    ref: ReportRef,
    action: ResolveReportRequestDto["action"],
  ): Promise<ModerationActionResult> {
    const body: ResolveReportRequestDto = { action, filedAt: ref.filedAt };
    try {
      await this.http.post(MODERATION_EP.resolveReport(ref.reportId), body);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }
}
