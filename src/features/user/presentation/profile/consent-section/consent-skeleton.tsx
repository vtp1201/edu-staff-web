import { Skeleton } from "@/components/ui/skeleton";

export interface ConsentSkeletonProps {
  /** Announced to screen readers while the shimmer (aria-hidden) shows. */
  loadingAriaLabel: string;
}

/**
 * Section loading placeholder — 2 CARD-shaped shimmers (header row + 3 toggle
 * rows each), matching the "child-cards" mental model (AC-001.1/NFR-005). NOT
 * `PLSkeleton`'s flat table-row shape (different layout — kept feature-local per
 * component-architecture §5.1). The shimmer is `aria-hidden`; a visually-hidden
 * `role="status"` sibling announces loading.
 */
export function ConsentSkeleton({ loadingAriaLabel }: ConsentSkeletonProps) {
  return (
    <div className="space-y-4">
      <span className="sr-only" role="status">
        {loadingAriaLabel}
      </span>
      <div aria-hidden="true" className="space-y-4">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3 rounded-lg bg-edu-bg px-3 py-2.5">
              <Skeleton className="size-[38px] shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20 rounded-full" />
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="size-[34px] shrink-0 rounded-[9px]" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2.5 w-52" />
                  </div>
                  <Skeleton className="h-[1.15rem] w-8 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
