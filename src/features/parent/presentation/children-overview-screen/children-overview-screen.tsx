"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { ListError } from "@/components/shared/list-error";
import { Skeleton } from "@/components/ui/skeleton";
import { academicRecordHref } from "./build-children-overview-vm";
import { ChildOverviewCard } from "./child-overview-card";
import { CHILDREN_OVERVIEW_QUERY_KEY } from "./children-overview.query-keys";
import type { ChildrenOverviewFetchResult } from "./children-overview-screen.i-vm";

export interface ChildrenOverviewScreenProps {
  /** Tenant-scoped `/t/{tenant}/parent/children` prefix, built by the RSC page. */
  basePath: string;
  onFetch: () => Promise<ChildrenOverviewFetchResult>;
}

/**
 * "My children" index (US-E20.4) — makes the already-existing per-child
 * academic-record route reachable from the parent sidebar. Owns the screen
 * `useQuery` (no `initialData`; the RSC page never awaits it, mirroring
 * `ParentConsentSection`) and dispatches loading / error / empty / success.
 *
 * Read-only: no mutation, and no consent state is surfaced (AC-004).
 */
export function ChildrenOverviewScreen({
  basePath,
  onFetch,
}: ChildrenOverviewScreenProps) {
  const t = useTranslations("parentChildrenOverview");
  const tShared = useTranslations("parentLinks.consentSection");

  const query = useQuery({
    queryKey: CHILDREN_OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      const result = await onFetch();
      if (!result.success) throw new Error(result.errorKey);
      return result.children;
    },
    retry: false,
  });

  // Same gating as the consent section: after an error, `status` stays "error"
  // while `refetch()` runs, so the retry must show loading, not the error card.
  const showLoading = query.isPending || (query.isError && query.isFetching);
  const showError = query.isError && !query.isFetching;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">
          {t("pageTitle")}
        </h1>
      </header>

      {showLoading && (
        <ChildrenOverviewSkeleton loadingAriaLabel={t("loadingAriaLabel")} />
      )}

      {showError && (
        <ListError
          title={tShared("error.title")}
          description={tShared("error.body")}
          retryLabel={tShared("error.retry")}
          shape="bordered-card"
          iconVariant="boxed"
          iconSize={6}
          retryIcon="refresh"
          retryButtonVariant="default"
          retryButtonSize="sm"
          className="py-10"
          onRetry={() => query.refetch()}
        />
      )}

      {query.isSuccess && query.data.length === 0 && (
        <EmptyState
          icon={Users}
          title={tShared("empty.title")}
          body={tShared("empty.body")}
        />
      )}

      {query.isSuccess && query.data.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {query.data.map((child) => (
            <li key={child.studentId}>
              <ChildOverviewCard
                child={child}
                href={academicRecordHref(basePath, child.studentId)}
                ctaLabel={t("cardCta")}
                ariaLabel={t("cardAriaLabel", { name: child.fullName })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Card-grid shimmer. Deliberately NOT the shared `ListSkeleton`: that renders a
 * flat row list inside ONE bordered card, while this screen is a grid of
 * separate cards — a genuinely different layout, same ruling as
 * `ConsentSkeleton` (INFRA-shared-list-states).
 */
function ChildrenOverviewSkeleton({
  loadingAriaLabel,
}: {
  loadingAriaLabel: string;
}) {
  return (
    <div>
      <span className="sr-only" role="status">
        {loadingAriaLabel}
      </span>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="space-y-4 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
