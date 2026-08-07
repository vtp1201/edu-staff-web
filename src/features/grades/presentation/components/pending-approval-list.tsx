"use client";

import { ChevronRight, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ListError } from "@/components/shared/list-error";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { LoadMoreButton } from "@/components/shared/load-more-button";
import { StatusBadge } from "@/components/shared/status-badge/status-badge";
import { formatAbsoluteTime, formatRelativeTime } from "@/shared/relative-time";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type {
  ClassSubjectOption,
  PendingApprovalPageResult,
  PendingApprovalVM,
} from "../grade-entry-screen/grade-entry-screen.i-vm";
import { buildPendingApprovalRows } from "./build-pending-approval-rows";

export interface PendingApprovalListProps {
  /** RSC-seeded first page + how that read went. */
  seed: PendingApprovalVM;
  /** Picker options — the only source of display names for a batch's ids. */
  classSubjects: ClassSubjectOption[];
  /** Fetches one further page, or re-fetches the first page (`null`) on retry. */
  loadPage: (cursor: string | null) => Promise<PendingApprovalPageResult>;
  /** Jumps the screen's selection to this batch's class-subject-term tuple. */
  onSelect: (batch: {
    classId: string;
    subjectId: string;
    termId: string;
  }) => void;
  /** Already-translated failure copy (the screen owns the failure→copy map). */
  getFailureMessage: (type: GradesFailure["type"]) => string;
  /** True while the RSC page itself is re-rendering the seeded page. */
  isLoading?: boolean;
}

/**
 * Tenant-wide "waiting on you" discovery list for the ADMIN/MANAGER approver
 * grade view (US-E18.46, BE US-186).
 *
 * Solves the friction the approver screens shipped with: the class-subject-term
 * picker required the approver to ALREADY know which tuple had pending work.
 * Each row is a single button that jumps the picker straight to that tuple, so
 * discovery and navigation are one action.
 *
 * Feature-local by placement rule: exactly one screen renders it
 * (`GradeEntryScreen` in approver mode, mounted on the two already-reachable
 * approver routes). It uses the canonical shared list-state components rather
 * than a bespoke skeleton/error card, and promotes to `components/shared/` if a
 * second screen ever needs it.
 *
 * Pagination is explicit "load more" (not auto-drain): the list is the
 * approver's work queue, so it must never silently truncate, but draining every
 * page up front would spend N round-trips on a triage list whose first page is
 * already sorted oldest-first.
 */
export function PendingApprovalList({
  seed,
  classSubjects,
  loadPage,
  onSelect,
  getFailureMessage,
  isLoading = false,
}: PendingApprovalListProps) {
  const t = useTranslations("gradeEntry");
  const locale = useLocale();

  const [items, setItems] = useState(seed.items);
  const [cursor, setCursor] = useState(seed.nextCursor);
  const [hasMore, setHasMore] = useState(seed.hasMore);
  // Seeded from the RSC read's outcome, then owned by this component: a failed
  // FIRST read shows the error card, a failed LOAD-MORE keeps the rows already
  // on screen and only re-labels the button.
  const [error, setError] = useState<GradesFailure["type"] | null>(seed.error);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  async function fetchPage(next: string | null) {
    setIsFetching(true);
    setLoadMoreError(false);
    const result = await loadPage(next);
    setIsFetching(false);
    if (!result.ok) {
      if (next === null) setError(result.errorKey);
      else setLoadMoreError(true);
      return;
    }
    setError(null);
    setCursor(result.page.nextCursor);
    setHasMore(result.page.hasMore);
    setItems((prev) =>
      next === null ? result.page.items : [...prev, ...result.page.items],
    );
  }

  const rows = buildPendingApprovalRows(items, classSubjects);
  const now = Date.now();

  return (
    <section
      aria-labelledby="pending-approval-heading"
      className="flex flex-col gap-3"
    >
      <h2
        id="pending-approval-heading"
        className="font-extrabold text-foreground text-lg"
      >
        {t("pendingTitle")}
      </h2>

      {isLoading ? (
        <ListSkeleton
          loadingAriaLabel={t("pendingLoading")}
          rows={3}
          variant="inline"
          renderRow={() => (
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          )}
        />
      ) : error ? (
        <ListError
          shape="inline-card"
          iconSize={10}
          retryIcon="rotate"
          message={getFailureMessage(error)}
          retryLabel={t("pendingRetry")}
          onRetry={() => void fetchPage(null)}
        />
      ) : rows.length === 0 ? (
        <p className="rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card px-4 py-8 text-center text-muted-foreground text-sm">
          {t("pendingEmpty")}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
            {rows.map((row) => (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() =>
                    onSelect({
                      classId: row.classId,
                      subjectId: row.subjectId,
                      termId: row.termId,
                    })
                  }
                  // The visible label is already the full sentence a screen
                  // reader needs; `aria-label` restates it as ONE string so the
                  // count and the wait time are announced with the target
                  // instead of as loose neighbouring text.
                  aria-label={t("pendingRowLabel", {
                    class: row.classLabel,
                    subject: row.subjectLabel,
                    term: row.termId,
                    count: row.pendingCount,
                  })}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-bold text-foreground text-sm">
                      {row.classLabel} — {row.subjectLabel}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                      <span title={formatAbsoluteTime(row.submittedAt, locale)}>
                        {t("pendingWaiting", {
                          time: formatRelativeTime(
                            row.submittedAt,
                            locale,
                            now,
                          ),
                        })}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusBadge tone="warning">
                      {t("pendingCountLabel", { count: row.pendingCount })}
                    </StatusBadge>
                    <span className="text-muted-foreground text-xs">
                      {row.termId}
                    </span>
                    <ChevronRight
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <LoadMoreButton
            hasMore={hasMore}
            isLoadingMore={isFetching}
            hasError={loadMoreError}
            onLoadMore={() => void fetchPage(cursor)}
            label={t("pendingLoadMore")}
            errorLabel={t("pendingLoadMoreError")}
          />
        </>
      )}
    </section>
  );
}
