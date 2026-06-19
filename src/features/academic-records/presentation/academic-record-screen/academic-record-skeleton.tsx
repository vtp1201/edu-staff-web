import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the academic-record screen. */
export function AcademicRecordSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-36" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
