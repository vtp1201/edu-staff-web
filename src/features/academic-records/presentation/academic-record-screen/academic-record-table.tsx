"use client";

import { useTranslations } from "next-intl";
import { getScoreColorClass } from "@/features/grades/presentation/grade-entry-screen/score-color";
import { cn } from "@/shared/utils";
import type { TermRecord } from "../../domain/entities/academic-record.entity";

export interface AcademicRecordTableProps {
  termRecord: TermRecord;
}

/**
 * The term's column axis: the union of every subject's snapshot columns, in
 * first-seen order. `core`'s `gradeSnapshot` is a DYNAMIC column array per
 * subject (US-E18.54) — there are no fixed tx1/tx2/giữa-kỳ/cuối-kỳ slots, and
 * two subjects in the same term may legitimately carry different columns, so a
 * subject with no value for a column renders "—".
 *
 * Keyed by `columnName`, not `columnId`: column ids are per-(subject, term)
 * rows in `core`, so keying by id would give one header per subject.
 */
export function deriveColumnAxis(termRecord: TermRecord): string[] {
  const axis: string[] = [];
  for (const subject of termRecord.subjects) {
    for (const column of subject.columns) {
      if (!axis.includes(column.columnName)) axis.push(column.columnName);
    }
  }
  return axis;
}

function ScoreCell({ value }: { value: number | null }) {
  return (
    <td
      className={cn(
        "px-3 py-2 text-center tabular-nums",
        getScoreColorClass(value, 10),
      )}
    >
      {value === null ? "—" : value}
    </td>
  );
}

/** Native term grade table. Subject names are row headers; the GPA is in the
 * footer. Native scope semantics carry the table structure to screen readers. */
export function AcademicRecordTable({ termRecord }: AcademicRecordTableProps) {
  const t = useTranslations("academicRecord");
  const { subjects, gpa } = termRecord;
  const columnAxis = deriveColumnAxis(termRecord);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t("table.caption")}</caption>
        <thead>
          <tr className="border-border border-b bg-muted/50 text-left font-bold text-muted-foreground text-xs uppercase">
            <th scope="col" className="px-3 py-2">
              {t("table.subject")}
            </th>
            {columnAxis.map((columnName) => (
              <th
                key={columnName}
                scope="col"
                className="px-3 py-2 text-center"
              >
                {columnName}
              </th>
            ))}
            <th scope="col" className="px-3 py-2 text-center">
              {t("table.termAvg")}
            </th>
            <th scope="col" className="px-3 py-2 text-center">
              {t("table.rank")}
            </th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr
              key={s.subjectId}
              className="border-border border-b last:border-0"
            >
              <th
                scope="row"
                className={cn(
                  "px-3 py-2 text-left font-medium",
                  s.subjectName ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {/* Never the subjectId uuid — an unresolved catalogue lookup
                    degrades to an explicit placeholder. */}
                {s.subjectName ?? t("table.unknownSubject")}
              </th>
              {columnAxis.map((columnName) => (
                <ScoreCell
                  key={columnName}
                  value={
                    s.columns.find((c) => c.columnName === columnName)?.value ??
                    null
                  }
                />
              ))}
              <td
                className={cn(
                  "px-3 py-2 text-center font-bold tabular-nums",
                  getScoreColorClass(s.termAvg, 10),
                )}
              >
                {s.termAvg === null ? "—" : s.termAvg}
              </td>
              <td className="px-3 py-2 text-center text-foreground">
                {s.rankBand ? t(`rankBand.${s.rankBand}` as never) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-border border-t bg-muted/30 font-semibold">
            <th scope="row" className="px-3 py-2 text-left text-foreground">
              {t("table.termSummary")}
            </th>
            <th
              id="tfoot-gpa-label"
              colSpan={columnAxis.length + 1}
              scope="col"
              className="px-3 py-2 text-right font-normal text-muted-foreground"
            >
              {t("table.gpa")}
            </th>
            <td
              headers="tfoot-gpa-label"
              className={cn(
                "px-3 py-2 text-center font-bold tabular-nums",
                getScoreColorClass(gpa, 10),
              )}
            >
              {gpa === null ? "—" : gpa}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
