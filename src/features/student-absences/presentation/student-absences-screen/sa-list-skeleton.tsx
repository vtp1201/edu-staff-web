"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the absences list — fixed 4 rows (NFR-007,
 * AC-001.1/AC-002.1, design-spec `states.loading: EduSkeleton variant='rows'
 * count=4`). Distinct from the empty state.
 *
 * Feature-local: `EduSkeleton` is a mockup-only name and no shared equivalent
 * exists repo-wide — this is the 5th byte-identical copy of the pattern
 * (component-architecture.md §0 flagged it to `fe-lead` as an overdue promotion
 * candidate; promoting it is out of this story's scope).
 */
const ROWS = ["r1", "r2", "r3", "r4"] as const;

export function SAListSkeleton() {
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
