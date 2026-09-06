"use client";

import { ArrowDownUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/utils";
import type {
  AttendanceBand,
  StudentAttendanceSummary,
} from "../../../domain/entities/student-attendance-summary.entity";
import type { SummaryRange } from "../../../domain/resolve-summary-range";
import { initialsOf } from "./student-initials";
import { BAND_PROGRESS_COLOR, BAND_TONE } from "./summary-bands";

type Props = {
  students: StudentAttendanceSummary[];
  range: SummaryRange;
};

type SortMode = "roster" | "rate-asc";

/**
 * Per-student attendance table (design `classops.jsx#AttendanceSummaryTab`).
 *
 * Default order is the ROSTER order (the STT column), matching the mockup. The
 * "Tỉ lệ" header is a button that toggles an ascending-by-rate view so the
 * weakest students come first — client-side only (`toSorted`, no server
 * round-trip, no URL state). The parent remounts this component on a range
 * change (`key`), which is what resets the sort: a sort chosen for April says
 * nothing about the whole year.
 *
 * Students with no rate (`recorded === 0`) always sort LAST, in both modes:
 * "unknown" is not "worst", and floating them to the top of a "who needs help"
 * view would bury the students who actually do.
 */
export function SummaryTable({ students, range }: Props) {
  const t = useTranslations("attendance.summaryTab");
  const tSummary = useTranslations("attendance.summary");
  const tStatus = useTranslations("attendance.status");
  const tRoster = useTranslations("attendance.roster");
  const [sort, setSort] = useState<SortMode>("roster");

  // Roster ordinal (the STT column) stays stable when the rate sort reorders
  // the rows — the number identifies the student, not the row position.
  const ordinalById = new Map(
    students.map((student, index) => [student.studentId, index + 1]),
  );

  const rows =
    sort === "roster"
      ? students
      : students.toSorted((a, b) => {
          if (a.rate === null) return b.rate === null ? 0 : 1;
          if (b.rate === null) return -1;
          return a.rate - b.rate;
        });

  return (
    <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-border border-b px-5 py-3.5">
        <h3 className="font-bold text-[15px] text-foreground">
          {t("tableTitle")}
        </h3>
        <span className="text-muted-foreground text-xs">
          {t("studentCount", { count: students.length })} · {range.startDate} –{" "}
          {range.endDate}
        </span>
      </div>

      <Table className="min-w-[660px]">
        <TableCaption className="sr-only">
          {t("tableTitle")} · {range.startDate} – {range.endDate}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-14">
              {t("stt")}
            </TableHead>
            <TableHead scope="col">{tRoster("student")}</TableHead>
            <TableHead scope="col" className="text-center">
              {tSummary("present")}
            </TableHead>
            <TableHead scope="col" className="text-center">
              {tSummary("excusedAbsent")}
            </TableHead>
            <TableHead scope="col" className="text-center">
              {tStatus("absent")}
            </TableHead>
            <TableHead
              scope="col"
              className="min-w-36"
              aria-sort={sort === "rate-asc" ? "ascending" : "none"}
            >
              <button
                type="button"
                onClick={() =>
                  setSort(sort === "rate-asc" ? "roster" : "rate-asc")
                }
                aria-label={t("sortByRate")}
                // A11Y-201: an explicit ≥44×44 target, like every other control in
                // this tab — `min-h-11` alone left the width to the label.
                className="inline-flex min-h-11 min-w-11 items-center gap-1.5 px-1 font-medium text-inherit"
              >
                {tSummary("rate")}
                <ArrowDownUp className="size-3.5" aria-hidden="true" />
              </button>
            </TableHead>
            <TableHead scope="col" className="w-28">
              {t("statusHeader")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((student) => (
            <TableRow key={student.studentId}>
              <TableCell className="font-semibold text-muted-foreground text-xs">
                {ordinalById.get(student.studentId)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                      {initialsOf(student.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-[13px]">
                    {student.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center text-muted-foreground tabular-nums">
                {student.present}/{student.recorded}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center tabular-nums",
                  student.excused > 0
                    ? "font-bold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <CountCell value={student.excused} />
              </TableCell>
              <TableCell
                className={cn(
                  "text-center tabular-nums",
                  student.absent > 0
                    ? "font-bold text-edu-error-text"
                    : "text-muted-foreground",
                )}
              >
                <CountCell value={student.absent} />
              </TableCell>
              <TableCell>
                {student.rate === null ? (
                  <span className="text-muted-foreground">
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">{t("noRate")}</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      value={student.rate}
                      color={BAND_PROGRESS_COLOR[student.band ?? "risk"]}
                      label={t("rateOf", { name: student.name })}
                      className="flex-1"
                    />
                    <span className="w-12 shrink-0 text-right font-bold text-xs tabular-nums">
                      {student.rate}%
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {student.band !== null && (
                  <StatusBadge tone={BAND_TONE[student.band]}>
                    {t(`bands.${student.band}` as `bands.${AttendanceBand}`)}
                  </StatusBadge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * A zero count renders as an em dash (design), but zero is DATA, not missing
 * data — so the screen reader hears "0", not the `AbsentValue` "we don't have
 * this" wording. Different meaning, deliberately not that shared component.
 */
function CountCell({ value }: { value: number }) {
  if (value > 0) return <>{value}</>;
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">0</span>
    </>
  );
}
