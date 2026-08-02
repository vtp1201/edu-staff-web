"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/stat-card/stat-card";
import { StatCardSkeleton } from "@/components/shared/stat-card-skeleton";
import type { ModerationStatsEntity } from "../../../domain/entities/moderation-stats.entity";

/**
 * Queue counters (FR-103). TWO cards, because the stats endpoint returns
 * exactly two tenant-wide totals (US-E18.32): the former "resolved this week"
 * (a 7-day window) and "removed" (the DELETE-outcome subset) have no backing
 * and are not approximated from the visible page.
 *
 * `stats` is fed by its OWN query — never by counting the rendered list, which
 * is filtered and paginated.
 */
export function StatRow({
  stats,
  isLoading,
}: {
  stats: ModerationStatsEntity | null;
  isLoading: boolean;
}) {
  const t = useTranslations("moderation.stats");

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        label={t("pending")}
        value={String(stats.pendingCount)}
        icon={Clock}
        tone="warning"
      />
      <StatCard
        label={t("resolved")}
        value={String(stats.resolvedCount)}
        icon={CheckCircle2}
        tone="success"
      />
    </div>
  );
}
