"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { CourseItemState } from "@/features/lms/domain/entities/course-item.entity";
import { cn } from "@/shared/utils";

/** BE state → design-system badge tone (design-spec `…model.statuses`). */
const STATE_TONE: Record<CourseItemState, StatusTone> = {
  OPEN: "success",
  UPCOMING_HIDDEN: "info",
  CLOSED: "muted",
};

/** The pill's leading dot — decoration only, mirrors the rail dot's colour. */
export const STATE_DOT_CLASS: Record<CourseItemState, string> = {
  OPEN: "bg-edu-success-text",
  UPCOMING_HIDDEN: "bg-edu-info",
  CLOSED: "bg-edu-text-secondary",
};

const STATE_LABEL_KEY = {
  OPEN: "open",
  UPCOMING_HIDDEN: "upcoming",
  CLOSED: "closed",
} as const satisfies Record<CourseItemState, string>;

export interface ItemStatePillProps {
  state: CourseItemState;
  /** Only reachable for `itemType === "EXAM"` + `UPCOMING_HIDDEN` (D7). */
  examLocked?: boolean;
  className?: string;
}

/**
 * "Đang mở" / "Sắp mở" / "Đã đóng — chỉ xem" (US-E24.3).
 *
 * A COMPOSITION over the canonical `StatusBadge` (tint + text), not a fork of
 * it: the dot is passed in as `children`, so `status-badge.tsx` stays the one
 * place badge tones are defined (component-organization.md).
 *
 * The text label is ALWAYS rendered; the dot and the lock glyph are
 * `aria-hidden` decoration. Colour is therefore never the only signal
 * (WCAG 1.4.1) — the lesson US-E24.2 already paid for once.
 */
export function ItemStatePill({
  state,
  examLocked = false,
  className,
}: ItemStatePillProps) {
  const t = useTranslations("courses.timeline.itemState");

  return (
    <StatusBadge
      tone={STATE_TONE[state]}
      className={cn("gap-1.5 whitespace-nowrap", className)}
    >
      <span
        aria-hidden="true"
        className={cn("size-[6px] rounded-full", STATE_DOT_CLASS[state])}
      />
      {examLocked && (
        <Lock className="size-3" strokeWidth={2.2} aria-hidden="true" />
      )}
      {t(STATE_LABEL_KEY[state])}
    </StatusBadge>
  );
}
