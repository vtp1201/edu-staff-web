import { makePrincipalClassesRepository } from "@/bootstrap/di/principal-classes.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import { tenantUrl } from "@/bootstrap/tenant";
import { PrincipalClassesScreen } from "@/features/principal/presentation/classes/principal-classes-screen";
import type { PrincipalClassesVm } from "@/features/principal/presentation/classes/principal-classes-screen.i-vm";
import { loadMoreClassesAction } from "./actions";

const PAGE_SIZE = 100;

/**
 * School-wide, read-only class list for the `principal` role (US-E13.8).
 * Repository-direct from the RSC page — the same shape as the sibling
 * `(app)/admin/classes/page.tsx` (no intervening domain use-case, plan.md §0.6).
 * RBAC comes entirely from the existing `principal/layout.tsx` guard.
 */
export default async function PrincipalClassesPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { tenant } = await params;
  const vm = await buildVm(tenantUrl(tenant, "/principal/teachers"));

  return <PrincipalClassesScreen vm={vm} onLoadMore={loadMoreClassesAction} />;
}

async function buildVm(teachersHref: string): Promise<PrincipalClassesVm> {
  const empty: Omit<PrincipalClassesVm, "academicYear" | "fetchError"> = {
    classes: [],
    nextCursor: null,
    hasMore: false,
    teachersHref,
  };

  let academicYear: string;
  try {
    academicYear = await resolveCurrentAcademicYear();
  } catch {
    // No active academic year configured — surfaced as the generic (retryable)
    // error state rather than crashing the route.
    return { ...empty, academicYear: "", fetchError: "unknown" };
  }

  const repo = await makePrincipalClassesRepository();
  const result = await repo.listClasses({ academicYear, limit: PAGE_SIZE });

  if (!result.ok) {
    return { ...empty, academicYear, fetchError: result.failure.type };
  }

  return {
    classes: result.value.data,
    nextCursor: result.value.nextCursor,
    hasMore: result.value.hasMore,
    academicYear,
    fetchError: null,
    teachersHref,
  };
}
