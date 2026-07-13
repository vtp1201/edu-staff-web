import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IModerationRepository } from "@/features/moderation/domain/repositories/i-moderation.repository";
import { DismissReportUseCase } from "@/features/moderation/domain/use-cases/dismiss-report.use-case";
import { GetModerationAuditLogUseCase } from "@/features/moderation/domain/use-cases/get-moderation-audit-log.use-case";
import { ListReportsUseCase } from "@/features/moderation/domain/use-cases/list-reports.use-case";
import { RemoveContentUseCase } from "@/features/moderation/domain/use-cases/remove-content.use-case";
import { SubmitReportUseCase } from "@/features/moderation/domain/use-cases/submit-report.use-case";
import { MockModerationRepository } from "@/features/moderation/infrastructure/repositories/mocks/moderation.mock.repository";
import { ModerationRepository } from "@/features/moderation/infrastructure/repositories/moderation.repository";

/**
 * Per-request repo factory (US-E19.2). `social` has no published openapi.yaml
 * and 3 BE contract questions remain open (spec.md §8) → NEXT_PUBLIC_USE_MOCK=true
 * is this story's working default; flip to false only once BE confirms the
 * stats-delivery shape, INT-191-03 detail path, and resolveNote requirement.
 */
async function makeRepo(): Promise<IModerationRepository> {
  if (USE_MOCK) return new MockModerationRepository();
  return new ModerationRepository(await createServerHttpClient());
}

/**
 * SUBMIT-REPORT factory — the cross-route shared entry point. US-E19.1 (feed)
 * and US-E10.6 (messaging) each write their OWN thin `'use server'` action that
 * calls THIS factory and wraps the shared ReportContentDialog. Exported from
 * bootstrap/di (not colocated in any route's actions.ts) so it is importable
 * cross-route, per plan.md's consumer contract.
 */
export async function makeSubmitReportUseCase() {
  return new SubmitReportUseCase(await makeRepo());
}

export async function makeListReportsUseCase() {
  return new ListReportsUseCase(await makeRepo());
}

export async function makeDismissReportUseCase() {
  return new DismissReportUseCase(await makeRepo());
}

export async function makeRemoveContentUseCase() {
  return new RemoveContentUseCase(await makeRepo());
}

export async function makeGetModerationAuditLogUseCase() {
  return new GetModerationAuditLogUseCase(await makeRepo());
}

/**
 * getReportDetail has no domain rule (pure fetch) → exposed as the repo itself
 * rather than a no-op use-case (same "no domain rule → skip the use-case" call
 * as US-E14.4). The RSC/action calls `.getReportDetail(reportId)` directly.
 */
export async function makeModerationRepository(): Promise<IModerationRepository> {
  return makeRepo();
}
