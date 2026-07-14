import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder: 4 stacked card-shaped rows (mirrors courses-skeleton). */
export function AssignmentsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => `assignment-skeleton-${i}`).map(
        (key) => (
          <Card key={key} className="px-5 py-4 shadow-card">
            <div className="flex items-start gap-3.5">
              <Skeleton className="size-11 shrink-0 rounded-[10px]" />
              <div className="flex-1 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="mt-2 h-9 w-32 rounded-lg" />
              </div>
            </div>
          </Card>
        ),
      )}
    </div>
  );
}
