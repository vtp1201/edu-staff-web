import { CalendarX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import type { TimetableTabActions, TimetableTabVm } from "./timetable-tab.i-vm";
import { TimetableTabBody } from "./timetable-tab-body";

export interface TimetableTabProps {
  vm: TimetableTabVm;
  actions: TimetableTabActions;
}

/**
 * Class-hub "Thời khoá biểu" tab (US-E24.9). RSC: it owns only the whole-tab
 * error surface and hands the resolved ViewModel to the client body, which owns
 * the shared period-log/prep maps (see `timetable-tab-body.tsx` for why one
 * client boundary above the leaves is required).
 *
 * A failed week read renders ONE error state rather than a half-built grid —
 * a partially-populated timetable would read as "no periods scheduled", which
 * is a materially different (and wrong) statement.
 */
export async function TimetableTab({ vm, actions }: TimetableTabProps) {
  const t = await getTranslations("teacherClasses.hub.timetable");

  if (vm.errorKey) {
    return (
      <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        <EmptyState
          icon={CalendarX}
          title={t("loadError")}
          body={t(`errors.${vm.errorKey}`)}
          className="py-16"
        />
      </div>
    );
  }

  return <TimetableTabBody vm={vm} actions={actions} />;
}
