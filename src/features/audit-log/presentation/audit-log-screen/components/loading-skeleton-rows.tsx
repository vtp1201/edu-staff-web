import { Skeleton } from "@/components/ui/skeleton";

export interface LoadingSkeletonRowsProps {
  rowCount?: number;
}

function skeletonKeys(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `audit-skeleton-${i}`);
}

/** AC-1 — skeleton placeholder rows while the audit log loads. */
export function LoadingSkeletonRows({
  rowCount = 5,
}: LoadingSkeletonRowsProps) {
  return (
    <div
      className="space-y-2 rounded-[var(--edu-radius-card)] border border-border bg-card p-4 shadow-card"
      aria-hidden="true"
    >
      {skeletonKeys(rowCount).map((key) => (
        <Skeleton key={key} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
