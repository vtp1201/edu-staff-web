import { Skeleton } from "@/components/ui/skeleton";

export interface FeedSkeletonRowsProps {
  /** Rows to render — default 3 (AC-1901.1). */
  count?: number;
}

/**
 * Feature-local loading skeleton (3 post-card rows by default). No shared
 * Skeleton component exists (component-architecture §0.1); each feature composes
 * its own rows from the `ui/skeleton` primitive.
 */
export function FeedSkeletonRows({ count = 3 }: FeedSkeletonRowsProps) {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-live="polite"
      data-testid="feed-skeleton"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, no reorder
          key={i}
          className="flex flex-col gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      ))}
    </div>
  );
}
