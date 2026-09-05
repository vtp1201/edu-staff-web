"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export interface ClassTimetableWeekNavProps {
  /** e.g. "31/08 – 05/09", already formatted server-side. */
  weekRangeLabel: string;
  prevHref: string;
  nextHref: string;
}

/**
 * Prev / current / next week. A NEW component rather than a reuse of
 * `timetable-view/week-nav.tsx`: that one is a client `useState` offset
 * counter, the opposite state model from this tab's `?week=YYYY-Www` URL state
 * (US-E24.8's "the URL is the state" convention). Different state model =
 * different component, not a variant.
 *
 * Real `<Link>`s and no state of its own — `'use client'` only so the whole tab
 * body (which IS client, see `timetable-tab-body.tsx`) can compose it and
 * Storybook can render it directly. The chevrons are decorative
 * — each link carries a Vietnamese `aria-label`. Weeks scroll indefinitely in
 * both directions, so neither link is ever disabled.
 */
export function ClassTimetableWeekNav({
  weekRangeLabel,
  prevHref,
  nextHref,
}: ClassTimetableWeekNavProps) {
  const t = useTranslations("teacherClasses.hub.timetable.weekNav");

  return (
    <nav
      aria-label={t("range", { range: weekRangeLabel })}
      className="flex items-center justify-between gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card px-3 py-2 shadow-card"
    >
      <Link
        href={prevHref}
        aria-label={t("prev")}
        className="flex size-11 items-center justify-center rounded-[8px] text-edu-text-secondary transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Link>
      <span className="font-extrabold text-card-foreground text-sm tabular-nums">
        {t("range", { range: weekRangeLabel })}
      </span>
      <Link
        href={nextHref}
        aria-label={t("next")}
        className="flex size-11 items-center justify-center rounded-[8px] text-edu-text-secondary transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}
