"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { cn } from "@/shared/utils";
import type {
  AssessmentColumn,
  StudentScoreRow,
} from "../../domain/entities/grade-sheet.entity";
import { getScoreColorClass } from "./score-color";

interface Props {
  columns: AssessmentColumn[];
  rows: StudentScoreRow[];
  maxScore: number;
  /** true when the whole sheet is locked (PUBLISHED/PENDING_APPROVAL) */
  readOnly: boolean;
  /** returns the out-of-range error key for the cell, or null on success */
  onSaveScore: (
    studentId: string,
    columnId: string,
    value: number,
  ) => Promise<{ ok: boolean }>;
}

interface CellProps {
  row: StudentScoreRow;
  col: AssessmentColumn;
  maxScore: number;
  readOnly: boolean;
  onSaveScore: Props["onSaveScore"];
}

function ScoreCell({ row, col, maxScore, readOnly, onSaveScore }: CellProps) {
  const t = useTranslations("gradeEntry");
  const errorId = useId();
  const current = row.scores[col.id];
  const [hasError, setHasError] = useState(false);

  if (readOnly) {
    return (
      <td className="px-3 py-2 text-center text-sm">
        <span className={getScoreColorClass(current ?? null, maxScore)}>
          {current ?? "—"}
        </span>
      </td>
    );
  }

  const ariaLabel = t("cellLabel", {
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
          "h-9 w-16 rounded-[8px] border border-border bg-background px-2 text-center text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          hasError && "border-destructive ring-1 ring-destructive",
        )}
      />
      {hasError ? (
        <span id={errorId} className="mt-0.5 block text-xs text-edu-error-text">
          {t("errorOutOfRange", { max: maxScore })}
        </span>
      ) : null}
    </td>
  );
}

export function GradeEntryTable({
  columns,
  rows,
  maxScore,
  readOnly,
  onSaveScore,
}: Props) {
  const t = useTranslations("gradeEntry");

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
      {/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: editable score grid uses grid semantics intentionally (WCAG, cells are inputs) */}
      <table role="grid" className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            <th className="px-3 py-2.5 text-left font-bold text-xs uppercase tracking-wide text-muted-foreground">
              #
            </th>
            <th className="px-3 py-2.5 text-left font-bold text-xs uppercase tracking-wide text-muted-foreground">
              {t("studentName")}
            </th>
            {columns.map((col) => (
              <th
                key={col.id}
                className="px-3 py-2.5 text-center font-bold text-xs uppercase tracking-wide text-muted-foreground"
              >
                {t("columnHeader", { label: col.label, weight: col.weight })}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center font-bold text-xs uppercase tracking-wide text-muted-foreground">
              {t("averageColumn")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-border border-t">
              <td className="px-3 py-2 text-muted-foreground text-sm">
                {row.studentCode}
              </td>
              <td className="px-3 py-2 font-medium text-foreground text-sm">
                {row.studentName}
              </td>
              {columns.map((col) => (
                <ScoreCell
                  key={`${row.studentId}-${col.id}`}
                  row={row}
                  col={col}
                  maxScore={maxScore}
                  readOnly={readOnly}
                  onSaveScore={onSaveScore}
                />
              ))}
              <td className="px-3 py-2 text-center font-bold text-sm">
                <span className={getScoreColorClass(row.average, maxScore)}>
                  {row.average ?? "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
