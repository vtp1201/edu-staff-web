import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder — 5 row shimmers (AC-001.1, design-spec states.loading
 * rows=5). Feature-local (no shared generic skeleton exists; see
 * component-architecture.md §0).
 */
export function InvitationsSkeleton() {
  return (
    <div
      className="rounded-xl border border-border bg-card p-2"
      aria-hidden="true"
    >
      {Array.from({ length: 5 }, (_, i) => i).map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-border border-b px-4 py-3.5 last:border-b-0"
        >
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="hidden h-4 w-28 md:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="ml-auto h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
