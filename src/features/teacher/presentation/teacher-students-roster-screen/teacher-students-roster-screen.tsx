"use client";

import {
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  Users,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ListError } from "@/components/shared/list-error";
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
import { cn } from "@/shared/utils";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-extrabold text-2xl text-edu-text-primary">
            {t("pageTitle")}
          </h1>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-edu-text-secondary text-xs">
            <Users aria-hidden="true" className="size-3.5" />
            {t("resultCount", { count: vm.rows.length })}
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
      {vm.status === "ready" && vm.failedClassCount > 0 && (
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
          {vm.rows.length === 0 ? (
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
              <Pagination
                onPageChange={setPage}
                page={safePage}
                pageRowCount={pageRows.length}
                pageSize={PAGE_SIZE}
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

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  pageRowCount,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageRowCount: number;
  onPageChange: (p: number) => void;
}) {
  const t = useTranslations("teacherStudentsRoster");
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + pageRowCount;

  const btn = (disabled: boolean) =>
    cn(
      "inline-flex size-11 items-center justify-center rounded-[7px] border border-edu-border",
      "text-edu-text-secondary outline-none motion-safe:transition-colors",
      "hover:bg-edu-bg focus-visible:ring-2 focus-visible:ring-ring",
      disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
    );

  return (
    <nav
      aria-label={t("paginationNav")}
      className="flex flex-wrap items-center gap-2.5 border-edu-border border-t px-5 py-3"
    >
      <div className="flex-1 text-edu-text-muted text-xs tabular-nums">
        {t("showing", { from, to, total })}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          aria-label={t("prevPage")}
          className={btn(page === 1)}
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <span
          aria-atomic="true"
          aria-live="polite"
          className="px-2 font-bold text-edu-text-secondary text-xs tabular-nums"
        >
          {page} / {totalPages}
        </span>
        <button
          aria-label={t("nextPage")}
          className={btn(page === totalPages)}
          disabled={page === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </nav>
  );
}
