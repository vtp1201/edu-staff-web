"use client";

import { CheckCircle2, Clock, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/shared/stat-card/stat-card";
import { StatCardSkeleton } from "@/components/shared/stat-card-skeleton";
import type { ModerationStatsEntity } from "../../../domain/entities/moderation-stats.entity";

/** 3 StatCards (FR-103): pending / resolved-this-week / removed. */
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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label={t("pending")}
        value={String(stats.pendingCount)}
        icon={Clock}
        tone="warning"
      />
      <StatCard
        label={t("resolvedThisWeek")}
        value={String(stats.resolvedThisWeekCount)}
        icon={CheckCircle2}
        tone="success"
      />
      <StatCard
        label={t("removed")}
        value={String(stats.removedCount)}
        icon={Trash2}
        tone="error"
      />
    </div>
  );
}
