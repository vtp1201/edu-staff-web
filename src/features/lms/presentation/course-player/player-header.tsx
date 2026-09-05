"use client";

import type {
  CourseItemState,
  CourseItemType,
} from "@/features/lms/domain/entities/course-item.entity";
import { ItemStatePill } from "../shared/item-state-pill";
import { ItemTypeChip } from "../shared/item-type-chip";

export interface PlayerHeaderProps {
  itemType: CourseItemType;
  title: string;
  /** Pre-composed "<typeLabel> · <window>" — the sentence is built by the
   *  player (which owns the formatter), not re-derived here. */
  typeWindowLabel: string;
  state: CourseItemState;
  /** Forwarded to the pill; only ever true for EXAM + UPCOMING_HIDDEN (D7). */
  examLocked?: boolean;
}

/**
 * The content pane's header: type chip, title, "<type> · <window>", state pill.
 *
 * The chip is `aria-hidden` decoration (its type is spelled out in the meta
 * line) and the pill always renders a text label — colour is never the only
 * channel for either.
 */
export function PlayerHeader({
  itemType,
  title,
  typeWindowLabel,
  state,
  examLocked = false,
}: PlayerHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 pt-3.5 pb-3 sm:px-5">
      <ItemTypeChip itemType={itemType} />
      <div className="min-w-0 flex-1 basis-40">
        <h1 className="font-extrabold text-base text-foreground">{title}</h1>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
          {typeWindowLabel}
        </p>
      </div>
      <ItemStatePill state={state} examLocked={examLocked} />
    </div>
  );
}
