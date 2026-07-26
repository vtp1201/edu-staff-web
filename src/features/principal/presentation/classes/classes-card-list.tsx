"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import type {
  Class,
  ClassStatus,
} from "@/features/admin/class-management/domain/entities/class.entity";
import { CLASS_STATUS_TONE } from "./class-status-tone";

export interface ClassesCardListProps {
  classes: Class[];
  homeroomUnassignedLabel: string;
  statusLabels: Record<ClassStatus, string>;
  fieldLabels: {
    gradeLevel: string;
    homeroom: string;
    studentCount: string;
  };
  gradeLabel: (n: number) => string;
  /** Composed screen-reader summary per card, e.g. `"Lớp 10A1, Đang học"`. */
  cardSummary: (name: string, status: string) => string;
}

/**
 * Mobile (<768px) card list — same fields as `ClassesTable`, stacked
 * single-column so nothing truncates at 320px. No drill-down affordance
 * (FR-012); see the per-item comment for how row identity is announced.
 */
export function ClassesCardList({
  classes,
  homeroomUnassignedLabel,
  statusLabels,
  fieldLabels,
  gradeLabel,
  cardSummary,
}: ClassesCardListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {classes.map((c) => (
        // The list item itself carries the composed label (`listitem` role),
        // so a screen reader announces row identity without a redundant
        // `role="group"` wrapper.
        <li aria-label={cardSummary(c.name, statusLabels[c.status])} key={c.id}>
          <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-foreground">{c.name}</span>
              <StatusBadge tone={CLASS_STATUS_TONE[c.status]}>
                {statusLabels[c.status]}
              </StatusBadge>
            </div>
            <span className="text-muted-foreground text-xs">
              {gradeLabel(c.gradeLevel)}
            </span>
            <dl className="flex flex-col gap-1 border-border border-t pt-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted-foreground">
                  {fieldLabels.homeroom}
                </dt>
                <dd className="text-foreground">
                  {c.homeroomTeacherName ?? homeroomUnassignedLabel}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted-foreground">
                  {fieldLabels.studentCount}
                </dt>
                <dd className="text-foreground tabular-nums">
                  {c.studentCount}
                </dd>
              </div>
            </dl>
          </div>
        </li>
      ))}
    </ul>
  );
}
