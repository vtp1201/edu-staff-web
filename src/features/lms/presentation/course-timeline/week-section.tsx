"use client";

import { useWeekLabel } from "../shared/use-week-label";
import type { WeekVm } from "./course-timeline.i-vm";
import { TimelineRow } from "./timeline-row";

export interface WeekSectionProps {
  week: WeekVm;
  /** `/…/courses/<id>/items` — each row appends its own id. */
  itemHrefBase: string;
  /** True for the last section, so its final row drops the rail's tail. */
  isLastWeek: boolean;
}

/**
 * One week header ("TUẦN 20/04 – 26/04" or "LUÔN MỞ") plus its rows.
 *
 * The academic week NUMBER the design shows ("Tuần 30 · 20/04 – 26/04") is not
 * on any BE contract yet (epic ask #5), so the date-range fallback ships alone
 * rather than inventing a number.
 */
export function WeekSection({
  week,
  itemHrefBase,
  isLastWeek,
}: WeekSectionProps) {
  // Shared with the player's sidebar, which groups the same weeks (US-E24.5).
  const label = useWeekLabel()(week);

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
            itemHref={`${itemHrefBase}/${item.id}`}
            isLast={isLastWeek && index === week.items.length - 1}
          />
        ))}
      </ul>
    </section>
  );
}
