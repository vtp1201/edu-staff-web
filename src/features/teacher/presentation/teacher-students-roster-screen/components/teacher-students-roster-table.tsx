"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeacherStudentRosterRowVM } from "../teacher-students-roster-screen.i-vm";

const STATUS_TONE: Record<
  TeacherStudentRosterRowVM["status"],
  "success" | "muted"
> = {
  active: "success",
  transferred: "muted",
};

/** Vietnamese-aware initials: first letters of the last two words. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export function TeacherStudentsRosterTable({
  rows,
}: {
  rows: TeacherStudentRosterRowVM[];
}) {
  const t = useTranslations("teacherStudentsRoster");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("columns.name")}</TableHead>
          <TableHead scope="col">{t("columns.class")}</TableHead>
          <TableHead scope="col">{t("columns.status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.studentMemberId}>
            <TableCell>
              <Link
                aria-label={t("rowLinkLabel", { name: row.displayName })}
                className="-mx-2 inline-flex min-h-11 items-center gap-3 rounded-[var(--edu-radius-btn)] px-2 font-medium text-edu-text-primary outline-none motion-safe:transition-colors hover:bg-edu-bg focus-visible:ring-2 focus-visible:ring-ring"
                href={row.academicRecordHref}
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-edu-primary-light font-bold text-edu-primary-accessible text-xs"
                >
                  {initialsOf(row.displayName)}
                </span>
                <span>{row.displayName}</span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 text-edu-text-secondary"
                />
              </Link>
            </TableCell>
            <TableCell className="text-edu-text-secondary">
              {row.className}
            </TableCell>
            <TableCell>
              <StatusBadge tone={STATUS_TONE[row.status]}>
                {t(`status.${row.status}`)}
              </StatusBadge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
