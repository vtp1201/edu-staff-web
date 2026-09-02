import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder: a 6-card grid mirroring the US-E24.2 course-card
 *  layout (stripe → header → next-deadline block → summary row). */
export function CoursesSkeleton() {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-[18px]"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }, (_, i) => `course-skeleton-${i}`).map(
        (key) => (
          <Card key={key} className="overflow-hidden p-0 shadow-card">
            <Skeleton className="h-1.5 w-full rounded-none" />
            <div className="flex flex-col gap-3 px-4.5 pt-4 pb-4.5">
              <div className="flex items-start justify-between gap-2.5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="size-10 rounded-[10px]" />
              </div>
              <Skeleton className="h-[62px] w-full rounded-[9px]" />
              <div className="flex items-center justify-between gap-2 pt-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </Card>
        ),
      )}
    </div>
  );
}
