"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for both tab lists — fixed 4 rows (NFR-006, AC-001.1/AC-006.1,
 * design-spec `states.loading: EduSkeleton variant='rows' count=4`).
 * Feature-local: `EduSkeleton` is a mockup-only name, no shared equivalent exists
 * (component-architecture.md §0 — flagged as a promotion candidate, not executed).
 */
const ROWS = ["r1", "r2", "r3", "r4"] as const;

export function SDListSkeleton() {
  const tCommon = useTranslations("Common");
  return (
    <div
      role="status"
      aria-busy="true"
      className="divide-y divide-border overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card"
    >
      <span className="sr-only">{tCommon("skeleton.loadingAriaLabel")}</span>
      {ROWS.map((key) => (
        <div key={key} className="flex items-center gap-4 p-5">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
