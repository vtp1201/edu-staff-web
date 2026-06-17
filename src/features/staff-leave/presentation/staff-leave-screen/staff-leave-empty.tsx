"use client";

import { CalendarX2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StatusFilter } from "./staff-leave-filters";

export interface StaffLeaveEmptyProps {
  status: StatusFilter;
}

/** Empty state per filter tab. */
export function StaffLeaveEmpty({ status }: StaffLeaveEmptyProps) {
  const t = useTranslations("staffLeave.empty");

  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--edu-radius-card)] border border-dashed border-border bg-card px-6 py-12 text-center">
      <CalendarX2
        className="size-9 text-muted-foreground/60"
        aria-hidden="true"
      />
      <p className="text-sm font-bold text-edu-text-secondary">{t(status)}</p>
      <p className="text-xs text-muted-foreground">{t("description")}</p>
    </div>
  );
}
