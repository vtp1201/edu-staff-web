"use client";

import { Skeleton } from "@/components/ui/skeleton";

const ROWS = ["s1", "s2", "s3", "s4", "s5"];

export function GradeApprovalSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <Skeleton className="h-9 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex flex-col gap-2 rounded-[var(--edu-radius-card)] border border-border bg-card p-4">
        {ROWS.map((id) => (
          <Skeleton key={id} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
