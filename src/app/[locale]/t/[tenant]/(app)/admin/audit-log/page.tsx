import { makeGetAuditLogUseCase } from "@/bootstrap/di/audit-log.di";
import { AUDIT_LOG_PAGE_SIZE } from "@/features/audit-log/domain/repositories/i-audit-log.repository";
import { AuditLogScreen } from "@/features/audit-log/presentation/audit-log-screen/audit-log-screen";
import type { AuditLogScreenVM } from "@/features/audit-log/presentation/audit-log-screen/audit-log-screen.i-vm";
import { parseFilterFromParams } from "@/features/audit-log/presentation/audit-log-screen/components/filter-search-params";
import { getAuditLogAction } from "./actions";

/**
 * Admin audit-log page (US-E12.12, /admin/audit-log). RBAC is inherited from
 * the AdminLayout RSC guard; the Server Action re-checks (defense-in-depth).
 * Prefetches page 1 for the deep-linked filter and seeds the client query.
 */
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
  }
  const initialFilter = parseFilterFromParams(params);

  const useCase = await makeGetAuditLogUseCase();
  const result = await useCase.execute(
    initialFilter,
    null,
    AUDIT_LOG_PAGE_SIZE,
  );

  const vm: AuditLogScreenVM = {
    initialFilter,
    initialPage: result.ok
      ? result.value
      : { events: [], nextCursor: null, hasMore: false },
    initialErrorKey: result.ok ? null : result.error.type,
    getAuditLogAction,
  };

  return <AuditLogScreen {...vm} />;
}
