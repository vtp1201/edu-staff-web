"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";

interface RosterPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  /** Count of rows on the current page (drives the "showing X–Y" label). */
  pageRowCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Builds [1, '…', 4, 5, 6, '…', 12] style page list. */
function buildPages(page: number, totalPages: number): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }
  return pages;
}

const pageBtn = (active: boolean, disabled: boolean) =>
  cn(
    "inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-[7px] border px-2 font-bold text-xs",
    "motion-safe:transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-edu-border text-edu-text-secondary hover:bg-edu-bg",
    disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
  );

export function RosterPagination({
  page,
  totalPages,
  totalCount,
  pageRowCount,
  pageSize,
  onPageChange,
}: RosterPaginationProps) {
  const t = useTranslations("adminRoster");
  if (totalCount === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + pageRowCount;
  const pages = buildPages(page, totalPages);

  return (
    <nav
      aria-label={t("pagination.nav")}
      className="flex flex-wrap items-center gap-2.5 border-edu-border border-t px-5 py-3"
    >
      <div className="flex-1 text-edu-text-muted text-xs tabular-nums">
        {t("table.showing", { from, to, total: totalCount })}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Trang trước"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={pageBtn(false, page === 1)}
        >
          <ChevronLeft className="size-3" aria-hidden="true" />
        </button>
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis position is stable for a given page list
            <span key={`e-${i}`} className="px-1 text-edu-text-muted text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={pageBtn(p === page, false)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Trang sau"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={pageBtn(false, page === totalPages)}
        >
          <ChevronRight className="size-3" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
