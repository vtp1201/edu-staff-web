import { Skeleton } from "@/components/ui/skeleton";

/**
 * Caller-owned pieces of this feature's list states, shared by BOTH tabs
 * (conduct-notes + violations) so the two call sites stay one truth.
 *
 * The wrappers themselves are the canonical `ListSkeleton`/`ListError` from
 * `@/components/shared/*` (INFRA-shared-list-states, decision 0026) — what lives
 * here is only the per-screen row shape + the per-screen outer card classes those
 * shared components take as props, NOT a parallel component.
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

/** Outer card of the list error (AC-001.6/AC-006.7) — error-tinted border. */
export const SD_LIST_ERROR_CLASS =
  "gap-3 rounded-[var(--edu-radius-card)] border border-edu-error/20 px-5 py-10 shadow-card";
