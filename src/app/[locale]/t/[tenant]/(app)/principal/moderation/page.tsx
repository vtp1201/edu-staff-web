import {
  makeListReportsUseCase,
  makeModerationRepository,
} from "@/bootstrap/di/moderation.di";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { parseFilterFromParams } from "@/features/moderation/presentation/moderation-screen/components/filter-search-params";
import { ModerationScreen } from "@/features/moderation/presentation/moderation-screen/moderation-screen";
import type { ModerationScreenVM } from "@/features/moderation/presentation/moderation-screen/moderation-screen.i-vm";
import {
  dismissReportAction,
  getModerationAuditLogAction,
  getReportDetailAction,
  getReportStatsAction,
  listReportsAction,
  removeContentAction,
} from "./actions";

/**
 * Principal moderation page (US-E19.2, /principal/moderation). RBAC is inherited
 * from the (app) layout auth/tenant guard; the Remove action's real enforcement
 * is the server 403 (NFR-101). Prefetches queue page 1 for the deep-linked
 * filter AND the stat row — two independent reads against two endpoints, since
 * the counters are tenant-wide and must not follow the list's filter
 * (US-E18.32). Each soft-fails on its own: the queue preserves its error key
 * (so the client can retry) and the stats fall back to `null` (the client
 * re-fetches) rather than to zeros, which would read as real counts.
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

  const [useCase, repo] = await Promise.all([
    makeListReportsUseCase(),
    makeModerationRepository(),
  ]);
  const [result, statsResult] = await Promise.all([
    useCase.execute(initialFilter, null),
    repo.getReportStats(),
  ]);

  const vm: ModerationScreenVM = {
    initialFilter,
    initialQueuePage: result.ok
      ? {
          reports: result.value.reports,
          nextCursor: result.value.nextCursor,
          hasMore: result.value.hasMore,
        }
      : { reports: [], nextCursor: null, hasMore: false },
    initialStats: statsResult.ok ? statsResult.value : null,
    initialErrorKey: result.ok ? null : result.error.type,
    // Single fixed audit scope resolved server-side — only meaningful in mock
    // mode (see `auditLogEnabled`); the tenant is the scope for v1.
    auditScopeId: tenant,
    /**
     * No BE endpoint backs this feature's dismiss/remove audit trail (the one
     * gap BE US-172 did not close — `GET /rooms/{roomId}/moderation-audit` is a
     * ROOM capability audit). Outside mock mode the tab is hidden rather than
     * served from the in-memory mock: a fabricated compliance trail is worse
     * than an absent one, and this branch IS the production configuration.
     */
    auditLogEnabled: USE_MOCK,
    viewerRole: "principal",
    listReportsAction,
    getReportStatsAction,
    getReportDetailAction,
    dismissReportAction,
    removeContentAction,
    getModerationAuditLogAction,
  };

  return <ModerationScreen {...vm} />;
}
