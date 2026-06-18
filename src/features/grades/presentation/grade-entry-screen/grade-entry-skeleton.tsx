"use client";

import { Skeleton } from "@/components/ui/skeleton";

const ROWS = [0, 1, 2, 3, 4];
const COLS = [0, 1, 2, 3];

export function GradeEntrySkeleton() {
  return (
    <div
      className="rounded-card border border-border bg-card p-5 shadow-card"
      aria-hidden="true"
    >
      <Skeleton className="mb-4 h-6 w-40" />
      <div className="flex flex-col gap-2">
        {ROWS.map((r) => (
          <div key={`grade-skel-row-${r}`} className="flex gap-3">
            {COLS.map((c) => (
              <Skeleton key={`grade-skel-${r}-${c}`} className="h-9 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
