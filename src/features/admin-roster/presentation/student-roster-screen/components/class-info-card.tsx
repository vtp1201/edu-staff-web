"use client";

import { CalendarDays, Grid3x3, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ClassSummary } from "@/features/admin-roster/domain/entities/class-summary.entity";

interface ClassInfoCardProps {
  cls: ClassSummary;
  activeCount: number;
  transferredCount: number;
}

export function ClassInfoCard({
  cls,
  activeCount,
  transferredCount,
}: ClassInfoCardProps) {
  const t = useTranslations("adminRoster");

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-xl border border-edu-border bg-edu-card px-6 py-5 shadow-card">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-edu-primary/10">
        <Grid3x3 className="size-[26px] text-edu-primary" aria-hidden="true" />
      </div>
      <div className="min-w-[220px] flex-1">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2 className="font-extrabold text-2xl text-edu-text-primary tracking-tight">
            {t("classInfo.class", { name: cls.name })}
          </h2>
          <StatusBadge tone="primary">
            {t("classInfo.grade", { level: cls.gradeLevel })}
          </StatusBadge>
          <StatusBadge tone="muted">
            <CalendarDays className="size-2.5" aria-hidden="true" /> {cls.year}
          </StatusBadge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-edu-text-secondary text-sm">
          <UserCheck
            className="size-3.5 text-edu-text-muted"
            aria-hidden="true"
          />
          <span className="text-edu-text-muted">
            {t("classInfo.homeroom")}:
          </span>
          {cls.homeroomTeacher ? (
            <span className="font-bold text-edu-text-primary">
              {cls.homeroomTeacher}
            </span>
          ) : (
            <span className="font-semibold text-edu-warning-foreground italic">
              {t("classInfo.unassigned")}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2.5">
        <div className="min-w-[100px] rounded-[10px] border border-edu-success/30 bg-edu-success/10 px-4 py-2.5">
          <div className="font-bold text-[10px] text-edu-success uppercase tracking-wider">
            {t("classInfo.active")}
          </div>
          <div className="font-extrabold text-2xl text-edu-success leading-tight tabular-nums">
            {activeCount}
          </div>
        </div>
        {transferredCount > 0 && (
          <div className="min-w-[100px] rounded-[10px] border border-edu-border bg-edu-bg px-4 py-2.5">
            <div className="font-bold text-[10px] text-edu-text-muted uppercase tracking-wider">
              {t("classInfo.transferred")}
            </div>
            <div className="font-extrabold text-2xl text-edu-text-secondary leading-tight tabular-nums">
              {transferredCount}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
