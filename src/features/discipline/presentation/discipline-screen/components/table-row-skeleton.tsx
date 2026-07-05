import { Skeleton } from "@/components/ui/skeleton";

/**
 * Feature-local loading placeholder for the discipline page-level skeleton
 * (US-E17.10 FR-004). Renders as plain flex-row divs (not real `<tr>`/`<td>`)
 * because it lives outside any `<table>` element — inside the page-level
 * `vm.isLoading` block, not inside the real data-bound `<Table>`. Only one
 * consumer (discipline), so it stays feature-local per component-organization.md.
 *
 * `min-h-[44px]` keeps the row footprint matching the real conduct-tab rows
 * (zero CLS + 44px touch target). The motion-safe pulse gate is baked into the
 * shared `Skeleton` primitive; do not re-add it here.
 */
export function TableRowSkeleton() {
  return (
    <div className="flex min-h-[44px] items-center gap-4 border-b border-border px-5">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-3.5 w-32" />
    </div>
  );
}
