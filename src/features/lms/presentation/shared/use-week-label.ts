"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { WeekVm } from "../course-timeline/course-timeline.i-vm";

/**
 * "TUẦN 20/04 – 26/04" / "LUÔN MỞ" — the label of one week group.
 *
 * Shared by the timeline's `week-section.tsx` and the player's
 * `content-panel.tsx`: both group the SAME `WeekVm[]`, so the copy and the
 * date formatting have to agree. One hook keeps that a fact rather than a
 * coincidence.
 *
 * Week boundaries are date-only strings computed in UTC by the domain, so they
 * are formatted with `timeZone: "UTC"` — otherwise a reader east or west of the
 * server would see the label slip by a day while the grouping did not.
 */
export function useWeekLabel(): (
  week: Pick<WeekVm, "weekStart" | "weekEnd">,
) => string {
  const t = useTranslations("courses.timeline");
  const format = useFormatter();

  return (week) => {
    if (week.weekStart === null || week.weekEnd === null) {
      return t("alwaysOpen");
    }
    const dayMonth = (iso: string) =>
      format.dateTime(new Date(`${iso}T00:00:00Z`), {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      });
    return t("weekLabel", {
      start: dayMonth(week.weekStart),
      end: dayMonth(week.weekEnd),
    });
  };
}
