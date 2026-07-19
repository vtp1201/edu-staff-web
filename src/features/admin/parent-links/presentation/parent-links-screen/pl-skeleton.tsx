import { Skeleton } from "@/components/ui/skeleton";

export interface PLSkeletonProps {
  /** Announced to screen readers while the shimmer (aria-hidden) shows (A11Y). */
  loadingAriaLabel: string;
}

/**
 * Loading placeholder — 5 row shimmers (AC-001.1, NFR-005; design-spec
 * states.loading rows=5). Feature-local (no generic shared skeleton exists —
 * same false-cognate finding as invitations). The shimmer is aria-hidden; a
 * visually-hidden `role="status"` sibling announces the loading state.
 */
export function PLSkeleton({ loadingAriaLabel }: PLSkeletonProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <span className="sr-only" role="status">
        {loadingAriaLabel}
      </span>
      <div aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => i).map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-border border-b px-4 py-3.5 last:border-b-0"
          >
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="hidden h-4 w-32 md:block" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="ml-auto size-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
