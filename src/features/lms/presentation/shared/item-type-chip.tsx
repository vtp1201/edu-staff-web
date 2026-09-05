"use client";

import {
  Clipboard,
  FileText,
  Link as LinkIcon,
  type LucideIcon,
  Play,
} from "lucide-react";
import type { CourseItemType } from "@/features/lms/domain/entities/course-item.entity";
import { cn } from "@/shared/utils";
import { type CourseTone, TONE_TEXT_ACCESSIBLE, TONE_TINT } from "../tone";

/**
 * Item type → design tone (design-spec `student-course-timeline.model.itemTypes`).
 *
 * This is the ONLY thing this file adds to the colour system: the classes come
 * from `tone.ts`'s existing `TONE_*` maps, so there is no parallel palette.
 */
export const ITEM_TYPE_TONE: Record<CourseItemType, CourseTone> = {
  LESSON: "primary",
  ASSIGNMENT: "warning",
  EXAM: "error",
  DOCUMENT: "teal",
};

const ITEM_TYPE_ICON: Record<CourseItemType, LucideIcon> = {
  LESSON: Play,
  ASSIGNMENT: Clipboard,
  EXAM: FileText,
  DOCUMENT: LinkIcon,
};

export interface ItemTypeChipProps {
  itemType: CourseItemType;
  className?: string;
}

/**
 * The 32×32 tinted icon box in front of a course-item row.
 *
 * `aria-hidden`: the type is ALSO spelled out as text on the row's meta line
 * ("Bài giảng · Mở từ …"), so the icon is redundant decoration — colour/icon is
 * never the only channel (WCAG 1.4.1).
 *
 * Lives in `presentation/shared/` rather than in one screen folder because the
 * cross-subject list (US-E24.4) and the item player (US-E24.5) render the same
 * chip — promoted on day 1 with both consumers already named, not speculatively
 * (component-organization.md, decision 0026).
 */
export function ItemTypeChip({ itemType, className }: ItemTypeChipProps) {
  const Icon = ITEM_TYPE_ICON[itemType];
  const tone = ITEM_TYPE_TONE[itemType];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[9px]",
        TONE_TINT[tone],
        className,
      )}
    >
      <Icon
        className={cn("size-[15px]", TONE_TEXT_ACCESSIBLE[tone])}
        strokeWidth={2.1}
      />
    </span>
  );
}
