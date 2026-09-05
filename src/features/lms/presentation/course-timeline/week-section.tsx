"use client";

import { useWeekLabel } from "../shared/use-week-label";
import { AddItemMenu } from "../teacher-course-tab/add-item-menu";
import type {
  AddItemKind,
  TimelineItemVm,
  WeekVm,
} from "./course-timeline.i-vm";
import { TimelineRow, type TimelineRowProps } from "./timeline-row";

/** Everything a teacher row needs that the WEEK cannot know — supplied per
 *  item by the timeline root, which owns the whole-course ordering. */
export type TeacherRowPropsFor = (
  item: TimelineItemVm,
) => Partial<TimelineRowProps>;

export interface WeekSectionProps {
  week: WeekVm;
  /** `/…/courses/<id>/items` — each row appends its own id. */
  itemHrefBase: string;
  /** True for the last section, so its final row drops the rail's tail. */
  isLastWeek: boolean;
  /** NEW (US-E24.10) — omitted entirely for student/read-only, which is what
   *  keeps today's markup byte-identical for those two modes. */
  onSelectAddItemKind?: (kind: AddItemKind, weekStart: string | null) => void;
  examBankHref?: string;
  teacherRowProps?: TeacherRowPropsFor;
}

/**
 * One week header ("TUẦN 20/04 – 26/04" or "LUÔN MỞ") plus its rows.
 *
 * The academic week NUMBER the design shows ("Tuần 30 · 20/04 – 26/04") is not
 * on any BE contract yet (epic ask #5), so the date-range fallback ships alone
 * rather than inventing a number.
 *
 * In teacher mode a "+ Thêm mục" pill closes each group: an item created from
 * there is suggested that week's start as its `startAt`, which is why the pill
 * is per week rather than once at the top.
 */
export function WeekSection({
  week,
  itemHrefBase,
  isLastWeek,
  onSelectAddItemKind,
  examBankHref,
  teacherRowProps,
}: WeekSectionProps) {
  // Shared with the player's sidebar, which groups the same weeks (US-E24.5).
  const label = useWeekLabel()(week);
  const hasAddPill = onSelectAddItemKind !== undefined;

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
            // The rail's tail also has to survive the add pill: with a pill
            // below, the last row is no longer the visual end of the group.
            isLast={
              isLastWeek && index === week.items.length - 1 && !hasAddPill
            }
            {...teacherRowProps?.(item)}
          />
        ))}
      </ul>
      {onSelectAddItemKind && examBankHref !== undefined && (
        <AddItemMenu
          weekStart={week.weekStart}
          onSelectKind={onSelectAddItemKind}
          examBankHref={examBankHref}
        />
      )}
    </section>
  );
}
