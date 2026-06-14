"use client";

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
import type { TeacherRosterStudentVM } from "../teacher-class-students-screen.i-vm";

const STATUS_TONE: Record<
  TeacherRosterStudentVM["status"],
  "success" | "muted"
> = {
  active: "success",
  transferred: "muted",
};

export function TeacherRosterTable({
  students,
}: {
  students: TeacherRosterStudentVM[];
}) {
  const t = useTranslations("teacherClasses.studentPage");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("columns.name")}</TableHead>
          <TableHead scope="col">{t("columns.code")}</TableHead>
          <TableHead scope="col">{t("columns.status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((s) => (
          <TableRow key={s.enrollmentId}>
            <TableCell className="font-medium text-edu-text-primary">
              {s.displayName}
            </TableCell>
            <TableCell className="text-edu-text-secondary tabular-nums">
              {s.studentCode}
            </TableCell>
            <TableCell>
              <StatusBadge tone={STATUS_TONE[s.status]}>
                {t(`status.${s.status}`)}
              </StatusBadge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
