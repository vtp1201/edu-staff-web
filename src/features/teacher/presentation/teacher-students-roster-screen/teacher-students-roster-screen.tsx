"use client";

import { Info, Search, Users, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ListError } from "@/components/shared/list-error";
import { ListPagination } from "@/components/shared/list-pagination";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TeacherStudentsRosterTable } from "./components/teacher-students-roster-table";
import type { TeacherStudentsRosterScreenVM } from "./teacher-students-roster-screen.i-vm";

const PAGE_SIZE = 10;
const ALL_CLASSES = "ALL";

interface Props {
  vm: TeacherStudentsRosterScreenVM;
  /** Storybook-only: render the loading skeleton. */
  loading?: boolean;
}

/**
 * Cross-class student roster (US-E13.9) — the index page the teacher sidebar has
 * always linked to. Read-only: the RSC page fetches once, filtering/pagination
 * are client-side over the already-aggregated list (no extra BE call).
 */
export function TeacherStudentsRosterScreen({ vm, loading = false }: Props) {
  const t = useTranslations("teacherStudentsRoster");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>(ALL_CLASSES);
  const [page, setPage] = useState(1);
  const searchId = useId();
  const classFilterId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vm.rows.filter(
      (row) =>
        (classFilter === ALL_CLASSES || row.className === classFilter) &&
        (q.length === 0 || row.displayName.toLowerCase().includes(q)),
    );
  }, [vm.rows, query, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const isFiltering = query.trim().length > 0 || classFilter !== ALL_CLASSES;
  /**
   * Every class's roster call failed (the class list itself resolved, so this is
   * NOT the `status === "error"` path). `rows` is empty for a reason that has
   * nothing to do with "no classes assigned" — say so instead of the misleading
   * empty copy.
   */
  const allClassesFailed = vm.failedClassCount > 0 && vm.rows.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-extrabold text-2xl text-edu-text-primary">
            {t("pageTitle")}
          </h1>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-edu-text-secondary text-xs">
            <Users aria-hidden="true" className="size-3.5" />
            {/* While filtering, the visible count must match the table the user
                is looking at (and the sr-only live region) — not the unfiltered
                total. `resultCountFiltered` keeps the total visible as "N / M". */}
            {isFiltering
              ? t("resultCountFiltered", {
                  count: filtered.length,
                  total: vm.rows.length,
                })
              : t("resultCount", { count: vm.rows.length })}
          </p>
        </div>

        {vm.status === "ready" && vm.rows.length > 0 && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
                htmlFor={classFilterId}
              >
                {t("classFilterLabel")}
              </label>
              <Select
                onValueChange={(value) => {
                  setClassFilter(value);
                  setPage(1);
                }}
                value={classFilter}
              >
                <SelectTrigger className="w-44" id={classFilterId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLASSES}>
                    {t("classFilterAll")}
                  </SelectItem>
                  {vm.classNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
                htmlFor={searchId}
              >
                {t("searchLabel")}
              </label>
              <div className="relative w-full max-w-xs">
                <Search
                  aria-hidden="true"
                  className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-edu-text-muted"
                />
                <Input
                  className="pl-9"
                  id={searchId}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t("searchPlaceholder")}
                  type="search"
                  value={query}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Partial degrade: some classes resolved, some did not — announce it
          instead of silently showing an incomplete list. */}
      {vm.status === "ready" &&
        vm.failedClassCount > 0 &&
        !allClassesFailed && (
          <p
            className="flex items-start gap-2 rounded-[var(--edu-radius-card)] border border-edu-warning/40 bg-edu-warning-light px-4 py-3 text-edu-warning-foreground text-sm"
            role="status"
          >
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t("partialFailureNotice", { count: vm.failedClassCount })}
          </p>
        )}

      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {isFiltering ? t("filteredCount", { count: filtered.length }) : null}
      </div>

      {loading ? (
        <ListSkeleton
          loadingAriaLabel={t("loadingLabel")}
          renderRow={() => (
            <div className="flex items-center gap-4 p-5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="ml-auto h-6 w-20 rounded-full" />
            </div>
          )}
          rows={6}
          variant="inline"
        />
      ) : vm.status === "error" ? (
        <ListError
          iconSize={10}
          message={t(`errors.${vm.errorKey ?? "unknown"}`)}
          onRetry={() => window.location.reload()}
          retryIcon="rotate"
          retryLabel={t("errorRetryAction")}
          shape="inline-card"
        />
      ) : (
        <section
          aria-label={t("studentListSection")}
          className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card"
        >
          {allClassesFailed ? (
            // Not "no classes assigned" — every class's roster call failed, so
            // this is a retryable error, not an empty state.
            <ListError
              description={t("emptyAllFailedBody", {
                count: vm.failedClassCount,
              })}
              iconSize={10}
              onRetry={() => window.location.reload()}
              retryIcon="rotate"
              retryLabel={t("errorRetryAction")}
              shape="inline-card"
              title={t("emptyAllFailed")}
            />
          ) : vm.rows.length === 0 ? (
            <EmptyState
              body={t("emptyBody")}
              icon={UsersRound}
              title={t("empty")}
            />
          ) : filtered.length === 0 ? (
            <p className="px-6 py-16 text-center text-edu-text-secondary text-sm">
              {t("noSearchResults")}
            </p>
          ) : (
            <>
              <TeacherStudentsRosterTable rows={pageRows} />
              <ListPagination
                formatShowing={({ from, to, total }) =>
                  t("showing", { from, to, total })
                }
                navLabel={t("paginationNav")}
                nextLabel={t("nextPage")}
                onPageChange={setPage}
                page={safePage}
                pageRowCount={pageRows.length}
                pageSize={PAGE_SIZE}
                prevLabel={t("prevPage")}
                total={filtered.length}
                totalPages={totalPages}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
