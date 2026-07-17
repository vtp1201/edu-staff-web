"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Lock,
  Plus,
  ScrollText,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import { Button } from "@/components/ui/button";
import type { LessonPlanEntity } from "../../domain/entities/lesson-plan.entity";
import { DOCUMENT_SECTION_KEYS } from "../../domain/entities/lesson-plan.entity";
import { lessonPlanKeys } from "../lesson-plan.query-keys";
import type { ListScope } from "../shared.i-vm";
import { LessonPlanErrorState } from "./lesson-plan-error-state";
import { LessonPlanFilterBar } from "./lesson-plan-filter-bar";
import type {
  LessonPlanFilterState,
  LessonPlanListScreenVM,
  LPCardVM,
} from "./lesson-plan-list-screen.i-vm";
import { LessonPlanSkeleton } from "./lesson-plan-skeleton";
import { LPCard } from "./lp-card";
import { OwnerToggle } from "./owner-toggle";

const EMPTY_FILTERS: LessonPlanFilterState = {
  search: "",
  subjectId: "",
  gradeLevel: "",
  status: "",
};

function filledSections(p: LessonPlanEntity): number {
  return DOCUMENT_SECTION_KEYS.filter((k) => p[k].trim().length > 0).length;
}

export function LessonPlanListScreen({ vm }: { vm: LessonPlanListScreenVM }) {
  const t = useTranslations("lessonPlan");
  const tErr = useTranslations("lessonPlan.errors");
  const router = useRouter();

  const [scope, setScope] = useState<ListScope>("mine");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );
  const [filters, setFilters] = useState<LessonPlanFilterState>(EMPTY_FILTERS);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const mineQuery = useInfiniteQuery({
    queryKey: lessonPlanKeys.listMineRoot(),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      let res = await vm.listMineAction(pageParam);
      // Silent stale-cursor recovery: drop cursor, refetch page 1 (AC-006.6).
      if (!res.ok && res.errorKey === "invalid-cursor") {
        res = await vm.listMineAction(undefined);
      }
      if (!res.ok) throw new Error(res.errorKey);
      return res.page;
    },
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    initialData: vm.initialMinePage
      ? { pages: [vm.initialMinePage], pageParams: [undefined] }
      : undefined,
    enabled: scope === "mine",
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const browseQuery = useInfiniteQuery({
    queryKey: lessonPlanKeys.listBySubjectRoot(selectedSubjectId ?? ""),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const sid = selectedSubjectId as string;
      let res = await vm.listBySubjectAction(sid, { cursor: pageParam });
      if (!res.ok && res.errorKey === "invalid-cursor") {
        res = await vm.listBySubjectAction(sid, {});
      }
      if (!res.ok) throw new Error(res.errorKey);
      return res.page;
    },
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: scope === "browse" && !!selectedSubjectId,
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const activeQuery = scope === "mine" ? mineQuery : browseQuery;
  const fetched: LessonPlanEntity[] = useMemo(
    () => activeQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [activeQuery.data],
  );

  // Client-side filter pipeline over the fetched page(s) (spec §6).
  const visible = useMemo(() => {
    let arr = fetched;
    if (filters.subjectId && scope === "mine")
      arr = arr.filter((p) => p.subjectId === filters.subjectId);
    if (filters.gradeLevel)
      arr = arr.filter((p) => p.gradeLevel === filters.gradeLevel);
    if (filters.status && scope === "mine")
      arr = arr.filter((p) => p.status === filters.status);
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      arr = arr.filter((p) => p.title.toLowerCase().includes(q));
    }
    return arr;
  }, [fetched, filters, scope]);

  const cards: LPCardVM[] = visible.map((p) => ({
    id: p.planId,
    title: p.title,
    subjectName:
      vm.subjects.find((s) => s.id === p.subjectId)?.name ?? p.subjectId,
    gradeLevel: p.gradeLevel,
    status: p.status,
    filledSectionsCount: filledSections(p),
    tags: p.tags,
    updatedAtDisplay: new Date(p.updatedAt).toLocaleDateString(),
    isMine: p.teacherId === vm.currentTeacherId,
    ownerLabel: t("card.unknownOwner"),
    openPath: `${vm.planPathPrefix}/${p.planId}/edit`,
  }));

  const clientFiltersActive =
    filters.search !== "" ||
    (scope === "mine" && (filters.subjectId !== "" || filters.status !== "")) ||
    filters.gradeLevel !== "";

  const onFilterChange = (patch: Partial<LessonPlanFilterState>) => {
    // In browse scope the subject dropdown IS the server-side subject selector.
    if (scope === "browse" && patch.subjectId !== undefined) {
      setSelectedSubjectId(patch.subjectId || null);
      return;
    }
    setFilters((f) => ({ ...f, ...patch }));
  };

  const onScopeChange = (next: ListScope) => {
    setScope(next);
    setFilters(EMPTY_FILTERS);
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const barFilters: LessonPlanFilterState =
    scope === "browse"
      ? { ...filters, subjectId: selectedSubjectId ?? "" }
      : filters;

  const isLoading = activeQuery.isLoading && activeQuery.fetchStatus !== "idle";
  const isError = activeQuery.isError;

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-6 md:px-8">
      {vm.notice && !noticeDismissed && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          {vm.notice === "access-denied" ? (
            <Lock
              className="mt-0.5 size-5 shrink-0 text-edu-error-text"
              aria-hidden="true"
            />
          ) : (
            <SearchX
              className="mt-0.5 size-5 shrink-0 text-edu-error-text"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground text-sm">
              {vm.notice === "access-denied"
                ? tErr("accessDenied.title")
                : tErr("not-found")}
            </p>
            {vm.notice === "access-denied" && (
              <p className="mt-0.5 text-edu-text-secondary text-sm">
                {tErr("accessDenied.body")}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setNoticeDismissed(true)}
            aria-label={t("error.retry")}
            className="shrink-0"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-60 flex-1">
          <h1 className="font-extrabold text-2xl text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-edu-text-secondary text-sm">
            {scope === "mine" ? t("subtitle") : t("subtitleBrowse")}
          </p>
        </div>
        <OwnerToggle
          scope={scope}
          mineCount={scope === "mine" ? fetched.length : 0}
          publishedCount={scope === "browse" ? fetched.length : 0}
          onScopeChange={onScopeChange}
          labels={{
            groupAriaLabel: t("ownerToggle.ariaLabel"),
            mine: t("ownerToggle.mine"),
            school: t("ownerToggle.school"),
          }}
        />
        {scope === "mine" && (
          <Button type="button" onClick={() => router.push(vm.createPath)}>
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            {t("createButton")}
          </Button>
        )}
      </div>

      <LessonPlanFilterBar
        filters={barFilters}
        subjects={vm.subjects}
        gradeOptions={vm.gradeOptions}
        scope={scope}
        onFilterChange={onFilterChange}
      />

      {scope === "browse" && !selectedSubjectId ? (
        <EmptyState
          icon={BookOpen}
          title={t("browse.promptTitle")}
          body={t("browse.promptBody")}
        />
      ) : isLoading ? (
        <LessonPlanSkeleton />
      ) : isError ? (
        <LessonPlanErrorState
          title={t("error.title")}
          message={t("error.description")}
          retryLabel={t("error.retry")}
          onRetry={() => activeQuery.refetch()}
        />
      ) : cards.length === 0 ? (
        scope === "browse" ? (
          <EmptyState icon={ScrollText} title={t("browse.emptyTitle")} />
        ) : clientFiltersActive ? (
          <EmptyState
            icon={Search}
            title={t("empty.noMatch")}
            body={t("empty.noMatchBody")}
            cta={{
              label: t("error.retry"),
              icon: X,
              onClick: clearFilters,
              variant: "secondary",
            }}
          />
        ) : (
          <EmptyState
            icon={ScrollText}
            title={t("empty.title")}
            body={t("empty.body")}
            cta={{
              label: t("empty.cta"),
              icon: Plus,
              onClick: () => router.push(vm.createPath),
            }}
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {cards.map((card) => (
              <LPCard
                key={card.id}
                plan={card}
                onOpen={() => router.push(card.openPath)}
              />
            ))}
          </div>
          <LoadMoreButton
            hasMore={activeQuery.hasNextPage}
            isLoadingMore={activeQuery.isFetchingNextPage}
            onLoadMore={() => activeQuery.fetchNextPage()}
            label={t("loadMore")}
            errorLabel={t("error.retry")}
          />
        </>
      )}
    </main>
  );
}
