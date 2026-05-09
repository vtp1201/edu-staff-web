"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClassPeriod } from "../../domain/entities/class-period.entity";

type Props = { history: ClassPeriod[] };

export function AttendanceHistoryTab({ history }: Props) {
  const t = useTranslations("attendance.history");

  if (history.length === 0) {
    return (
      <div className="rounded-[var(--edu-radius-card)] border border-border p-8 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("period")}</TableHead>
            <TableHead>{t("subject")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.date}</TableCell>
              <TableCell>{p.period}</TableCell>
              <TableCell className="text-muted-foreground">
                {p.subject}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
