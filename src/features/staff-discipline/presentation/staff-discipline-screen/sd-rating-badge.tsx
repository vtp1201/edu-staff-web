"use client";

import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { StaffConductRating } from "../../domain/entities/staff-conduct-note.entity";

/**
 * Conduct-note rating badge (conduct-notes tab only). Reuses the existing 3-tier
 * convention verbatim (design-spec `conductNotesTab.ratingBadge`) — no new token.
 */
const RATING_TONE: Record<StaffConductRating, StatusTone> = {
  SATISFACTORY: "success",
  NEEDS_IMPROVEMENT: "warning",
  UNSATISFACTORY: "error",
};

const RATING_ICON = {
  SATISFACTORY: CircleCheck,
  NEEDS_IMPROVEMENT: CircleAlert,
  UNSATISFACTORY: CircleX,
} as const;

const RATING_LABEL_KEY = {
  SATISFACTORY: "satisfactory",
  NEEDS_IMPROVEMENT: "needsImprovement",
  UNSATISFACTORY: "unsatisfactory",
} as const;

export interface SDRatingBadgeProps {
  rating: StaffConductRating;
}

export function SDRatingBadge({ rating }: SDRatingBadgeProps) {
  const t = useTranslations("staffDiscipline.conductNotes.rating");
  const Icon = RATING_ICON[rating];
  return (
    <StatusBadge tone={RATING_TONE[rating]}>
      <Icon className="size-3" aria-hidden="true" />
      {t(RATING_LABEL_KEY[rating])}
    </StatusBadge>
  );
}
