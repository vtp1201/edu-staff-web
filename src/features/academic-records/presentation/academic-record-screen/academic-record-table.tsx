"use client";

import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { getScoreColorClass } from "@/features/grades/presentation/grade-entry-screen/score-color";
import { cn } from "@/shared/utils";
import type {
  ConductGrade,
  TermRecord,
} from "../../domain/entities/academic-record.entity";

export interface AcademicRecordTableProps {
  termRecord: TermRecord;
}

const CONDUCT_TONE: Record<ConductGrade, StatusTone> = {
  Tot: "success",
  Kha: "primary",
  TrungBinh: "warning",
  Yeu: "error",
};

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

/** Native term grade table. Subject names are row headers; conduct + GPA in the
 * footer. Native scope semantics carry the table structure to screen readers. */
export function AcademicRecordTable({ termRecord }: AcademicRecordTableProps) {
  const t = useTranslations("academicRecord");
  const { subjects, gpa, conductGrade } = termRecord;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t("table.caption")}</caption>
        <thead>
          <tr className="border-border border-b bg-muted/50 text-left text-xs font-bold text-muted-foreground uppercase">
            <th scope="col" className="px-3 py-2">
              {t("table.subject")}
            </th>
            <th scope="col" className="px-3 py-2 text-center">
              {t("table.tx1")}
            </th>
            <th scope="col" className="px-3 py-2 text-center">
              {t("table.tx2")}
            </th>
            <th scope="col" className="px-3 py-2 text-center">
              {t("table.midterm")}
            </th>
            <th scope="col" className="px-3 py-2 text-center">
              {t("table.final")}
            </th>
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
                className="px-3 py-2 text-left font-medium text-foreground"
              >
                {s.subjectName}
              </th>
              <ScoreCell value={s.tx1} />
              <ScoreCell value={s.tx2} />
              <ScoreCell value={s.giuaKy} />
              <ScoreCell value={s.cuoiKy} />
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
            <td
              colSpan={4}
              className="px-3 py-2 text-right text-muted-foreground"
            >
              {t("table.conduct")}:{" "}
              {conductGrade ? (
                <StatusBadge tone={CONDUCT_TONE[conductGrade]} className="ml-1">
                  {t(`conduct.${conductGrade}`)}
                </StatusBadge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-3 py-2 text-center text-muted-foreground">
              {t("table.gpa")}
            </td>
            <td
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
