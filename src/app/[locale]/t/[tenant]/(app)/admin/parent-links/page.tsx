import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { makeListParentStudentLinksUseCase } from "@/bootstrap/di/parent-student-link.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim } from "@/bootstrap/lib/jwt";
import { evaluateAdminAccess } from "@/bootstrap/tenant";
import { PARENT_LINKS_PAGE_SIZE } from "@/features/admin/parent-links/domain/repositories/i-parent-student-link.repository";
import { parseFilterFromParams } from "@/features/admin/parent-links/presentation/parent-links-screen/filter-search-params";
import { ParentLinksScreen } from "@/features/admin/parent-links/presentation/parent-links-screen/parent-links-screen";
import type {
  ClassOption,
  ParentLinksPage,
} from "@/features/admin/parent-links/presentation/parent-links-screen/parent-links-screen.i-vm";
import {
  createLinkAction,
  getLinkConsentDetailAction,
  listLinksAction,
  searchParentCandidatesAction,
  searchStudentCandidatesAction,
  unlinkLinkAction,
} from "./actions";

/**
 * Admin parent-student links page (US-E20.1, /admin/parent-links). RBAC is
 * inherited from the AdminLayout RSC guard (decision 0022/0024) — no route
 * guard here; the mutating Server Actions re-check independently (HIGH-RISK,
 * AC-005.5). Prefetches page 1 for the deep-linked filter and seeds the client
 * query; a failed RSC fetch seeds the error state (never coerced to empty).
 * AC-001.6: a forbidden result on the INITIAL server-side fetch redirects the
 * actor to their own workspace server-side (defense-in-depth if the API returns
 * forbidden after a mid-session role change) rather than rendering an in-page
 * error — an in-page error+retry is only acceptable for a client-side refetch.
 */
export default async function AdminParentLinksPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ locale: string; tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, tenant } = await routeParams;
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
  }
  const initialFilter = parseFilterFromParams(params);

  const useCase = await makeListParentStudentLinksUseCase();
  const result = await useCase.execute({
    q: initialFilter.q || undefined,
    classId: initialFilter.classId,
    cursor: null,
    limit: PARENT_LINKS_PAGE_SIZE,
  });

  // AC-001.6: forbidden on the initial load → redirect to the actor's own
  // workspace server-side (never an in-page error for the RSC-level 403).
  if (!result.ok && result.failure.type === "forbidden") {
    const role = decodeRoleClaim((await getAccessToken()) ?? "");
    const access = evaluateAdminAccess(role, locale, tenant);
    redirect(access.redirectUrl || `/${locale}/select-tenant`);
  }

  const emptyPage: ParentLinksPage = {
    items: [],
    nextCursor: null,
    hasMore: false,
  };
  const initialPage = result.ok ? result.value : emptyPage;

  // Class filter options — derived from the fetched page's distinct classes
  // (mock-first: no class-list endpoint wired; swap-ready for a real one).
  const t = await getTranslations("parentLinks");
  const distinctClasses = Array.from(
    new Set(initialPage.items.map((l) => l.studentClassName)),
  ).sort();
  const classOptions: ClassOption[] = distinctClasses.map((className) => ({
    id: className,
    label: t("classPrefix", { class: className }),
  }));

  return (
    <ParentLinksScreen
      initialFilter={initialFilter}
      initialPage={initialPage}
      initialErrorKey={result.ok ? undefined : result.failure.type}
      classOptions={classOptions}
      listLinksAction={listLinksAction}
      createLinkAction={createLinkAction}
      unlinkLinkAction={unlinkLinkAction}
      getLinkConsentDetailAction={getLinkConsentDetailAction}
      searchStudentCandidatesAction={searchStudentCandidatesAction}
      searchParentCandidatesAction={searchParentCandidatesAction}
    />
  );
}
