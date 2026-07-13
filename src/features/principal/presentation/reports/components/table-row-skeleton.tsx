import { Skeleton } from "@/components/ui/skeleton";

export type TableRowSkeletonProps = Record<string, never>;

/**
 * Feature-local table-row placeholder (mirrors discipline-screen's version).
 * Plain flex-row divs (not `<tr>`/`<td>`) — lives outside a `<table>` in the
 * loading block. `min-h-[44px]` matches the real row footprint (zero CLS + 44px
 * target). Motion-safe pulse is owned by the base `Skeleton` primitive.
 */
export function TableRowSkeleton() {
  return (
    <div className="flex min-h-[44px] items-center gap-4 border-b border-border px-6">
      <Skeleton className="size-8 shrink-0 rounded-[var(--edu-radius-btn)]" />
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="ml-auto h-3.5 w-12" />
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="size-8 rounded-[var(--edu-radius-btn)]" />
    </div>
  );
}
