import { useTranslations } from "next-intl";
import type { TimetableSlot } from "@/features/timetable/domain/entities/timetable-slot.entity";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import { cn } from "@/shared/utils";
import { SUBJECT_COLOR_CLASSES } from "./subject-color-tokens";
import {
  DAY_KEYS,
  PERIODS,
  RECESS_AFTER_PERIOD,
} from "./timetable-view.constants";

type CellVariant = "class" | "teacher";

interface TimetableGridProps {
  timetable: WeeklyTimetable;
  /**
   * Which secondary line the filled cell renders. Only `"class"` (teacher name)
   * is implemented in US-E15.1; `"teacher"` (class name) is the US-E15.2 seam.
   */
  cellVariant?: CellVariant;
  /** Optional Mon..Sat dates (parent week view) → shows dates + "today" marker. */
  weekDates?: readonly Date[];
}

const NUM_DAYS = DAY_KEYS.length;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function TimetableGrid({
  timetable,
  cellVariant = "class",
  weekDates,
}: TimetableGridProps) {
  const t = useTranslations("timetableView");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isTodayCol = (dayIndex: number): boolean =>
    weekDates ? isSameDay(weekDates[dayIndex], today) : false;

  return (
    <div className="overflow-hidden rounded-xl border border-edu-border bg-edu-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-separate border-spacing-1 p-3">
          <caption className="sr-only">
            {cellVariant === "teacher"
              ? t("teacherCaption")
              : t("caption", { className: timetable.className })}
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-2 w-[100px] bg-edu-card px-3 py-2 text-left"
              >
                <span className="sr-only">{t("periodColumnHeader")}</span>
              </th>
              {DAY_KEYS.map((dayKey, dayIndex) => {
                const todayCol = isTodayCol(dayIndex);
                const d = weekDates?.[dayIndex];
                return (
                  <th
                    key={dayKey}
                    scope="col"
                    className={cn(
                      "px-3 py-2 text-left align-bottom",
                      todayCol && "rounded-lg bg-edu-primary/12",
                    )}
                  >
                    <div
                      className={cn(
                        "font-extrabold text-xs",
                        todayCol
                          ? "text-edu-primary-accessible"
                          : "text-edu-text-primary",
                      )}
                    >
                      {t(`days.${dayKey}`)}
                    </div>
                    {d && (
                      <div
                        className={cn(
                          "mt-0.5 font-bold text-[11px] tabular-nums",
                          todayCol
                            ? "text-edu-primary-accessible"
                            : "text-edu-text-secondary",
                        )}
                      >
                        {pad2(d.getDate())}/{pad2(d.getMonth() + 1)}
                      </div>
                    )}
                    {todayCol && (
                      <div className="mt-0.5 font-bold text-[9.5px] text-edu-primary-accessible uppercase tracking-wider">
                        {t("today")}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <PeriodRow
                key={period.n}
                period={period}
                timetable={timetable}
                cellVariant={cellVariant}
                recessAfter={period.n === RECESS_AFTER_PERIOD}
                recessLabel={t("recess")}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PeriodRow({
  period,
  timetable,
  cellVariant,
  recessAfter,
  recessLabel,
}: {
  period: (typeof PERIODS)[number];
  timetable: WeeklyTimetable;
  cellVariant: CellVariant;
  recessAfter: boolean;
  recessLabel: string;
}) {
  const t = useTranslations("timetableView");
  return (
    <>
      <tr>
        <th
          scope="row"
          className="sticky left-0 z-1 w-[100px] border-edu-border border-r bg-edu-card px-2.5 py-1.5 text-left align-top"
        >
          <div className="font-extrabold text-edu-text-primary text-xs leading-tight">
            {t("period", { n: period.n })}
          </div>
          <div className="mt-0.5 text-[10px] text-edu-text-secondary tabular-nums">
            {period.start} – {period.end}
          </div>
        </th>
        {DAY_KEYS.map((dayKey, dayIndex) => (
          <Cell
            key={dayKey}
            slot={timetable.slots[dayIndex]?.[period.n] ?? null}
            cellVariant={cellVariant}
          />
        ))}
      </tr>
      {recessAfter && (
        <tr>
          <td
            colSpan={NUM_DAYS + 1}
            className="rounded-md border border-edu-border border-dashed bg-edu-bg px-3 py-1.5 text-center"
          >
            <span className="font-bold text-[10.5px] text-edu-text-secondary uppercase tracking-widest">
              <span aria-hidden="true">☕ </span>
              {recessLabel}
            </span>
          </td>
        </tr>
      )}
    </>
  );
}

function Cell({
  slot,
  cellVariant,
}: {
  slot: TimetableSlot | null;
  cellVariant: CellVariant;
}) {
  const t = useTranslations("timetableView");
  if (!slot) {
    return (
      <td className="min-w-[120px] p-0 align-top">
        <span className="sr-only">{t("emptySlot")}</span>
        <div
          aria-hidden="true"
          className="flex min-h-[76px] select-none items-center justify-center rounded-md border border-edu-border border-dashed bg-edu-bg font-medium text-base text-edu-text-secondary"
        >
          —
        </div>
      </td>
    );
  }
  const c = SUBJECT_COLOR_CLASSES[slot.subjectColorToken];
  // cellVariant "class" → teacher line; "teacher" (US-E15.2) → class line.
  const secondary =
    cellVariant === "teacher" ? slot.className : slot.teacherName;
  return (
    <td className="min-w-[120px] p-0 align-top">
      <div
        className={cn(
          "min-h-[76px] rounded-md border border-l-[3px] px-2.5 py-2 text-left",
          c.bg,
          c.border,
          c.accent,
        )}
      >
        <div className={cn("font-bold text-xs leading-tight", c.text)}>
          {slot.subjectName}
        </div>
        {secondary && (
          <div className="mt-0.5 truncate text-[10px] text-edu-text-secondary leading-snug">
            {secondary}
          </div>
        )}
        {slot.room && (
          <div className="mt-px text-[10px] text-edu-text-secondary leading-snug tabular-nums">
            {slot.room}
          </div>
        )}
      </div>
    </td>
  );
}
