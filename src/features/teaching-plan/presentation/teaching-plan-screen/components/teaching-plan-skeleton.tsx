"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton placeholder for the teaching-plan grid while loading. */
export function TeachingPlanSkeleton() {
  const rows = Array.from({ length: 6 }, (_, i) => i);
  const cols = Array.from({ length: 4 }, (_, i) => i);
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-6 w-32" />
      <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card">
        {rows.map((r) => (
          <div key={r} className="flex border-border border-b last:border-b-0">
            <div className="w-24 shrink-0 px-3 py-3">
              <Skeleton className="h-4 w-14" />
            </div>
            {cols.map((c) => (
              <div key={c} className="w-40 shrink-0 border-border border-l p-2">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
