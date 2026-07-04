"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/shared/status-badge/status-badge";
import type { ColumnType } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  ConductGrade,
  GradeBookRow,
} from "@/features/grades/domain/entities/grade-book.entity";
import { getScoreColorClass } from "@/features/grades/presentation/grade-entry-screen/score-color";
import { cn } from "@/shared/utils";
import type { GradeBookTableVM } from "./grade-book-table.i-vm";

const MAX_SCORE = 10;

/** Group-header tint per assessment column type (token-only). */
const GROUP_TINT: Record<ColumnType, string> = {
  TX: "bg-primary/12",
  GK: "bg-edu-warning/12",
  CK: "bg-edu-error/12",
};

const CONDUCT_TONE: Record<ConductGrade, StatusTone> = {
  Tot: "success",
  Kha: "primary",
  TB: "warning",
  Yeu: "error",
};

type ConductKey = "conductTot" | "conductKha" | "conductTB" | "conductYeu";

const CONDUCT_KEY: Record<ConductGrade, ConductKey> = {
  Tot: "conductTot",
  Kha: "conductKha",
  TB: "conductTB",
  Yeu: "conductYeu",
};

export function GradeBookTable({
  gradeBook,
  role,
  isPublished,
}: GradeBookTableVM) {
  const t = useTranslations("gradeBook");
  const captionId = useId();
  const columns = gradeBook.scheme.columns;
  const showRoster =
    role === "teacher" || role === "principal" || role === "admin";

  // Publish gate: student / parent see nothing until published.
  if (!(showRoster || isPublished)) {
    return (
      <div
        className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-[12px] border border-edu-info bg-edu-info-light p-8 text-center"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="font-bold text-card-foreground text-sm">
          {t("notPublishedBanner")}
        </p>
        <p className="text-muted-foreground text-sm">
          {t("notPublishedDescription")}
        </p>
      </div>
    );
  }

  if (gradeBook.rows.length === 0) {
    return (
      <div
        className="flex min-h-40 items-center justify-center rounded-[12px] border border-border border-dashed bg-card p-8 text-center text-muted-foreground text-sm"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {t("emptyState")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* iOS momentum scroll: no Tailwind utility for -webkit-overflow-scrolling. */}
      {/* biome-ignore lint/a11y/useSemanticElements: US-E17.2 (AC-03) mandates an explicit role="region" on this scroll container div; not a <section>. */}
      <div
        className="overflow-x-auto rounded-[12px] border border-border bg-card shadow-card"
        style={{ WebkitOverflowScrolling: "touch" }}
        role="region"
        aria-labelledby={captionId}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: US-E17.2 (A11Y-001, WCAG 2.1.1) — an overflow-x scroll region MUST be focusable so keyboard users can scroll to columns past the sticky first column; native arrow/PageDown scrolling needs the container in the tab order.
        tabIndex={0}
      >
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption id={captionId} className="sr-only">
            {t("tableCaption")}
          </caption>
          <thead>
            {/* Tier 1: group headers per assessment column type. */}
            <tr className="border-border border-b">
              <th
                scope="col"
                rowSpan={2}
                className="sticky left-0 z-[1] border-edu-border border-r bg-edu-card px-4 py-2 text-left font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
              >
                {t("colStudent")}
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "px-4 py-2 text-center font-bold text-edu-text-primary text-xs",
                    GROUP_TINT[col.type],
                  )}
                >
                  {t("colGroup", { label: col.label, weight: col.weight })}
                </th>
              ))}
              <th
                scope="col"
                rowSpan={2}
                className="px-4 py-2 text-center font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
              >
                {t("colAverage")}
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="px-4 py-2 text-center font-bold text-edu-text-secondary text-xs uppercase tracking-wide"
              >
                {t("colConduct")}
              </th>
            </tr>
            {/* Tier 2: per-column type sub-label. */}
            <tr className="border-border border-b">
              {columns.map((col) => (
                <th
                  key={`${col.id}-sub`}
                  scope="col"
                  className="px-4 py-1.5 text-center font-medium text-edu-text-secondary text-xs"
                >
                  {col.type === "TX"
                    ? t("bandHeaderTX")
                    : col.type === "GK"
                      ? t("bandHeaderGK")
                      : t("bandHeaderCK")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gradeBook.rows.map((row) => (
              <GradeRow
                key={row.studentId}
                row={row}
                columnIds={columns.map((c) => c.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GradeRow({
  row,
  columnIds,
}: {
  row: GradeBookRow;
  columnIds: string[];
}) {
  const t = useTranslations("gradeBook");
  return (
    <tr className="border-border border-b last:border-0">
      <th
        scope="row"
        className="sticky left-0 z-[1] border-edu-border border-r bg-edu-card px-4 py-2 text-left font-medium text-foreground"
      >
        <span className="block">{row.studentName}</span>
        <span className="block text-edu-text-secondary text-xs">
          {row.studentCode}
        </span>
      </th>
      {columnIds.map((colId) => {
        const score = row.scores[colId] ?? null;
        return (
          <td
            key={colId}
            className={cn(
              "px-4 py-2 text-center tabular-nums",
              getScoreColorClass(score, MAX_SCORE),
            )}
          >
            {score === null ? (
              <>
                <span aria-hidden="true">—</span>
                <span className="sr-only">{t("scoreNotEntered")}</span>
              </>
            ) : (
              score
            )}
          </td>
        );
      })}
      <td
        className={cn(
          "px-4 py-2 text-center font-bold tabular-nums",
          getScoreColorClass(row.average, MAX_SCORE),
        )}
      >
        {row.average === null ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">{t("scoreNotEntered")}</span>
          </>
        ) : (
          row.average
        )}
      </td>
      <td className="px-4 py-2 text-center">
        <StatusBadge tone={CONDUCT_TONE[row.conductGrade]}>
          {t(CONDUCT_KEY[row.conductGrade])}
        </StatusBadge>
      </td>
    </tr>
  );
}
