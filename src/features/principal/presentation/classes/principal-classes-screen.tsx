"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { ClassManagementFailure } from "@/features/admin/class-management/domain/failures/class-management.failure";
import { ClassFiltersBar } from "./class-filters-bar";
import { ClassesCardList } from "./classes-card-list";
import { ClassesEmptyState } from "./classes-empty-state";
import { ClassesErrorState } from "./classes-error-state";
import { ClassesLoadingSkeleton } from "./classes-loading-skeleton";
import { ClassesTable } from "./classes-table";
import {
  type ClassGradeFilter,
  type ClassSort,
  type ClassStatusFilter,
  deriveVisibleClasses,
} from "./derive-visible-classes";
import type { PrincipalClassesScreenProps } from "./principal-classes-screen.i-vm";
import { ViewTeachersCta } from "./view-teachers-cta";

/**
 * School-wide, read-only class list for the `principal` role (US-E13.8).
 *
 * Local `useState` only (no TanStack Query): the initial page arrives as RSC
 * props and "load more" is a plain array append via a Server Action — there is
 * no cache to invalidate. Status/grade/name filter + sort are client-side
 * because the real `GET /api/v1/classes` contract has no such query param.
 * Read-only by design — no create/rename/archive/assign control (FR-009).
 */
export function PrincipalClassesScreen({
  vm,
  onLoadMore,
  loading = false,
}: PrincipalClassesScreenProps) {
  const t = useTranslations("principalClasses");
  const router = useRouter();

  const [classes, setClasses] = useState<Class[]>(vm.classes);
  const [nextCursor, setNextCursor] = useState<string | null>(vm.nextCursor);
  const [hasMore, setHasMore] = useState<boolean>(vm.hasMore);
  const [statusFilter, setStatusFilter] = useState<ClassStatusFilter>("ACTIVE");
  const [gradeFilter, setGradeFilter] = useState<ClassGradeFilter>("ALL");
  const [nameSearch, setNameSearch] = useState("");
  const [sort, setSort] = useState<ClassSort | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<
    ClassManagementFailure["type"] | null
  >(null);

  const visibleClasses = useMemo(
    () =>
      deriveVisibleClasses(classes, {
        statusFilter,
        gradeFilter,
        nameSearch,
        sort,
      }),
    [classes, statusFilter, gradeFilter, nameSearch, sort],
  );

  const gradeOptions = useMemo(() => {
    const levels = [...new Set(classes.map((c) => c.gradeLevel))].sort(
      (a, b) => a - b,
    );
    return levels.map((value) => ({
      value,
      label: t("gradeN", { n: value }),
    }));
  }, [classes, t]);

  const hasActiveFilter =
    statusFilter !== "ACTIVE" ||
    gradeFilter !== "ALL" ||
    nameSearch.trim() !== "";

  const statusLabels = {
    ACTIVE: t("status.ACTIVE"),
    ARCHIVED: t("status.ARCHIVED"),
  };
  const columnLabels = {
    name: t("table.name"),
    gradeLevel: t("table.gradeLevel"),
    homeroom: t("table.homeroom"),
    studentCount: t("table.studentCount"),
    status: t("table.status"),
    caption: t("table.caption"),
  };

  const clearFilters = () => {
    setStatusFilter("ACTIVE");
    setGradeFilter("ALL");
    setNameSearch("");
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    const result = await onLoadMore(vm.academicYear, nextCursor);
    if (result.ok) {
      // Append, never replace (AC-1.19).
      const page = result.data;
      setClasses((prev) => [...prev, ...page.data]);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } else {
      // Existing rows stay; the control offers an inline retry (AC-1.20).
      setLoadMoreError(result.errorKey);
    }
    setLoadingMore(false);
  };

  const header = (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-extrabold text-2xl text-foreground">
            {t("title")}
          </h1>
          <StatusBadge tone="primary">
            {t("classCount", { count: classes.length })}
          </StatusBadge>
          {vm.academicYear && (
            <StatusBadge tone="muted">
              {t("academicYearBadge", { year: vm.academicYear })}
            </StatusBadge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
    </header>
  );

  if (vm.fetchError) {
    return (
      <section className="space-y-4 p-4 sm:p-6">
        {header}
        <ClassesErrorState
          message={t(`errors.${vm.fetchError}`)}
          onRetry={
            vm.fetchError === "forbidden" ? undefined : () => router.refresh()
          }
          retryLabel={t("retry")}
          variant={vm.fetchError === "forbidden" ? "forbidden" : "network"}
        />
      </section>
    );
  }

  if (loading) {
    return (
      <section className="space-y-4 p-4 sm:p-6">
        {header}
        {/* ONE live region for both breakpoint variants — a `role="status"` per
            variant would announce the same text twice on mount. */}
        <span className="sr-only" role="status">
          {t("table.loading")}
        </span>
        <div className="hidden md:block">
          <ClassesLoadingSkeleton columnLabels={columnLabels} variant="table" />
        </div>
        <div className="md:hidden">
          <ClassesLoadingSkeleton variant="card" />
        </div>
      </section>
    );
  }

  const isEmpty = visibleClasses.length === 0;
  // AC-1.4 vs AC-1.5: only offer "clear filters" when the CURRENT state is
  // genuinely filter-caused. Zero rows loaded at all, or zero visible while the
  // filters are still at their defaults (e.g. a school whose classes are ALL
  // archived under the default ACTIVE filter), would give a button whose click
  // changes nothing — a dead end announced as an actionable fix.
  const emptyVariant =
    classes.length === 0 || !hasActiveFilter ? "zero-tenant" : "zero-filtered";
  // Exactly ONE "clear filters" control at a time: when the filtered-empty
  // state renders its own, the filter bar hides its duplicate (two buttons with
  // the same accessible name would be an a11y/UX smell).
  const showFilterBarClear =
    hasActiveFilter && !(isEmpty && emptyVariant === "zero-filtered");

  return (
    <section className="space-y-4 p-4 sm:p-6">
      {header}

      <ClassFiltersBar
        gradeFilter={gradeFilter}
        gradeOptions={gradeOptions}
        hasActiveFilter={showFilterBarClear}
        labels={{
          statusLabel: t("filters.statusLabel"),
          statusOptions: {
            active: t("status.ACTIVE"),
            archived: t("status.ARCHIVED"),
            all: t("status.ALL"),
          },
          gradeLabel: t("filters.gradeLabel"),
          allGradesLabel: t("filters.allGrades"),
          searchLabel: t("filters.searchLabel"),
          searchPlaceholder: t("filters.searchPlaceholder"),
          sortLabel: t("filters.sortLabel"),
          sortNone: t("filters.sortNone"),
          sortByName: t("filters.sortByName"),
          sortByGrade: t("filters.sortByGrade"),
          sortAscAriaLabel: t("filters.sortAsc"),
          sortDescAriaLabel: t("filters.sortDesc"),
          clearFiltersLabel: t("filters.clearFilters"),
        }}
        nameSearch={nameSearch}
        onClearFilters={clearFilters}
        onGradeChange={setGradeFilter}
        onNameSearchChange={setNameSearch}
        onSortChange={setSort}
        onStatusChange={setStatusFilter}
        sort={sort}
        statusFilter={statusFilter}
      />

      {isEmpty ? (
        <ClassesEmptyState
          clearFiltersLabel={t("filters.clearFilters")}
          message={
            emptyVariant === "zero-filtered"
              ? t("empty.filtered")
              : t("empty.tenantWide")
          }
          onClearFilters={clearFilters}
          variant={emptyVariant}
        />
      ) : (
        <>
          {vm.teachersHref && (
            <div className="flex justify-end">
              <ViewTeachersCta
                href={vm.teachersHref}
                label={t("viewTeachers")}
              />
            </div>
          )}
          {/* Breakpoint-driven, not useMediaQuery — both render, CSS hides the
              inactive one, so there is no SSR/hydration mismatch. */}
          <div className="hidden md:block">
            <ClassesTable
              classes={visibleClasses}
              columnLabels={columnLabels}
              gradeLabel={(n) => t("gradeN", { n })}
              homeroomUnassignedLabel={t("homeroomUnassigned")}
              statusLabels={statusLabels}
            />
          </div>
          <div className="md:hidden">
            <ClassesCardList
              cardSummary={(name, status) =>
                t("table.cardSummary", { name, status })
              }
              classes={visibleClasses}
              fieldLabels={{
                gradeLevel: columnLabels.gradeLevel,
                homeroom: columnLabels.homeroom,
                studentCount: columnLabels.studentCount,
              }}
              gradeLabel={(n) => t("gradeN", { n })}
              homeroomUnassignedLabel={t("homeroomUnassigned")}
              statusLabels={statusLabels}
            />
          </div>
          {loadMoreError === "forbidden" ? (
            // AC-1.27 — a mid-session 403 is not retryable: drop the control
            // entirely (same "absent, not disabled" treatment as the full-page
            // forbidden state) instead of offering a retry that can only 403
            // again. Already-loaded rows stay. Other failures keep the
            // ordinary inline retry.
            <ClassesErrorState
              message={t("errors.forbidden")}
              variant="forbidden"
            />
          ) : (
            <LoadMoreButton
              errorLabel={t("loadMore.retry")}
              hasError={loadMoreError !== null}
              hasMore={hasMore}
              isLoadingMore={loadingMore}
              label={t("loadMore.label")}
              onLoadMore={handleLoadMore}
            />
          )}
        </>
      )}
    </section>
  );
}
