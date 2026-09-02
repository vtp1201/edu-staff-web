"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { CourseTimelineActions, WeekVm } from "./course-timeline.i-vm";
import { TimelineRow } from "./timeline-row";

export interface WeekSectionProps {
  week: WeekVm;
  expandedItemId: string | null;
  onToggleExpand: (itemId: string) => void;
  getLesson: CourseTimelineActions["getLesson"];
  assignmentsHref: string;
  /** True for the last section, so its final row drops the rail's tail. */
  isLastWeek: boolean;
}

/**
 * One week header ("TUẦN 20/04 – 26/04" or "LUÔN MỞ") plus its rows.
 *
 * Week boundaries are date-only strings computed in UTC by the domain, so they
 * are formatted with `timeZone: "UTC"` — otherwise a reader east/west of the
 * server would see the label slip by a day while the grouping did not.
 *
 * The academic week NUMBER the design shows ("Tuần 30 · 20/04 – 26/04") is not
 * on any BE contract yet (epic ask #5), so the date-range fallback ships alone
 * rather than inventing a number.
 */
export function WeekSection({
  week,
  expandedItemId,
  onToggleExpand,
  getLesson,
  assignmentsHref,
  isLastWeek,
}: WeekSectionProps) {
  const t = useTranslations("courses");
  const format = useFormatter();

  const dayMonth = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00Z`), {
      day: "2-digit",
      month: "2-digit",
      timeZone: "UTC",
    });

  const label =
    week.weekStart && week.weekEnd
      ? t("timeline.weekLabel", {
          start: dayMonth(week.weekStart),
          end: dayMonth(week.weekEnd),
        })
      : t("timeline.alwaysOpen");

  return (
    <section aria-label={label}>
      <div className="flex items-center gap-2.5 pt-4 pb-1.5">
        <h2 className="whitespace-nowrap font-extrabold text-[11px] text-muted-foreground uppercase tracking-[0.07em]">
          {label}
        </h2>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <ul className="flex flex-col">
        {week.items.map((item, index) => (
          <TimelineRow
            key={item.id}
            item={item}
            expanded={expandedItemId === item.id}
            onToggleExpand={onToggleExpand}
            getLesson={getLesson}
            assignmentsHref={assignmentsHref}
            isLast={isLastWeek && index === week.items.length - 1}
          />
        ))}
      </ul>
    </section>
  );
}
