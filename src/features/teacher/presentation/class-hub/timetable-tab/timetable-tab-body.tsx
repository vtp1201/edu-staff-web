"use client";

import { useState } from "react";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { PeriodLog } from "@/features/period-log/domain/entities/period-log.entity";
import type { PeriodPrep } from "@/features/period-log/domain/entities/period-prep.entity";
import { periodKeyOf } from "@/features/teacher/domain/timetable-tab-selectors";
import { ClassTimetableWeekNav } from "./class-timetable-week-nav";
import { DayCard } from "./day-card";
import type { TimetableTabActions, TimetableTabVm } from "./timetable-tab.i-vm";
import { UpcomingPeriodPanel } from "./upcoming-period-panel";

export interface TimetableTabBodyProps {
  vm: TimetableTabVm;
  actions: TimetableTabActions;
}

function indexBy<T>(rows: T[], key: (row: T) => string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const row of rows) out[key(row)] = row;
  return out;
}

/**
 * The ONE piece of shared client state this tab needs.
 *
 * The day grid (left) and the upcoming-period chips (right) read the SAME
 * period-log / period-prep data. If each form only updated its own local state,
 * saving a log on the left would leave the right-hand "Sổ đầu bài tiết: chưa
 * ghi" chip stale until a full navigation — `revalidatePath` invalidates the
 * router cache but does not push new props into an already-mounted client
 * subtree. So the three maps live here and every form reports its saved entity
 * upward.
 *
 * The maps are seeded ONCE from the server props (`useState(initial)`), matching
 * `ClassLogScreen`'s `localEntries` precedent. Updates are await-then-merge of
 * the ACTUAL server response — not `useOptimistic`, not a client-guessed value:
 * there is no rollback path to get wrong, and a failed write simply leaves the
 * previous state untouched behind an error banner.
 */
export function TimetableTabBody({ vm, actions }: TimetableTabBodyProps) {
  const [logs, setLogs] = useState<Record<string, PeriodLog>>(() =>
    indexBy(vm.logs, (l) => periodKeyOf(l.date, l.periodNumber)),
  );
  const [preps, setPreps] = useState<Record<string, PeriodPrep>>(() =>
    indexBy(vm.preps, (p) => periodKeyOf(p.date, p.periodNumber)),
  );
  const [homeroom, setHomeroom] = useState<Record<string, HomeroomEntry>>(() =>
    indexBy(vm.homeroomEntries, (e) => e.entryDate),
  );

  const upsertLog = (log: PeriodLog) =>
    setLogs((prev) => ({
      ...prev,
      [periodKeyOf(log.date, log.periodNumber)]: log,
    }));

  const removeLog = (date: string, periodNumber: number) =>
    setLogs((prev) => {
      const next = { ...prev };
      delete next[periodKeyOf(date, periodNumber)];
      return next;
    });

  const upsertPrep = (prep: PeriodPrep) =>
    setPreps((prev) => ({
      ...prev,
      [periodKeyOf(prep.date, prep.periodNumber)]: prep,
    }));

  const removePrep = (date: string, periodNumber: number) =>
    setPreps((prev) => {
      const next = { ...prev };
      delete next[periodKeyOf(date, periodNumber)];
      return next;
    });

  const upsertEntry = (entry: HomeroomEntry) =>
    setHomeroom((prev) => ({ ...prev, [entry.entryDate]: entry }));

  const upcomingKey = vm.upcoming
    ? periodKeyOf(vm.upcoming.date, vm.upcoming.periodNumber)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <ClassTimetableWeekNav
        weekRangeLabel={vm.weekRangeLabel}
        prevHref={vm.prevWeekHref}
        nextHref={vm.nextWeekHref}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          {vm.days.map((day) => (
            <DayCard
              key={day.date}
              classId={vm.classId}
              vm={day}
              logs={logs}
              preps={preps}
              homeroomEntry={homeroom[day.date]}
              isHomeroom={vm.isHomeroom}
              lessonPlans={vm.lessonPlans}
              actions={actions}
              onLogSaved={upsertLog}
              onLogDeleted={removeLog}
              onPrepSaved={upsertPrep}
              onPrepDeleted={removePrep}
              onDailySaved={upsertEntry}
            />
          ))}
        </div>

        <UpcomingPeriodPanel
          upcoming={vm.upcoming}
          isPrepared={!!upcomingKey && !!preps[upcomingKey]}
          isLogged={!!upcomingKey && !!logs[upcomingKey]}
          shortcuts={vm.shortcuts}
        />
      </div>
    </div>
  );
}
