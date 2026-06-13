import { Skeleton } from "@/components/ui/skeleton";

export function RosterSkeleton() {
  return (
    <main className="flex-1 overflow-y-auto bg-edu-bg px-8 py-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-[18px]">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-[92px] w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <div className="space-y-2 rounded-xl border border-edu-border bg-edu-card p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="space-y-2 rounded-xl border border-edu-border bg-edu-card p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
