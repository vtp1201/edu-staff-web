"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { AttendanceStatus } from "../../domain/entities/attendance-status.entity";
import { AttendanceStatusToggle } from "./attendance-status-toggle";

type Props = {
  records: AttendanceRecord[];
  onChange: (studentId: string, status: AttendanceStatus) => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(-2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function AttendanceRosterTable({ records, onChange }: Props) {
  const t = useTranslations("attendance.roster");
  return (
    <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>{t("student")}</TableHead>
            <TableHead className="w-[18rem] text-right">
              {t("status")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r, idx) => (
            <TableRow key={r.studentId}>
              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials(r.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{r.studentName}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <AttendanceStatusToggle
                    value={r.status}
                    onChange={(next) => onChange(r.studentId, next)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
