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
import { STUDENT_STATUS_TONE } from "../../student-status-tone";
import type { TeacherRosterStudentVM } from "../teacher-class-students-screen.i-vm";

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
              <StatusBadge tone={STUDENT_STATUS_TONE[s.status]}>
                {t(`status.${s.status}`)}
              </StatusBadge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
