"use client";

import { ChevronRight, Search, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ListPagination } from "@/components/shared/list-pagination";
import { Input } from "@/components/ui/input";
import { TeacherRosterTable } from "./components/teacher-roster-table";
import type { TeacherClassStudentsScreenVM } from "./teacher-class-students-screen.i-vm";

const PAGE_SIZE = 10;

interface Props {
  vm: TeacherClassStudentsScreenVM;
  /** Storybook-only: render the loading skeleton. */
  loading?: boolean;
  /** True when embedded in the class-hub shell (US-E24.8), whose own header
   *  already renders the breadcrumb + class name — rendering this screen's
   *  breadcrumb there would duplicate it. Default false keeps every existing
   *  standalone consumer/story unchanged. */
  hideBreadcrumb?: boolean;
}

export function TeacherClassStudentsScreen({
  vm,
  loading = false,
  hideBreadcrumb = false,
}: Props) {
  const t = useTranslations("teacherClasses.studentPage");
  const tRoot = useTranslations("teacherClasses");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return vm.students;
    return vm.students.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q),
    );
  }, [vm.students, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  function onSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {!hideBreadcrumb && (
        <Breadcrumb classesHref={vm.classesHref} className={vm.className} />
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-edu-text-primary">
            {vm.className}
          </h1>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-edu-text-secondary">
            <Users className="size-3.5" aria-hidden="true" />
            {t("resultCount", { count: vm.students.length })}
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search
            className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-edu-text-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {query.trim().length > 0
          ? t("filteredCount", { count: filtered.length })
          : null}
      </div>

      <section
        aria-label={t("studentListSection")}
        className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card"
      >
        {loading ? (
          <TableSkeleton />
        ) : vm.status === "error" ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 px-6 py-12 text-center text-sm text-edu-error-text"
          >
            <p>{tRoot(`errors.${vm.errorKey ?? "unknown"}`)}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--edu-radius-btn)] bg-edu-primary-accessible px-4 py-2 font-bold text-primary-foreground outline-none motion-safe:transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              {t("errorRetryAction")}
            </button>
          </div>
        ) : vm.students.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-edu-text-secondary">
            {t("empty")}
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-edu-text-secondary">
            {t("noSearchResults")}
          </p>
        ) : (
          <>
            <TeacherRosterTable students={pageRows} />
            <ListPagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              pageRowCount={pageRows.length}
              onPageChange={setPage}
              navLabel={t("paginationNav")}
              prevLabel={t("prevPage")}
              nextLabel={t("nextPage")}
              formatShowing={({ from, to, total }) =>
                t("showing", { from, to, total })
              }
            />
          </>
        )}
      </section>
    </div>
  );
}

function Breadcrumb({
  classesHref,
  className,
}: {
  classesHref: string;
  className: string;
}) {
  const t = useTranslations("teacherClasses.studentPage");
  const tRoot = useTranslations("teacherClasses");
  return (
    <nav aria-label={tRoot("breadcrumbLabel")}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-edu-text-secondary">
        <li>
          <Link
            href={classesHref}
            className="rounded-md px-1 font-medium outline-none hover:text-edu-text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("breadcrumbClasses")}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5" />
        </li>
        <li>
          <span
            aria-current="page"
            className="font-semibold text-edu-text-secondary"
          >
            {className}
          </span>
        </li>
      </ol>
    </nav>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-5" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => i).map((i) => (
        <div
          key={i}
          className="h-11 rounded-[var(--edu-radius-btn)] bg-muted/50 motion-safe:animate-pulse"
        />
      ))}
    </div>
  );
}
