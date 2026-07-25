"use client";

import { AlertTriangle, CalendarX, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/stat-card";

/**
 * 3-up summary stats (FR-011, design-spec `layout.statsRow`) — CLIENT-DERIVED
 * from the loaded/filtered list, no separate endpoint (AC-001.5).
 *
 * Thin grid wrapper around 3 reused shared `StatCard`s; tones mirror the row
 * badges (primary / warning / error).
 */
export interface SAStatsRowProps {
  total: number;
  unexcused: number;
  flagged: number;
}

export function SAStatsRow({ total, unexcused, flagged }: SAStatsRowProps) {
  const t = useTranslations("studentAbsences");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        icon={CalendarX}
        tone="primary"
        label={t("title")}
        value={String(total)}
      />
      <StatCard
        icon={AlertTriangle}
        tone="warning"
        label={t("unexcused")}
        value={String(unexcused)}
      />
      <StatCard
        icon={Flag}
        tone="error"
        label={t("flagged")}
        value={String(flagged)}
      />
    </div>
  );
}
