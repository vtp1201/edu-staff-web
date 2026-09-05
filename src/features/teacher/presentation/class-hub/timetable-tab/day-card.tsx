"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { PeriodLog } from "@/features/period-log/domain/entities/period-log.entity";
import type { PeriodPrep } from "@/features/period-log/domain/entities/period-prep.entity";
import { periodKeyOf } from "@/features/teacher/domain/timetable-tab-selectors";
import { cn } from "@/shared/utils";
import { DailyLogPanel } from "./daily-log-panel";
import { PeriodRow } from "./period-row";
import type {
  LessonPlanOptionVm,
  TimetableDayVm,
  TimetableTabActions,
} from "./timetable-tab.i-vm";

export interface DayCardProps {
  classId: string;
  vm: TimetableDayVm;
  logs: Record<string, PeriodLog>;
  preps: Record<string, PeriodPrep>;
  homeroomEntry?: HomeroomEntry;
  isHomeroom: boolean;
  lessonPlans: LessonPlanOptionVm[];
  actions: TimetableTabActions;
  onLogSaved: (log: PeriodLog) => void;
  onLogDeleted: (date: string, periodNumber: number) => void;
  onPrepSaved: (prep: PeriodPrep) => void;
  onPrepDeleted: (date: string, periodNumber: number) => void;
  onDailySaved: (entry: HomeroomEntry) => void;
}

/**
 * One day of the class's week: header (today / holiday), its period rows, and
 * the daily homeroom strip. The daily panel is mounted ONCE PER DAY CARD, so
 * its edit state is a plain per-instance boolean with no key collisions.
 *
 * A holiday renders the holiday's NAME and no periods — the state is carried by
 * text, not by colour alone (a11y).
 */
export function DayCard({
  classId,
  vm,
  logs,
  preps,
  homeroomEntry,
  isHomeroom,
  lessonPlans,
  actions,
  onLogSaved,
  onLogDeleted,
  onPrepSaved,
  onPrepDeleted,
  onDailySaved,
}: DayCardProps) {
  const t = useTranslations("teacherClasses.hub.timetable");

  return (
    <section
      aria-label={vm.dayLabel}
      className={cn(
        "overflow-hidden rounded-[var(--edu-radius-card)] border bg-card shadow-card",
        vm.isToday ? "border-primary/35" : "border-border",
      )}
    >
      <header
        className={cn(
          "flex flex-wrap items-center gap-2.5 border-border border-b px-4 py-2.5",
          vm.isToday ? "bg-edu-primary-light" : "bg-background",
        )}
      >
        <h3
          className={cn(
            "font-extrabold text-sm",
            vm.isToday ? "text-primary" : "text-card-foreground",
          )}
        >
          {vm.dayLabel}
        </h3>
        {vm.isToday && <StatusBadge tone="primary">{t("today")}</StatusBadge>}
        {vm.holidayLabel && (
          <span className="font-bold text-edu-error-text text-xs">
            {vm.holidayLabel}
          </span>
        )}
      </header>

      {!vm.holidayLabel && (
        <>
          {vm.periods.length === 0 ? (
            <p className="border-border border-b px-4 py-3 text-edu-text-secondary text-sm">
              {t("noPeriods")}
            </p>
          ) : (
            vm.periods.map((period) => {
              const key = periodKeyOf(vm.date, period.periodNumber);
              return (
                <PeriodRow
                  key={key}
                  classId={classId}
                  date={vm.date}
                  dayLabel={vm.dayLabel}
                  vm={period}
                  log={logs[key]}
                  prep={preps[key]}
                  canReadOthersLog={isHomeroom}
                  lessonPlans={lessonPlans}
                  actions={actions}
                  onLogSaved={onLogSaved}
                  onLogDeleted={onLogDeleted}
                  onPrepSaved={onPrepSaved}
                  onPrepDeleted={onPrepDeleted}
                />
              );
            })
          )}

          {/* GVCN only: core's homeroom-entries list is restricted to the
              homeroom teacher and BGH, so a subject teacher has no readable
              content here at all — the block is hidden, not shown empty
              (AC / cross-repo ask #9). */}
          {isHomeroom && (
            <DailyLogPanel
              classId={classId}
              date={vm.date}
              entry={homeroomEntry}
              actions={actions}
              onSaved={onDailySaved}
            />
          )}
        </>
      )}
    </section>
  );
}
