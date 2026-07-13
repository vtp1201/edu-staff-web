"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

export interface ChartSkeletonProps {
  /** Placeholder column count — 8 for subjects, 6 for weeks. */
  columnCount: number;
}

// Deterministic descending-ish bar heights so the skeleton reads as a chart.
const HEIGHTS = [70, 90, 55, 80, 65, 95, 60, 85];

/**
 * Chart-shaped loading placeholder built from the `ui/skeleton` primitive
 * (component-architecture.md §2 — no shared chart skeleton exists). Owns its
 * own `role="status"` live region per region (FR-003 independence). Motion-safe
 * pulse is baked into the base `Skeleton` primitive — not re-added here.
 */
export function ChartSkeleton({ columnCount }: ChartSkeletonProps) {
  const t = useTranslations("reports");
  const keys = Array.from(
    { length: columnCount },
    (_, i) => `chart-skeleton-col-${i}`,
  );
  return (
    <div
      role="status"
      aria-busy="true"
      className="rounded-[var(--edu-radius-card)] border border-border bg-card px-6 py-5"
    >
      <span className="sr-only">{t("charts.loading")}</span>
      <Skeleton className="mb-5 h-4 w-40" />
      <div className="flex h-[180px] items-end gap-3">
        {keys.map((key, i) => (
          <div key={key} className="flex flex-1 flex-col items-center gap-2">
            <Skeleton
              className="w-full max-w-[34px] rounded-t-md"
              style={{ height: `${HEIGHTS[i % HEIGHTS.length]}%` }}
            />
            <Skeleton className="h-2.5 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
