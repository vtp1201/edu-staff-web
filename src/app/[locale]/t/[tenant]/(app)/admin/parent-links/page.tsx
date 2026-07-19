import { getTranslations } from "next-intl/server";
import { makeListParentStudentLinksUseCase } from "@/bootstrap/di/parent-student-link.di";
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
 */
export default async function AdminParentLinksPage({
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

  const useCase = await makeListParentStudentLinksUseCase();
  const result = await useCase.execute({
    q: initialFilter.q || undefined,
    classId: initialFilter.classId,
    cursor: null,
    limit: PARENT_LINKS_PAGE_SIZE,
  });

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
