"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Class,
  ClassStatus,
} from "@/features/admin/class-management/domain/entities/class.entity";
import { CLASS_STATUS_TONE } from "./class-status-tone";

export interface ClassesTableProps {
  classes: Class[];
  /** Pre-translated placeholder for a class with no homeroom teacher (FR-002). */
  homeroomUnassignedLabel: string;
  statusLabels: Record<ClassStatus, string>;
  columnLabels: {
    name: string;
    gradeLevel: string;
    homeroom: string;
    studentCount: string;
    status: string;
    caption: string;
  };
  gradeLabel: (n: number) => string;
}

/**
 * Desktop/tablet (≥768px) class table — read-only, no row action (FR-009).
 * Mirrors `principal-teachers-screen.tsx`'s table conventions (sr-only
 * `TableCaption`, tokens-only styling).
 */
export function ClassesTable({
  classes,
  homeroomUnassignedLabel,
  statusLabels,
  columnLabels,
  gradeLabel,
}: ClassesTableProps) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <Table>
        <TableCaption className="sr-only">{columnLabels.caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{columnLabels.name}</TableHead>
            <TableHead>{columnLabels.gradeLevel}</TableHead>
            <TableHead>{columnLabels.homeroom}</TableHead>
            <TableHead className="text-right">
              {columnLabels.studentCount}
            </TableHead>
            <TableHead>{columnLabels.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-semibold text-foreground">
                {c.name}
              </TableCell>
              <TableCell className="text-foreground text-sm">
                {gradeLabel(c.gradeLevel)}
              </TableCell>
              <TableCell className="text-sm">
                {c.homeroomTeacherName ?? (
                  <span className="text-muted-foreground">
                    {homeroomUnassignedLabel}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right text-foreground text-sm tabular-nums">
                {c.studentCount}
              </TableCell>
              <TableCell>
                <StatusBadge tone={CLASS_STATUS_TONE[c.status]}>
                  {statusLabels[c.status]}
                </StatusBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
