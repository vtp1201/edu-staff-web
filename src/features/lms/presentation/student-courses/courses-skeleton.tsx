import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder: a 6-card grid mirroring the course-card layout. */
export function CoursesSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }, (_, i) => `course-skeleton-${i}`).map(
        (key) => (
          <Card key={key} className="overflow-hidden p-0 shadow-card">
            <Skeleton className="h-2 w-full rounded-none" />
            <div className="flex flex-col gap-3.5 p-5">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="size-10 rounded-[10px]" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </Card>
        ),
      )}
    </div>
  );
}
