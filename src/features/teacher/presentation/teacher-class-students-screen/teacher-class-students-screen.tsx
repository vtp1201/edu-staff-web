"use client";

import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/utils";
import { TeacherRosterTable } from "./components/teacher-roster-table";
import type { TeacherClassStudentsScreenVM } from "./teacher-class-students-screen.i-vm";

const PAGE_SIZE = 10;

interface Props {
  vm: TeacherClassStudentsScreenVM;
  /** Storybook-only: render the loading skeleton. */
  loading?: boolean;
}

export function TeacherClassStudentsScreen({ vm, loading = false }: Props) {
  const t = useTranslations("teacherClasses.studentPage");
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
      <Breadcrumb classesHref={vm.classesHref} className={vm.className} />

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

      <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        {loading ? (
          <TableSkeleton />
        ) : vm.status === "error" ? (
          <p
            role="alert"
            className="px-6 py-12 text-center text-sm text-edu-error-text"
          >
            {t("errorRetry")}
          </p>
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
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              pageRowCount={pageRows.length}
              onPageChange={setPage}
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
  return (
    <nav
      aria-label={t("breadcrumbClasses")}
      className="flex flex-wrap items-center gap-1.5 text-sm text-edu-text-muted"
    >
      <Link
        href={classesHref}
        className="rounded-md px-1 font-medium outline-none hover:text-edu-text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("breadcrumbClasses")}
      </Link>
      <ChevronRight className="size-3.5" aria-hidden="true" />
      <span className="font-semibold text-edu-text-secondary">{className}</span>
    </nav>
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
  const t = useTranslations("teacherClasses.studentPage");
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + pageRowCount;

  const btn = (disabled: boolean) =>
    cn(
      "inline-flex size-9 items-center justify-center rounded-[7px] border border-edu-border",
      "text-edu-text-secondary outline-none motion-safe:transition-colors",
      "hover:bg-edu-bg focus-visible:ring-2 focus-visible:ring-ring",
      disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
    );

  return (
    <nav
      aria-label={t("breadcrumbClasses")}
      className="flex flex-wrap items-center gap-2.5 border-t border-edu-border px-5 py-3"
    >
      <div className="flex-1 text-xs text-edu-text-muted tabular-nums">
        {t("showing", { from, to, total })}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={t("prevPage")}
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className={btn(page === 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="px-2 text-xs font-bold text-edu-text-secondary tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          aria-label={t("nextPage")}
          disabled={page === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className={btn(page === totalPages)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-5" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => i).map((i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-[var(--edu-radius-btn)] bg-muted/50"
        />
      ))}
    </div>
  );
}
