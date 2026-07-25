import { Skeleton } from "@/components/ui/skeleton";

/**
 * Caller-owned row shape for this feature's loading list, shared by BOTH tabs
 * (conduct-notes + violations) so the two call sites stay one truth.
 *
 * The wrapper itself is the canonical `ListSkeleton` from
 * `@/components/shared/list-skeleton` (INFRA-shared-list-states, decision 0026);
 * the error card is `ListError` with `shape="inline-card"`. What lives here is
 * only the per-screen row markup that `renderRow` takes, NOT a parallel
 * component.
 */

/**
 * One shimmer row: avatar circle + 2 text lines + trailing badge pill
 * (design-spec `states.loading: EduSkeleton variant='rows' count=4`).
 */
export const sdSkeletonRow = () => (
  <div className="flex items-center gap-4 p-5">
    <Skeleton className="size-10 shrink-0 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="h-3 w-full max-w-md" />
    </div>
    <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
  </div>
);
