import type { LucideIcon } from "lucide-react";

export interface RegionEmptyStateProps {
  icon: LucideIcon;
  /** Already-translated at the calling region (i18n boundary). */
  title: string;
  desc?: string;
}

/**
 * Dedicated per-region empty state (FR-007). Structurally distinct from the
 * error state (no `role="alert"`, neutral muted icon box, no retry action) and
 * from the loading skeleton (static content, no pulse) — satisfies AC-04.7.
 * Feature-local, reused 3× within this screen.
 */
export function RegionEmptyState({
  icon: Icon,
  title,
  desc,
}: RegionEmptyStateProps) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card px-6 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
    </div>
  );
}
