"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ClipboardList, Lock, Plus, Search, SearchX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import { ScopeToggle } from "@/components/shared/scope-toggle";
import { Button } from "@/components/ui/button";
import type { QuestionEntity } from "../../domain/entities/question.entity";
import { isSearchFilterSatisfied } from "../../domain/use-cases/is-search-filter-satisfied";
import { questionBankKeys } from "../question-bank.query-keys";
import type { ListScope } from "../shared.i-vm";
import { QBFilterBar } from "./qb-filter-bar";
import { QBFilterRequiredPrompt } from "./qb-filter-required-prompt";
import { QBQuestionCard } from "./qb-question-card";
import { QBSkeleton } from "./qb-skeleton";
import { QuestionBankErrorState } from "./question-bank-error-state";
import type {
  QBQuestionCardVM,
  QuestionBankFilterState,
  QuestionBankListScreenVM,
} from "./question-bank-list-screen.i-vm";

const EMPTY_FILTERS: QuestionBankFilterState = {
  tag: "",
  subjectId: "",
  gradeLevel: "",
  questionType: "",
  difficulty: "",
  status: "",
};

const TAG_DEBOUNCE_MS = 350;
const PREVIEW_MAX = 140;

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n).trim()}…` : s;
}

export function QuestionBankListScreen({
  vm,
}: {
  vm: QuestionBankListScreenVM;
}) {
  const t = useTranslations("questionBank");
  const tCard = useTranslations("questionBank.card");
  const tErr = useTranslations("questionBank.errors");
  const router = useRouter();

  const [scope, setScope] = useState<ListScope>("mine");
  const [filters, setFilters] =
    useState<QuestionBankFilterState>(EMPTY_FILTERS);
  const [debouncedTag, setDebouncedTag] = useState("");
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  // FR-013 — debounce the free-text tag before it feeds the search query key.
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedTag(filters.tag),
      TAG_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [filters.tag]);

  // Immediate gate (indicator + prompt flip without waiting for the debounce).
  const filterSatisfied = isSearchFilterSatisfied(
    filters.subjectId,
    filters.tag,
  );
  // Debounced gate — what actually enables/keys the request.
  const querySatisfied = isSearchFilterSatisfied(
    filters.subjectId,
    debouncedTag,
  );

  // FR-005 split: subject-mode sends grade/difficulty as real server params;
  // tag-mode sends only the tag (grade/difficulty are client-side there).
  const searchServerParams = useMemo(() => {
    if (filters.subjectId) {
      return {
        subjectId: filters.subjectId,
        tag: debouncedTag.trim() || undefined,
        gradeLevel: filters.gradeLevel || undefined,
        difficulty: filters.difficulty || undefined,
      };
    }
    return { tag: debouncedTag.trim() || undefined };
  }, [filters.subjectId, filters.gradeLevel, filters.difficulty, debouncedTag]);

  const mineQuery = useInfiniteQuery({
    queryKey: questionBankKeys.listMineRoot(),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      let res = await vm.listMineAction(pageParam);
      // Silent stale-cursor recovery: drop cursor, refetch page 1.
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
    enabled: scope === "mine" && !vm.forbidden,
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const searchQuery = useInfiniteQuery({
    queryKey: questionBankKeys.searchRoot(searchServerParams),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      let res = await vm.searchAction(searchServerParams, pageParam);
      if (!res.ok && res.errorKey === "invalid-cursor") {
        res = await vm.searchAction(searchServerParams, undefined);
      }
      if (!res.ok) throw new Error(res.errorKey);
      return res.page;
    },
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: scope === "search" && querySatisfied && !vm.forbidden,
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const activeQuery = scope === "mine" ? mineQuery : searchQuery;
  const fetched: QuestionEntity[] = useMemo(
    () => activeQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [activeQuery.data],
  );

  // Client-side filter pipeline over the fetched page(s) (FR-005 split).
  const visible = useMemo(() => {
    let arr = fetched;
    if (scope === "mine") {
      if (filters.subjectId)
        arr = arr.filter((q) => q.subjectId === filters.subjectId);
      if (filters.status) arr = arr.filter((q) => q.status === filters.status);
      if (filters.tag.trim()) {
        const query = filters.tag.trim().toLowerCase();
        arr = arr.filter(
          (q) =>
            q.body.toLowerCase().includes(query) ||
            q.tags.some((tag) => tag.toLowerCase().includes(query)),
        );
      }
    }
    // Always client-side (FR-005): questionType both scopes; grade/difficulty
    // in tag-mode (harmless re-apply in subject-mode).
    if (filters.questionType)
      arr = arr.filter((q) => q.questionType === filters.questionType);
    if (filters.gradeLevel)
      arr = arr.filter((q) => q.gradeLevel === filters.gradeLevel);
    if (filters.difficulty)
      arr = arr.filter((q) => q.difficulty === filters.difficulty);
    return arr;
  }, [fetched, filters, scope]);

  const cards: QBQuestionCardVM[] = visible.map((q) => ({
    id: q.id,
    questionType: q.questionType,
    difficulty: q.difficulty,
    status: q.status,
    subjectName:
      vm.subjects.find((s) => s.id === q.subjectId)?.name ?? q.subjectId,
    gradeLevel: q.gradeLevel,
    bodyPreview: truncate(q.body, PREVIEW_MAX),
    tags: q.tags,
    isMine: scope === "mine",
    authorLabel: scope === "search" ? tCard("unknownAuthor") : undefined,
    openPath: `${vm.editPathPrefix}/${q.id}/edit`,
  }));

  const clientFiltersActive =
    filters.questionType !== "" ||
    filters.gradeLevel !== "" ||
    filters.difficulty !== "" ||
    (scope === "mine" &&
      (filters.subjectId !== "" ||
        filters.status !== "" ||
        filters.tag.trim() !== ""));

  const onFilterChange = (patch: Partial<QuestionBankFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
  };

  const onScopeChange = (next: ListScope) => {
    setScope(next);
    setFilters(EMPTY_FILTERS);
    setDebouncedTag("");
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setDebouncedTag("");
  };

  const showSearchGate = scope === "search" && !filterSatisfied;
  const isLoading = activeQuery.isLoading && activeQuery.fetchStatus !== "idle";
  const isError = activeQuery.isError;

  // Route guard rejected a non-teacher — full-page access-denied (NFR-008).
  // No query ever runs (both queries stay disabled via the early return).
  if (vm.forbidden) {
    return (
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-6 md:px-8">
        <div
          role="alert"
          className="flex flex-col items-center rounded-xl border border-border bg-card px-5 py-16 text-center"
        >
          <Lock className="size-12 text-edu-error-text" aria-hidden="true" />
          <p className="mt-4 font-bold text-base text-foreground">
            {t("title")}
          </p>
          <p className="mt-2 max-w-sm text-edu-text-secondary text-sm">
            {tErr("forbidden-browse")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-6 md:px-8">
      {vm.notice && !noticeDismissed && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          {vm.notice === "not-found" ? (
            <SearchX
              className="mt-0.5 size-5 shrink-0 text-edu-error-text"
              aria-hidden="true"
            />
          ) : (
            <Lock
              className="mt-0.5 size-5 shrink-0 text-edu-error-text"
              aria-hidden="true"
            />
          )}
          <p className="min-w-0 flex-1 font-bold text-foreground text-sm">
            {tErr(vm.notice)}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setNoticeDismissed(true)}
            aria-label={t("dismiss")}
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
            {t("subtitle")}
          </p>
        </div>
        <ScopeToggle<ListScope>
          value={scope}
          options={[
            {
              id: "mine",
              label: t("scopeToggle.mine"),
              count: scope === "mine" ? fetched.length : 0,
            },
            {
              id: "search",
              label: t("scopeToggle.search"),
              count: scope === "search" ? fetched.length : 0,
            },
          ]}
          onChange={onScopeChange}
          groupAriaLabel={t("scopeToggle.ariaLabel")}
        />
        {scope === "mine" && (
          <Button type="button" onClick={() => router.push(vm.createPath)}>
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            {t("createButton")}
          </Button>
        )}
      </div>

      <QBFilterBar
        filters={filters}
        subjects={vm.subjects}
        gradeOptions={vm.gradeOptions}
        scope={scope}
        isFilterSatisfied={filterSatisfied}
        onFilterChange={onFilterChange}
      />

      {showSearchGate ? (
        <QBFilterRequiredPrompt />
      ) : isLoading ? (
        <QBSkeleton />
      ) : isError ? (
        <QuestionBankErrorState
          title={t("error.title")}
          message={t("error.description")}
          retryLabel={t("error.retry")}
          onRetry={() => activeQuery.refetch()}
        />
      ) : cards.length === 0 ? (
        clientFiltersActive || scope === "search" ? (
          <EmptyState
            icon={Search}
            title={t("empty.noMatch")}
            body={t("empty.noMatchBody")}
            cta={
              clientFiltersActive
                ? {
                    label: t("empty.clearFilters"),
                    icon: X,
                    onClick: clearFilters,
                    variant: "secondary",
                  }
                : undefined
            }
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
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
          <div className="flex flex-col gap-3">
            {cards.map((card) => (
              <QBQuestionCard
                key={card.id}
                question={card}
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
