"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  GradeEntryStatusBadge,
  GradeRowStatusSummaryBadge,
} from "@/components/shared/grade-entry-status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import { deriveRowStatus } from "../../domain/entities/derive-row-status";
import type {
  AssessmentColumn,
  StudentScoreRow,
} from "../../domain/entities/grade-sheet.entity";
import { getScoreColorClass } from "./score-color";

interface Props {
  columns: AssessmentColumn[];
  rows: StudentScoreRow[];
  maxScore: number;
  onSaveScore: (
    studentId: string,
    columnId: string,
    value: number,
  ) => Promise<{ ok: boolean }>;
  /** submits ONE cell (clicking the DRAFT badge) */
  onSubmitCell: (studentId: string, columnId: string) => void;
  /** submits every DRAFT cell in one row ("Nộp dòng này") */
  onSubmitRow: (studentId: string) => void;
}

interface CellProps {
  row: StudentScoreRow;
  col: AssessmentColumn;
  maxScore: number;
  onSaveScore: Props["onSaveScore"];
  onSubmitCell: Props["onSubmitCell"];
}

function ScoreCell({
  row,
  col,
  maxScore,
  onSaveScore,
  onSubmitCell,
}: CellProps) {
  const t = useTranslations("gradeEntry");
  const errorId = useId();
  const cell = row.scores[col.id];
  const current = cell?.value ?? null;
  const status = cell?.status ?? "DRAFT";
  const [hasError, setHasError] = useState(false);
  const editable = status === "DRAFT";

  if (!editable) {
    return (
      <td className="px-3 py-2 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className={getScoreColorClass(current, maxScore)}>
            {current ?? "—"}
          </span>
          <GradeEntryStatusBadge status={status} />
        </div>
      </td>
    );
  }

  const ariaLabel = t("cellLabel", {
    column: col.label,
    student: row.studentName,
  });
  const submitAriaLabel = t("submitCellLabel", {
    column: col.label,
    student: row.studentName,
  });

  async function commit(raw: string) {
    if (raw.trim() === "") {
      setHasError(false);
      return;
    }
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0 || value > maxScore) {
      setHasError(true);
      return;
    }
    const result = await onSaveScore(row.studentId, col.id, value);
    setHasError(!result.ok);
  }

  return (
    <td className="px-2 py-1.5 text-center">
      <div className="flex flex-col items-center gap-1">
        <input
          type="number"
          min={0}
          max={maxScore}
          step={0.1}
          defaultValue={current ?? ""}
          aria-label={ariaLabel}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          onBlur={(e) => void commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={cn(
            "h-9 min-h-[44px] w-16 rounded-[8px] border border-border bg-background px-2 text-center text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            hasError && "border-destructive ring-1 ring-destructive",
          )}
        />
        {hasError ? (
          <span id={errorId} className="block text-xs text-edu-error-text">
            {t("errorOutOfRange", { max: maxScore })}
          </span>
        ) : current !== null ? (
          <button
            type="button"
            aria-label={submitAriaLabel}
            onClick={() => onSubmitCell(row.studentId, col.id)}
            className="min-h-[44px] rounded-full"
          >
            <GradeEntryStatusBadge status="DRAFT" />
          </button>
        ) : null}
      </div>
    </td>
  );
}

export function GradeEntryTable({
  columns,
  rows,
  maxScore,
  onSaveScore,
  onSubmitCell,
  onSubmitRow,
}: Props) {
  const t = useTranslations("gradeEntry");

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t("tableCaption")}</caption>
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            <th
              scope="col"
              className="px-3 py-2.5 text-left font-bold text-xs uppercase tracking-wide text-muted-foreground"
            >
              <span aria-hidden="true">#</span>
              <span className="sr-only">{t("studentCode")}</span>
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-left font-bold text-xs uppercase tracking-wide text-muted-foreground"
            >
              {t("studentName")}
            </th>
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className="px-3 py-2.5 text-center font-bold text-xs uppercase tracking-wide text-muted-foreground"
              >
                {t("columnHeader", { label: col.label, weight: col.weight })}
              </th>
            ))}
            <th
              scope="col"
              className="px-3 py-2.5 text-center font-bold text-xs uppercase tracking-wide text-muted-foreground"
            >
              {t("averageColumn")}
            </th>
            <th scope="col" className="px-3 py-2.5">
              <span className="sr-only">{t("submitRowButton")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowStatus = deriveRowStatus(row.scores);
            const hasDraft = Object.values(row.scores).some(
              (c) => c.status === "DRAFT" && c.value !== null,
            );
            return (
              <tr key={row.studentId} className="border-border border-t">
                <td className="px-3 py-2 text-muted-foreground text-sm">
                  {row.studentCode}
                </td>
                <td className="px-3 py-2 font-medium text-foreground text-sm">
                  <span className="block">{row.studentName}</span>
                  {rowStatus !== "empty" ? (
                    <span className="mt-1 block">
                      <GradeRowStatusSummaryBadge rowStatus={rowStatus} />
                    </span>
                  ) : null}
                </td>
                {columns.map((col) => (
                  <ScoreCell
                    key={`${row.studentId}-${col.id}`}
                    row={row}
                    col={col}
                    maxScore={maxScore}
                    onSaveScore={onSaveScore}
                    onSubmitCell={onSubmitCell}
                  />
                ))}
                <td className="px-3 py-2 text-center font-bold text-sm">
                  <span className={getScoreColorClass(row.average, maxScore)}>
                    {row.average ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!hasDraft}
                    onClick={() => onSubmitRow(row.studentId)}
                  >
                    {t("submitRowButton")}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
