import Link from "next/link";
import { useTranslations } from "next-intl";
import type { TimetableSlot } from "@/features/timetable/domain/entities/timetable-slot.entity";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import { classHubHref } from "@/shared/class-hub-href";
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
  /**
   * Absolute class-list route (`/<locale>/t/<tenant>/teacher/classes`) — opt-in.
   * When present AND `cellVariant === "teacher"`, a slot that carries a
   * `classId` becomes a deep link into that class's hub (US-E24.8). The
   * class-scope (student/parent) view never links: the hub is teacher-only.
   */
  classHrefBase?: string;
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
  classHrefBase,
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
                classHrefBase={classHrefBase}
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
  classHrefBase,
  recessAfter,
  recessLabel,
}: {
  period: (typeof PERIODS)[number];
  timetable: WeeklyTimetable;
  cellVariant: CellVariant;
  classHrefBase?: string;
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
            classHrefBase={classHrefBase}
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
  classHrefBase,
}: {
  slot: TimetableSlot | null;
  cellVariant: CellVariant;
  classHrefBase?: string;
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
  // Deep link only where the hub exists (teacher view) and the slot actually
  // carries a class id — never a link to nowhere (US-E24.8).
  const href =
    cellVariant === "teacher" && classHrefBase && slot.classId
      ? classHubHref(classHrefBase, slot.classId, "timetable")
      : undefined;

  const body = (
    <>
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
    </>
  );

  const cellClass = cn(
    "block min-h-[76px] rounded-md border border-l-[3px] px-2.5 py-2 text-left",
    c.bg,
    c.border,
    c.accent,
  );

  return (
    <td className="min-w-[120px] p-0 align-top">
      {href ? (
        <Link
          href={href}
          className={cn(
            cellClass,
            "outline-none motion-safe:transition-shadow hover:shadow-card-hover hover:ring-1 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={cellClass}>{body}</div>
      )}
    </td>
  );
}
