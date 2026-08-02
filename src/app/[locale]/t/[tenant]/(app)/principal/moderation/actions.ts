"use server";

import {
  makeDismissReportUseCase,
  makeGetModerationAuditLogUseCase,
  makeListReportsUseCase,
  makeModerationRepository,
  makeRemoveContentUseCase,
} from "@/bootstrap/di/moderation.di";
import type { ReportRef } from "@/features/moderation/domain/entities/report.entity";
import type { ReportQueueFilter } from "@/features/moderation/domain/entities/report-queue-filter.entity";
import { isRetryableFailure } from "@/features/moderation/domain/failures/moderation.failure";
import type {
  DismissReportActionResult,
  GetModerationAuditLogActionResult,
  GetReportDetailActionResult,
  GetReportStatsActionResult,
  ListReportsActionResult,
  RemoveContentActionResult,
  RemoveContentInput,
} from "@/features/moderation/presentation/moderation-screen/moderation-screen.i-vm";

/**
 * Server Actions for the moderation screen (US-E19.2). Each returns stable
 * failure keys + a retryable flag (no i18n at this boundary). Role enforcement
 * is the layout's auth/tenant gate + the server's own 403 (NFR-101) — the actions
 * do NOT re-check role here: `requireRole(["principal"])` would reject in mock
 * mode (decodeRoleClaim returns "admin" for any token), and plan.md Phase 6
 * confirms the layout guard + server 403 is the full defense-in-depth for this
 * route. The Remove-content 403 path is exercised via the mock's deterministic
 * MOCK_FORBIDDEN_REPORT_ID fixture.
 */
export async function listReportsAction(
  filter: ReportQueueFilter,
  cursor: string | null,
): Promise<ListReportsActionResult> {
  const useCase = await makeListReportsUseCase();
  const res = await useCase.execute(filter, cursor);
  if (res.ok) {
    return {
      ok: true,
      data: {
        reports: res.value.reports,
        nextCursor: res.value.nextCursor,
        hasMore: res.value.hasMore,
      },
    };
  }
  return {
    ok: false,
    errorKey: res.error.type,
    retryable: isRetryableFailure(res.error),
  };
}

/**
 * Queue counters — a SEPARATE call against `GET /reports/stats`, deliberately
 * not folded into `listReportsAction`: the counts are tenant-wide and must not
 * be narrowed by (or derived from) whatever filter the list is showing.
 */
export async function getReportStatsAction(): Promise<GetReportStatsActionResult> {
  const repo = await makeModerationRepository();
  const res = await repo.getReportStats();
  if (res.ok) return { ok: true, data: res.value };
  return {
    ok: false,
    errorKey: res.error.type,
    retryable: isRetryableFailure(res.error),
  };
}

/**
 * Takes the whole `ReportRef` (reportId + echoed `filedAt` + status partition):
 * `reportId` is a clustering column, so a bare id cannot address the row. The
 * tuple always originates from a list row the client already rendered.
 */
export async function getReportDetailAction(
  ref: ReportRef,
): Promise<GetReportDetailActionResult> {
  const repo = await makeModerationRepository();
  const res = await repo.getReportDetail(ref);
  if (res.ok) return { ok: true, data: res.value };
  return {
    ok: false,
    errorKey: res.error.type,
    retryable: isRetryableFailure(res.error),
  };
}

export async function dismissReportAction(
  ref: ReportRef,
): Promise<DismissReportActionResult> {
  const useCase = await makeDismissReportUseCase();
  const res = await useCase.execute(ref);
  if (res.ok) return { ok: true };
  return {
    ok: false,
    errorKey: res.error.type,
    retryable: isRetryableFailure(res.error),
  };
}

export async function removeContentAction(
  input: RemoveContentInput,
): Promise<RemoveContentActionResult> {
  const useCase = await makeRemoveContentUseCase();
  const res = await useCase.execute(input);
  if (res.ok) return { ok: true };
  return {
    ok: false,
    errorKey: res.error.type,
    retryable: isRetryableFailure(res.error),
  };
}

export async function getModerationAuditLogAction(
  scopeId: string,
  cursor: string | null,
): Promise<GetModerationAuditLogActionResult> {
  const useCase = await makeGetModerationAuditLogUseCase();
  const res = await useCase.execute(scopeId, cursor);
  if (res.ok) return { ok: true, data: res.value };
  return {
    ok: false,
    errorKey: res.error.type,
    retryable: isRetryableFailure(res.error),
  };
}
