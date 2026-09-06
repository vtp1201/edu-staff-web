"use client";

import {
  AlertTriangle,
  CalendarCheck2,
  Clock,
  FileText,
  Info,
  Percent,
  UserCheck,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import type {
  AbsenceHistoryKind,
  AbsenceHistoryRow,
} from "@/features/attendance/domain/entities/absence-history-row.entity";
import type {
  AttendanceSummary,
  MonthlyRollup,
} from "@/features/attendance/domain/entities/attendance-summary.entity";
import { parseIsoDate } from "@/shared/parse-iso-date";
import { cn } from "@/shared/utils";
import {
  monthToDate,
  rateProgressColor,
  rateTone,
} from "./attendance-summary.utils";

/** Locale-ordered numeric day; UTC pairs with `parseIsoDate`'s noon instant. */
const DATE_FORMAT = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
} as const;

const MONTH_FORMAT = {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
} as const;

/** Status is never colour alone (accessibility.md): icon + text badge. */
const HISTORY_ICON = {
  absent: AlertTriangle,
  excused: FileText,
  pending: Clock,
} as const satisfies Record<AbsenceHistoryKind, typeof AlertTriangle>;

const HISTORY_TONE = {
  absent: "error",
  excused: "warning",
  // A pending request is neither good nor bad yet — `primary`, per the
  // design-spec's `statusTones.pending`. It is deliberately NOT the same tone
  // as `excused`: "requested" must not look like "already approved".
  pending: "primary",
} as const;

const HISTORY_ICON_BOX = {
  absent: "bg-edu-error/15 text-edu-error-text",
  excused: "bg-edu-warning/15 text-edu-warning-foreground",
  pending: "bg-primary/15 text-edu-text-primary",
} as const;

export interface AttendanceSummaryBlockProps {
  summary: AttendanceSummary;
  months: MonthlyRollup[];
  history: AbsenceHistoryRow[];
  className?: string;
}

/**
 * The shared "chuyên cần" summary block (design `APSummary`) — four stat cards,
 * a per-month rollup and the absence history (US-E24.6).
 *
 * Lands directly in `components/shared/` because BOTH callers exist on day one
 * (`/student/attendance` and `/parent/attendance`), which is exactly decision
 * `0026`'s "composed + used by ≥2 screens" case.
 *
 * PURE PROPS — it fetches nothing and knows nothing about students, parents or
 * roles. Both screens compute `summary`/`months` with `summarizeAttendance()`
 * and `history` with `joinAbsenceReasons()`, so the two screens can never drift
 * apart on the arithmetic.
 *
 * It DOES own its i18n (`attendanceSummary` namespace) rather than taking ~20
 * copy props: the copy is identical on both screens, and the `ChildSwitcher`
 * precedent (a shared component reading `Common.*`) already establishes that a
 * shared component with fixed copy may translate itself.
 *
 * VOCABULARY: every count is a number of *buổi/ngày*, not periods — core
 * records attendance per day (packet deviation, mirrored in design-spec).
 */
export function AttendanceSummaryBlock({
  summary,
  months,
  history,
  className,
}: AttendanceSummaryBlockProps) {
  const t = useTranslations("attendanceSummary");
  const format = useFormatter();
  // Generated, not hard-coded: two blocks on one page must not share an id.
  const byMonthId = useId();
  const historyId = useId();

  const hasRate = summary.rate !== null;
  const dash = t("unavailableValue");

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {/* 2×2 at 375px (AC), 4-up from md. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard
          icon={Percent}
          tone={rateTone(summary.rate)}
          label={t("rateLabel")}
          value={
            hasRate ? (
              t("monthRate", { rate: summary.rate ?? 0 })
            ) : (
              <UnavailableValue dash={dash} hint={t("unavailableHint")} />
            )
          }
        />
        <StatCard
          icon={UserCheck}
          tone="success"
          label={t("presentLabel")}
          value={
            summary.total > 0 ? (
              `${summary.presentCount}/${summary.total}`
            ) : (
              <UnavailableValue dash={dash} hint={t("unavailableHint")} />
            )
          }
        />
        <StatCard
          icon={FileText}
          tone="warning"
          label={t("excusedLabel")}
          value={String(summary.excusedCount)}
        />
        <StatCard
          icon={AlertTriangle}
          tone="error"
          label={t("unexcusedLabel")}
          value={String(summary.unexcusedCount)}
        />
      </div>

      {/* LATE is in the denominator but not the numerator (BE US-245) — say so
          rather than letting the rate look wrong. */}
      {summary.lateCount > 0 ? (
        <p className="text-edu-text-secondary text-xs">
          {t("lateNotice", { count: summary.lateCount })}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <section
          aria-labelledby={byMonthId}
          className="rounded-[var(--edu-radius-card)] border border-border bg-card p-4 shadow-card sm:p-5"
        >
          <h2 id={byMonthId} className="font-bold text-foreground text-sm">
            {t("byMonthTitle")}
          </h2>
          <p className="mt-1 text-muted-foreground text-xs">
            {t("byMonthSubtitle")}
          </p>

          <ul className="mt-4 flex flex-col gap-3.5">
            {months.map((month) => {
              const monthDate = monthToDate(month.month);
              const monthLabel = monthDate
                ? format.dateTime(monthDate, MONTH_FORMAT)
                : month.month;
              return (
                <li key={month.month} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-foreground text-xs">
                      {monthLabel}
                    </span>
                    <span className="flex items-baseline gap-2 text-xs">
                      {month.excusedCount > 0 ? (
                        <span className="font-bold text-edu-warning-foreground">
                          {t("monthExcused", { count: month.excusedCount })}
                        </span>
                      ) : null}
                      {month.unexcusedCount > 0 ? (
                        <span className="font-bold text-edu-error-text">
                          {t("monthUnexcused", { count: month.unexcusedCount })}
                        </span>
                      ) : null}
                      <span className="font-bold text-foreground">
                        {month.rate === null
                          ? t("monthNoRate")
                          : t("monthRate", { rate: month.rate })}
                      </span>
                    </span>
                  </div>
                  <ProgressBar
                    value={month.rate ?? 0}
                    color={rateProgressColor(month.rate)}
                    label={t("monthProgressLabel", { month: monthLabel })}
                  />
                </li>
              );
            })}
          </ul>

          <p className="mt-4 flex items-start gap-2 rounded-[var(--edu-radius-btn)] border border-primary/20 bg-primary/8 px-3 py-2.5 text-edu-text-secondary text-xs leading-relaxed">
            <Info
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0 text-primary"
            />
            {t("regulationNote")}
          </p>
        </section>

        <section
          aria-labelledby={historyId}
          className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card"
        >
          <div className="flex items-center justify-between gap-3 border-border border-b px-4 py-4 sm:px-5">
            <h2 id={historyId} className="font-bold text-foreground text-sm">
              {t("historyTitle")}
            </h2>
            <StatusBadge tone="primary">
              {t("historyCount", { count: history.length })}
            </StatusBadge>
          </div>

          {history.length === 0 ? (
            <EmptyState
              icon={CalendarCheck2}
              title={t("historyEmptyTitle")}
              body={t("historyEmptyBody")}
            />
          ) : (
            <ul>
              {history.map((row, index) => {
                const Icon = HISTORY_ICON[row.kind];
                const day = parseIsoDate(row.date);
                const end = row.endDate ? parseIsoDate(row.endDate) : null;
                const statusLabel =
                  row.kind === "pending"
                    ? t("statusPending")
                    : row.kind === "excused"
                      ? t("statusExcused")
                      : t("statusAbsent");
                return (
                  <li
                    key={row.key}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 sm:px-5",
                      index < history.length - 1 && "border-border border-b",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8.5 shrink-0 place-items-center rounded-[9px]",
                        HISTORY_ICON_BOX[row.kind],
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground text-sm">
                        {day ? format.dateTime(day, DATE_FORMAT) : row.date}
                      </p>
                      {row.kind === "pending" && end && day ? (
                        <p className="mt-0.5 text-muted-foreground text-xs">
                          {t("pendingRange", {
                            startDate: format.dateTime(day, DATE_FORMAT),
                            endDate: format.dateTime(end, DATE_FORMAT),
                          })}
                        </p>
                      ) : null}
                      {row.reason ? (
                        <p className="mt-0.5 text-edu-text-secondary text-xs">
                          {row.reason}
                        </p>
                      ) : row.kind === "absent" ? (
                        <p className="mt-0.5 text-edu-error-text text-xs">
                          {t("noReason")}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge
                      tone={HISTORY_TONE[row.kind]}
                      className="shrink-0"
                    >
                      {statusLabel}
                    </StatusBadge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * "No value exists" — an em-dash plus screen-reader text. NEVER `0`, which
 * would read as a real measurement, and never `NaN` (AC).
 */
function UnavailableValue({ dash, hint }: { dash: string; hint: string }) {
  return (
    <>
      <span aria-hidden="true">{dash}</span>
      <span className="sr-only">{hint}</span>
    </>
  );
}
