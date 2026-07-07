"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuditLogFilter } from "../../domain/entities/audit-log-filter.entity";
import type { AuditLogFailure } from "../../domain/failures/audit-log.failure";
import type {
  AuditLogActionResult,
  AuditLogScreenProps,
} from "./audit-log-screen.i-vm";
import {
  AuditLogResults,
  type AuditLogResultsStatus,
} from "./components/audit-log-results";
import { ComplianceNotice } from "./components/compliance-notice";
import { type AuditLogFilterDraft, FilterBar } from "./components/filter-bar";
import {
  filtersEqual,
  filterToQueryString,
  parseFilterFromParams,
} from "./components/filter-search-params";
import { LoadMoreButton } from "./components/load-more-button";

/** Query-key factory — three-level, matching notificationKeys convention. */
export const auditLogKeys = {
  all: ["audit-log"] as const,
  lists: () => [...auditLogKeys.all, "list"] as const,
  list: (filter: AuditLogFilter) => [...auditLogKeys.lists(), filter] as const,
};

type OkPage = Extract<AuditLogActionResult, { ok: true }>;

interface ThrownFailure {
  type: AuditLogFailure["type"];
  retryable: boolean;
}

/**
 * Audit-log screen container (US-E12.12). The ONLY component touching TanStack
 * Query / URL search params / the Server Action ref. Applied filter lives in the
 * URL (shareable, back-button friendly); a local draft mirrors the filter inputs
 * for responsive typing and is debounced back into the URL. RSC seeds page 1 for
 * the default/deep-linked filter via initialData.
 */
export function AuditLogScreen({
  initialFilter,
  initialPage,
  initialErrorKey,
  getAuditLogAction,
}: AuditLogScreenProps) {
  const t = useTranslations("auditLog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const appliedQs = searchParams.toString();
  const appliedFilter = useMemo(
    () => parseFilterFromParams(new URLSearchParams(appliedQs)),
    [appliedQs],
  );

  // Draft = responsive mirror of the filter inputs (local state).
  const [draft, setDraft] = useState<AuditLogFilterDraft>(initialFilter);

  // URL → draft: keep inputs in sync with the URL (incl. back/forward nav).
  useEffect(() => {
    setDraft(appliedFilter);
  }, [appliedFilter]);

  // Draft → URL (debounced): the URL stays the single source of truth for the
  // query key; only writes when the serialized draft actually differs.
  useEffect(() => {
    const nextQs = filterToQueryString(draft);
    if (nextQs === appliedQs) return;
    const id = setTimeout(() => {
      router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [draft, appliedQs, pathname, router]);

  // Seed the infinite query ONLY for the exact filter RSC rendered, and only if
  // the RSC fetch succeeded (a failed RSC fetch runs fresh client-side).
  const initialData = useMemo(() => {
    if (initialErrorKey) return undefined;
    if (!filtersEqual(appliedFilter, initialFilter)) return undefined;
    return {
      pages: [{ ok: true, data: initialPage } satisfies OkPage],
      pageParams: [null as string | null],
    };
  }, [appliedFilter, initialFilter, initialErrorKey, initialPage]);

  const query = useInfiniteQuery({
    queryKey: auditLogKeys.list(appliedFilter),
    queryFn: async ({ pageParam }): Promise<OkPage> => {
      const res = await getAuditLogAction(appliedFilter, pageParam);
      if (!res.ok) {
        throw { type: res.errorKey, retryable: res.retryable } as ThrownFailure;
      }
      return res;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.data.hasMore ? lastPage.data.nextCursor : undefined,
    initialData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) =>
      Boolean((error as unknown as ThrownFailure | undefined)?.retryable) &&
      failureCount < 2,
  });

  const events = useMemo(
    () => query.data?.pages.flatMap((p) => p.data.events) ?? [],
    [query.data],
  );

  const errorKey: AuditLogFailure["type"] | null = query.isError
    ? ((query.error as unknown as ThrownFailure | undefined)?.type ?? "unknown")
    : null;

  const status: AuditLogResultsStatus = query.isError
    ? "error"
    : query.isLoading
      ? "loading"
      : events.length === 0
        ? "empty"
        : "success";

  const handleFilterChange = useCallback(
    (patch: Partial<AuditLogFilterDraft>) => {
      setDraft((d) => ({ ...d, ...patch }));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setDraft({});
  }, []);

  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);

  const handleLoadMore = useCallback(() => {
    void query.fetchNextPage();
  }, [query]);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 p-6 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>

      <ComplianceNotice />

      <FilterBar
        filters={draft}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      <AuditLogResults
        status={status}
        events={events}
        errorKey={errorKey}
        onRetry={handleRetry}
      />

      {status === "success" && (
        <LoadMoreButton
          hasMore={query.hasNextPage ?? false}
          isLoadingMore={query.isFetchingNextPage}
          onLoadMore={handleLoadMore}
        />
      )}
    </div>
  );
}
