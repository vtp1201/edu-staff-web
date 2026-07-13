"use server";

import {
  makeDismissReportUseCase,
  makeGetModerationAuditLogUseCase,
  makeListReportsUseCase,
  makeModerationRepository,
  makeRemoveContentUseCase,
} from "@/bootstrap/di/moderation.di";
import type { ReportQueueFilter } from "@/features/moderation/domain/entities/report-queue-filter.entity";
import { isRetryableFailure } from "@/features/moderation/domain/failures/moderation.failure";
import type {
  DismissReportActionResult,
  GetModerationAuditLogActionResult,
  GetReportDetailActionResult,
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
      stats: res.value.stats,
    };
  }
  return {
    ok: false,
    errorKey: res.error.type,
    retryable: isRetryableFailure(res.error),
  };
}

export async function getReportDetailAction(
  reportId: string,
): Promise<GetReportDetailActionResult> {
  const repo = await makeModerationRepository();
  const res = await repo.getReportDetail(reportId);
  if (res.ok) return { ok: true, data: res.value };
  return {
    ok: false,
    errorKey: res.error.type,
    retryable: isRetryableFailure(res.error),
  };
}

export async function dismissReportAction(
  reportId: string,
): Promise<DismissReportActionResult> {
  const useCase = await makeDismissReportUseCase();
  const res = await useCase.execute(reportId);
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
