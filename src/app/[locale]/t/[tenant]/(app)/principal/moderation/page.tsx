import { makeListReportsUseCase } from "@/bootstrap/di/moderation.di";
import { parseFilterFromParams } from "@/features/moderation/presentation/moderation-screen/components/filter-search-params";
import { ModerationScreen } from "@/features/moderation/presentation/moderation-screen/moderation-screen";
import type { ModerationScreenVM } from "@/features/moderation/presentation/moderation-screen/moderation-screen.i-vm";
import {
  dismissReportAction,
  getModerationAuditLogAction,
  getReportDetailAction,
  listReportsAction,
  removeContentAction,
} from "./actions";

/**
 * Principal moderation page (US-E19.2, /principal/moderation). RBAC is inherited
 * from the (app) layout auth/tenant guard; the Remove action's real enforcement
 * is the server 403 (NFR-101). Prefetches queue page 1 (+ embedded stats) for
 * the deep-linked filter and seeds the client query. Soft-fails to the VM's
 * `initialErrorKey` (preserving the key, NOT swallowing to silently-empty like
 * discipline) so the client can show the error state + retry (AC-1927.4).
 */
export default async function PrincipalModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenant } = await params;
  const sp = await searchParams;
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") urlParams.set(key, value);
  }
  const initialFilter = parseFilterFromParams(urlParams);

  const useCase = await makeListReportsUseCase();
  const result = await useCase.execute(initialFilter, null);

  const vm: ModerationScreenVM = {
    initialFilter,
    initialQueuePage: result.ok
      ? {
          reports: result.value.reports,
          nextCursor: result.value.nextCursor,
          hasMore: result.value.hasMore,
        }
      : { reports: [], nextCursor: null, hasMore: false },
    initialStats: result.ok
      ? result.value.stats
      : { pendingCount: 0, resolvedThisWeekCount: 0, removedCount: 0 },
    initialErrorKey: result.ok ? null : result.error.type,
    // Single fixed audit scope resolved server-side (state-design §1 open
    // question on INT-191-07's roomId) — the tenant is the scope for v1.
    auditScopeId: tenant,
    viewerRole: "principal",
    listReportsAction,
    getReportDetailAction,
    dismissReportAction,
    removeContentAction,
    getModerationAuditLogAction,
  };

  return <ModerationScreen {...vm} />;
}
