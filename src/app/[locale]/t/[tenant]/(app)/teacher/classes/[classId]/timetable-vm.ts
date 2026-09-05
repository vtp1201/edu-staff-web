import "server-only";

import { makeClassLogRepository } from "@/bootstrap/di/class-log.di";
import { makeListMyLessonPlansUseCase } from "@/bootstrap/di/lesson-plan.di";
import {
  makeGetWeekPeriodLogsUseCase,
  makeGetWeekPeriodPrepsUseCase,
  makePeriodLogAuthContext,
} from "@/bootstrap/di/period-log.di";
import { makeGetClassTimetableUseCase } from "@/bootstrap/di/timetable-view.di";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { PeriodLog } from "@/features/period-log/domain/entities/period-log.entity";
import type { PeriodPrep } from "@/features/period-log/domain/entities/period-prep.entity";
import {
  addWeeks,
  buildWeekDays,
  isoDateOf,
  parseIsoWeek,
  toIsoWeekParam,
} from "@/features/teacher/domain/iso-week";
import {
  isMySlot,
  isPeriodLive,
  pickUpcomingPeriod,
} from "@/features/teacher/domain/timetable-tab-selectors";
import type {
  PeriodRowVm,
  TimetableDayVm,
  TimetableTabVm,
} from "@/features/teacher/presentation/class-hub/timetable-tab/timetable-tab.i-vm";

export interface BuildTimetableTabVmInput {
  classId: string;
  isHomeroom: boolean;
  locale: string;
  tenant: string;
  /** Raw `?week=` — anything malformed silently resolves to the current week. */
  weekParam?: string;
  /** Injected so the "today"/"live"/"upcoming" derivations stay testable. */
  now?: Date;
}

/** `dd/MM` — built explicitly rather than via CLDR, whose ordering differs per
 *  locale and would silently reshuffle the day label. */
function dayMonth(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

/** "Thứ Hai · 31/08" — weekday NAME from the locale, date order fixed by us. */
function dayLabelOf(date: Date, locale: string): string {
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
    date,
  );
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} · ${dayMonth(date)}`;
}

function hrefFor(locale: string, tenant: string, path: string): string {
  return `/${locale}/t/${tenant}${path}`;
}

/**
 * Assemble the timetable tab's ViewModel (US-E24.9).
 *
 * Four independent reads run in parallel; the TIMETABLE is the only primary one
 * — if it fails the tab renders one error surface, because a half-built grid
 * would read as "no periods scheduled", a materially different claim. Logs,
 * preps, homeroom entries and lesson plans all degrade to empty on their own
 * without blanking a week the teacher can legitimately see.
 */
export async function buildTimetableTabVm({
  classId,
  isHomeroom,
  locale,
  tenant,
  weekParam,
  now = new Date(),
}: BuildTimetableTabVmInput): Promise<TimetableTabVm> {
  const monday = parseIsoWeek(weekParam, now);
  const weekDays = buildWeekDays(monday);
  const from = isoDateOf(weekDays[0]);
  const to = isoDateOf(weekDays[weekDays.length - 1]);
  const base = `/teacher/classes/${encodeURIComponent(classId)}?tab=timetable`;

  const shell = {
    classId,
    isHomeroom,
    weekParam: toIsoWeekParam(monday),
    weekRangeLabel: `${dayMonth(weekDays[0])} – ${dayMonth(weekDays[weekDays.length - 1])}`,
    prevWeekHref: `${hrefFor(locale, tenant, base)}&week=${toIsoWeekParam(addWeeks(monday, -1))}`,
    nextWeekHref: `${hrefFor(locale, tenant, base)}&week=${toIsoWeekParam(addWeeks(monday, 1))}`,
    shortcuts: {
      teachingPlanHref: hrefFor(locale, tenant, "/teacher/teaching-plan"),
      attendanceHref: hrefFor(
        locale,
        tenant,
        `/teacher/attendance?classId=${encodeURIComponent(classId)}`,
      ),
      classLogHref: hrefFor(
        locale,
        tenant,
        `/teacher/class-log?classId=${encodeURIComponent(classId)}`,
      ),
    },
  };

  const [authCtx, timetable, logs, preps, entries, lessonPlans] =
    await Promise.all([
      makePeriodLogAuthContext(),
      (await makeGetClassTimetableUseCase()).execute(classId, from),
      readLogs(classId, from, to),
      readPreps(classId, from, to),
      // Only the GVCN (or BGH) may LIST homeroom entries — a GVBM's read is a
      // guaranteed 403 (core `homeroom-entries` GET, cross-repo ask #9), so it
      // is not attempted and the strip is not rendered for them at all.
      isHomeroom ? readHomeroomEntries(classId, from, to) : [],
      readLessonPlans(),
    ]);

  if (!timetable.ok) {
    return {
      ...shell,
      myMemberId: authCtx.memberId,
      days: [],
      logs: [],
      preps: [],
      homeroomEntries: [],
      lessonPlans: [],
      upcoming: null,
      errorKey:
        timetable.error.type === "network-error"
          ? "network-error"
          : "not-found",
    };
  }

  const slots = timetable.data.slots;
  const myMemberId = authCtx.memberId;
  const today = isoDateOf(now);

  const days: TimetableDayVm[] = weekDays.map((day, dayIndex) => {
    const date = isoDateOf(day);
    const periods = slots[dayIndex] ?? {};
    const rows: PeriodRowVm[] = Object.keys(periods)
      .map(Number)
      .filter((n) => Number.isFinite(n) && periods[n])
      .sort((a, b) => a - b)
      .map((periodNumber) => {
        // Non-null: the filter above already dropped empty periods.
        const slot = periods[periodNumber] as NonNullable<
          (typeof periods)[number]
        >;
        return {
          periodNumber,
          timeRangeLabel:
            slot.startTime && slot.endTime
              ? `${slot.startTime}–${slot.endTime}`
              : undefined,
          subjectName: slot.subjectName,
          teacherName: slot.teacherName,
          teacherMemberId: slot.teacherMemberId,
          room: slot.room,
          isMine: isMySlot(slot, myMemberId),
          isLive: isPeriodLive(slot, day, now),
        };
      });

    return {
      date,
      dayLabel: dayLabelOf(day, locale),
      isToday: date === today,
      // No holiday source on the wire yet — the VM keeps the field so the UI
      // (and its Storybook state) is ready the day a calendar read ships.
      holidayLabel: undefined,
      periods: rows,
    };
  });

  const upcoming = pickUpcomingPeriod(slots, myMemberId, weekDays, now);

  return {
    ...shell,
    myMemberId,
    days,
    logs,
    preps,
    homeroomEntries: entries,
    lessonPlans,
    upcoming: upcoming
      ? {
          date: upcoming.date,
          dayLabel: dayLabelOf(weekDays[upcoming.dayIndex], locale),
          periodNumber: upcoming.periodNumber,
          subjectName: upcoming.slot.subjectName,
          timeRangeLabel: upcoming.timeRange,
          room: upcoming.slot.room,
        }
      : null,
  };
}

/** Secondary reads — each degrades to empty on its own, never fails the tab. */
async function readLogs(
  classId: string,
  from: string,
  to: string,
): Promise<PeriodLog[]> {
  const result = await (await makeGetWeekPeriodLogsUseCase()).execute(
    classId,
    from,
    to,
  );
  return result.ok ? result.data : [];
}

async function readPreps(
  classId: string,
  from: string,
  to: string,
): Promise<PeriodPrep[]> {
  const result = await (await makeGetWeekPeriodPrepsUseCase()).execute(
    classId,
    from,
    to,
  );
  return result.ok ? result.data : [];
}

/**
 * The week's homeroom entries. Called ONLY for a GVCN (see the call site): core
 * restricts this list to the class's homeroom teacher and BGH, so asking as a
 * subject teacher would be a 403 every time. A failure still degrades to an
 * empty week — a missing daily strip must never blank a timetable the teacher
 * can legitimately see.
 */
async function readHomeroomEntries(
  classId: string,
  from: string,
  to: string,
): Promise<HomeroomEntry[]> {
  try {
    const repo = await makeClassLogRepository();
    const { entries } = await repo.listEntries({
      classId,
      fromDate: from,
      toDate: to,
      limit: 20,
    });
    return entries;
  } catch {
    return [];
  }
}

/** The prep form's plan picker — MY plans only, already teacher-scoped BE-side. */
async function readLessonPlans() {
  try {
    const result = await (await makeListMyLessonPlansUseCase()).execute({
      limit: 100,
    });
    if (!result.ok) return [];
    return result.value.items.map((plan) => ({
      planId: plan.planId,
      title: plan.title,
    }));
  } catch {
    return [];
  }
}
