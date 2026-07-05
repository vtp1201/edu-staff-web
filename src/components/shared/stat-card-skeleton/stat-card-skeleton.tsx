import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils";

/**
 * Loading placeholder mirroring `DefaultStatCard`'s exact box footprint
 * (icon box 52px `size-13`, `px-6 py-5` card, label-then-value column) so the
 * skeleton→data swap has zero layout shift (US-E17.10 NFR-002). Purely
 * decorative — the `StatCardSkeletonGrid` wrapper owns the a11y semantics, so
 * this card carries no aria attributes. The motion-safe pulse gate is already
 * baked into the shared `Skeleton` primitive; do not re-add it here.
 */
export function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-[var(--edu-radius-card)] border border-border bg-card px-6 py-5 shadow-card">
      <Skeleton className="size-13 shrink-0 rounded-[var(--edu-radius-card)]" />
      <div className="min-w-0 flex-1 space-y-2">
        {/* label line (mirrors DefaultStatCard's label-then-value order) */}
        <Skeleton className="h-3 w-20" />
        {/* value line (26px extrabold value) */}
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  );
}

/**
 * Grid of `count` StatCardSkeletons using the SAME container class the three
 * real dashboards use (discipline/teacher/student), so column count + gap match
 * exactly. Dumb presentational component: the caller passes the already-
 * translated `srLabel` so this works in both a client component (discipline,
 * `useTranslations`) and an RSC `loading.tsx` (teacher/student,
 * `getTranslations`) without importing next-intl itself.
 */
export function StatCardSkeletonGrid({
  count,
  srLabel,
  className,
}: {
  count: number;
  srLabel: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4",
        className,
      )}
    >
      <span className="sr-only">{srLabel}</span>
      {Array.from({ length: count }, (_, i) => `stat-card-skeleton-${i}`).map(
        (key) => (
          <StatCardSkeleton key={key} />
        ),
      )}
    </div>
  );
}
