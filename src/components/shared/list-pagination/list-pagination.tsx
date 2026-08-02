"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";

/**
 * Canonical client-side prev/next pager (component-organization.md, decision
 * 0026). Promoted — moved, not copied — out of the two byte-identical local
 * `Pagination` components in `teacher-class-students-screen.tsx` and
 * `teacher-students-roster-screen.tsx`, which differed only in button size and
 * i18n namespace.
 *
 * Two deliberate deltas versus the older of the two originals:
 * 1. `size-11` (44×44px) buttons — the class-students copy used `size-9` (36px),
 *    below the WCAG 2.5.5 touch-target floor (accessibility.md).
 * 2. The "showing X–Y of Z" line uses `text-edu-text-secondary` (#5A6A85,
 *    5.48:1) instead of `text-edu-text-muted` (#8898A9, 2.75:1 — fails WCAG
 *    1.4.3 on the white card). A11Y-001, US-E13.9.
 *
 * Presentation-only: callers pass already-translated labels (it does NOT call
 * `useTranslations`). `formatShowing` is a function rather than a plain string
 * so the from/to range arithmetic — the actual duplicated logic — lives here
 * once; the caller only supplies its own ICU message.
 */
export interface ListPaginationRange {
  /** 1-based index of the first row on the current page. */
  from: number;
  /** 1-based index of the last row on the current page. */
  to: number;
  /** Total row count across all pages (already filtered, if filtering). */
  total: number;
}

export interface ListPaginationProps {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  /** Total rows across all pages. */
  total: number;
  pageSize: number;
  /** Rows actually rendered on the current page (short on the last page). */
  pageRowCount: number;
  onPageChange: (page: number) => void;
  /** Already-translated `aria-label` for the `<nav>`. */
  navLabel: string;
  /** Already-translated `aria-label` for the previous-page button. */
  prevLabel: string;
  /** Already-translated `aria-label` for the next-page button. */
  nextLabel: string;
  /** Formats the range caption, e.g. `(r) => t("showing", r)`. */
  formatShowing: (range: ListPaginationRange) => string;
  /** Merged onto the `<nav>` via cn() (per-screen padding/border overrides). */
  className?: string;
}

export function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  pageRowCount,
  onPageChange,
  navLabel,
  prevLabel,
  nextLabel,
  formatShowing,
  className,
}: ListPaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + pageRowCount;

  const btn = (disabled: boolean) =>
    cn(
      // 44×44px touch target (WCAG 2.5.5, accessibility.md).
      "inline-flex size-11 items-center justify-center rounded-[7px] border border-edu-border",
      "text-edu-text-secondary outline-none motion-safe:transition-colors",
      "hover:bg-edu-bg focus-visible:ring-2 focus-visible:ring-ring",
      disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
    );

  return (
    <nav
      aria-label={navLabel}
      className={cn(
        "flex flex-wrap items-center gap-2.5 border-edu-border border-t px-5 py-3",
        className,
      )}
    >
      <div className="flex-1 text-edu-text-secondary text-xs tabular-nums">
        {formatShowing({ from, to, total })}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          aria-label={prevLabel}
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
          aria-label={nextLabel}
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
