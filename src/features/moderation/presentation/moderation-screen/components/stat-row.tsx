"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { AbsentValue } from "@/components/shared/absent-value";
import { StatCard } from "@/components/shared/stat-card/stat-card";
import { StatCardSkeleton } from "@/components/shared/stat-card-skeleton";
import type { ModerationStatsEntity } from "../../../domain/entities/moderation-stats.entity";

export type StatRowMode = "loading" | "unavailable" | "ready";

/**
 * Skeleton ONLY while a first read is genuinely in flight.
 *
 * Once the stats query settles in error — `forbidden` is non-retryable and
 * reachable in production (MANAGER is missing from the social RBAC allow-list),
 * and a transient error eventually exhausts its retry budget — `isLoading` goes
 * false while `data` stays `undefined` forever. Keeping the skeleton there
 * would read as "still loading" when the truth is "this failed", the same lie
 * `AbsentValue` / `initialStats: null` (never zeros) exist to prevent.
 */
export function statRowMode({
  hasStats,
  isLoading,
  hasError,
}: {
  hasStats: boolean;
  isLoading: boolean;
  hasError: boolean;
}): StatRowMode {
  // Real (possibly stale) numbers beat both other states — a background
  // refetch must not blank out counters we already learned.
  if (hasStats) return "ready";
  if (hasError) return "unavailable";
  return isLoading ? "loading" : "unavailable";
}

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
  hasError,
}: {
  stats: ModerationStatsEntity | null;
  isLoading: boolean;
  hasError: boolean;
}) {
  const t = useTranslations("moderation.stats");
  const tRoot = useTranslations("moderation");
  const mode = statRowMode({ hasStats: stats !== null, isLoading, hasError });

  if (mode === "loading") {
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
        value={
          stats ? (
            String(stats.pendingCount)
          ) : (
            <AbsentValue label={tRoot("unavailable")} />
          )
        }
        icon={Clock}
        tone="warning"
      />
      <StatCard
        label={t("resolved")}
        value={
          stats ? (
            String(stats.resolvedCount)
          ) : (
            <AbsentValue label={tRoot("unavailable")} />
          )
        }
        icon={CheckCircle2}
        tone="success"
      />
    </div>
  );
}
