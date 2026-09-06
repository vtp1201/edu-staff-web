"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import type { ClassAttendanceSummary } from "../../../domain/entities/student-attendance-summary.entity";
import type { AttendanceFailure } from "../../../domain/failures/attendance.failure";
import {
  isInvalidRange,
  isNoTerms,
  isSummaryRange,
  resolveSummaryRange,
  type SummaryRangeKind,
  type SummaryYear,
  termsOf,
} from "../../../domain/resolve-summary-range";
import { attendanceKeys } from "../attendance-query-keys";
import type { AttendanceActionResult } from "../attendance-screen.i-vm";
import { AttendanceSummaryTab } from "./attendance-summary-tab";
import type {
  AttendanceSummaryVM,
  SummaryControlsVM,
  SummaryNotice,
} from "./attendance-summary-tab.i-vm";

type Props = {
  classId?: string;
  getSummaryAction: (
    classId: string,
    from: string,
    to: string,
  ) => Promise<AttendanceActionResult<ClassAttendanceSummary>>;
  /** `null` = the academic calendar could not be read (403 or empty). */
  getTermsAction: () => Promise<SummaryYear[] | null>;
  /** Injected clock (`YYYY-MM-DD`) — stories and tests pass a fixed day. */
  today?: string;
};

const RANGE_KINDS: SummaryRangeKind[] = ["month", "term", "year"];

function parseKind(raw: string | null): SummaryRangeKind {
  return RANGE_KINDS.find((kind) => kind === raw) ?? "month";
}

/**
 * Client container for the summary tab (US-E24.14).
 *
 * URL state (`?range=`, `?month=`, `?term=`) is NET-NEW and owned entirely by
 * this tab; `?class=`/`?date=` stay owned by `AttendanceFilters`, so switching
 * class keeps the chosen range and vice versa. Neither of the other two tabs
 * reads these params, and the query key family (`attendance-summary`) is
 * disjoint from `attendance-history` — changing the range therefore cannot
 * refetch or invalidate Today/History (proved in
 * `attendance-query-keys.test.ts`).
 *
 * The range is resolved CLIENT-SIDE before the query runs, so an over-366-day
 * span or a calendar-less term/year selection never becomes a doomed request —
 * it becomes a notice.
 */
export function AttendanceSummaryContainer({
  classId,
  getSummaryAction,
  getTermsAction,
  today,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // One clock read per mount, so a re-render can never move the range under a
  // running query.
  const todayIso = useMemo(
    () => today ?? new Date().toISOString().slice(0, 10),
    [today],
  );

  const rangeKind = parseKind(searchParams?.get("range") ?? null);
  const monthParam = searchParams?.get("month") ?? todayIso.slice(0, 7);
  const termParam = searchParams?.get("term") ?? null;

  const termsQuery = useQuery({
    queryKey: attendanceKeys.terms(),
    queryFn: getTermsAction,
    // The academic calendar changes a few times a year, not per range switch.
    staleTime: Number.POSITIVE_INFINITY,
  });

  const years = termsQuery.data ?? [];
  const availableTerms = termsOf(years);
  // Once the calendar read has SETTLED with nothing usable, `?range=term`
  // (a stale link, a back-navigation) can no longer be honoured: the term and
  // year segments are not rendered, so keeping that kind selected would show a
  // segmented control with nothing selected and no secondary control — a
  // broken-looking dead end. Fall back to the one kind that always works.
  const noTermsDegrade = !termsQuery.isPending && availableTerms.length === 0;
  const effectiveKind: SummaryRangeKind = noTermsDegrade ? "month" : rangeKind;
  const outcome = resolveSummaryRange(effectiveKind, todayIso, years, {
    month: monthParam,
    termId: termParam ?? undefined,
  });
  const range = isSummaryRange(outcome) ? outcome : null;

  const summaryQuery = useQuery({
    queryKey: attendanceKeys.summary(
      classId ?? "",
      range?.startDate ?? "",
      range?.endDate ?? "",
    ),
    enabled: Boolean(classId) && range !== null,
    queryFn: async () => {
      const result = await getSummaryAction(
        classId as string,
        (range as { startDate: string }).startDate,
        (range as { endDate: string }).endDate,
      );
      if (!result.ok) throw new Error(result.errorKey);
      return result.data;
    },
  });

  function update(next: Partial<SummaryControlsVM>) {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.rangeKind) sp.set("range", next.rangeKind);
    if (next.month) sp.set("month", next.month);
    if (next.termId) sp.set("term", next.termId);
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  const controls: SummaryControlsVM = {
    rangeKind: effectiveKind,
    month: monthParam,
    // Reflect the term the resolver actually applied, so the select never shows
    // a term the numbers were not computed for.
    termId: termParam ?? appliedTermId(availableTerms, todayIso),
    availableTerms: termsQuery.isPending ? null : availableTerms,
  };

  const notice: SummaryNotice | null = noticeOf({
    outcome,
    // The URL asked for a term/year range we had to downgrade: say so, or the
    // segment silently changing under the teacher looks like a bug.
    degradedFromTermUrl: noTermsDegrade && rangeKind !== "month",
  });

  return (
    <AttendanceSummaryTab
      vm={buildVm({
        classId,
        range,
        rangeKind: effectiveKind,
        availableTerms,
        query: {
          isPending: summaryQuery.isPending,
          isError: summaryQuery.isError,
          error: summaryQuery.error,
          data: summaryQuery.data,
        },
      })}
      controls={controls}
      maxMonth={todayIso.slice(0, 7)}
      notice={notice}
      onControlsChange={update}
      onRetry={() => summaryQuery.refetch()}
    />
  );
}

/**
 * One notice per CAUSE. `resolveSummaryRange` distinguishes an over-366-day
 * span from an unusable selection (a future `?month=`, a malformed one, a term
 * with inverted dates); collapsing both into "over 366 days" told a teacher who
 * picked next month to shorten a one-month range.
 */
function noticeOf({
  outcome,
  degradedFromTermUrl,
}: {
  outcome: ReturnType<typeof resolveSummaryRange>;
  degradedFromTermUrl: boolean;
}): SummaryNotice | null {
  if (isNoTerms(outcome) || degradedFromTermUrl) return "no-terms";
  if (isInvalidRange(outcome)) {
    return outcome.reason === "too-large" ? "range-too-large" : "invalid-range";
  }
  return null;
}

/** The term the resolver would pick with no explicit selection. */
function appliedTermId(
  terms: ReturnType<typeof termsOf>,
  todayIso: string,
): string | null {
  const containing = terms.find(
    (term) => todayIso >= term.startDate && todayIso <= term.endDate,
  );
  return containing?.id ?? terms[terms.length - 1]?.id ?? null;
}

function buildVm({
  classId,
  range,
  rangeKind,
  availableTerms,
  query,
}: {
  classId?: string;
  range: { startDate: string; endDate: string } | null;
  rangeKind: SummaryRangeKind;
  availableTerms: ReturnType<typeof termsOf>;
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data?: ClassAttendanceSummary;
  };
}): AttendanceSummaryVM {
  // No class picked, or no resolvable range: nothing was asked for, so this is
  // an empty state, NOT an endless skeleton.
  if (!classId || range === null) {
    return { status: "empty", range: range ?? { startDate: "", endDate: "" } };
  }
  if (query.isError) {
    return { status: "error", errorKey: errorKeyOf(query.error) };
  }
  if (query.isPending || !query.data) return { status: "loading" };

  const summary = query.data;
  const hasAnyRecord = summary.students.some((s) => s.recorded > 0);
  if (!hasAnyRecord) return { status: "empty", range };

  return {
    status: "ready",
    range,
    rangeKind,
    availableTerms: availableTerms.length > 0 ? availableTerms : null,
    summary,
  };
}

/** The query function throws `new Error(failure.type)`; anything else is an
 *  unexpected client-side fault and reads as `unknown`. */
function errorKeyOf(error: unknown): AttendanceFailure["type"] {
  const message = error instanceof Error ? error.message : "";
  const known: AttendanceFailure["type"][] = [
    "forbidden",
    "not-found",
    "correction-window-expired",
    "student-not-enrolled",
    "invalid-request",
    "network-error",
    "unknown",
  ];
  return known.find((key) => key === message) ?? "unknown";
}
