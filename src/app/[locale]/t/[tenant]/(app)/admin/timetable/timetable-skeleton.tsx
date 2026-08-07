import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streaming placeholder for the timetable builder route (US-E18.48).
 *
 * The page now issues TWO reads in parallel — the class timetable and the
 * whole-school conflicts scan, which is a bounded but genuinely heavy
 * tenant-wide operation (BE US-188 pages up to 2000 classes). Suspending the
 * content behind this skeleton keeps the shell interactive instead of holding a
 * blank route for the slower of the two.
 *
 * Uses the shared `Skeleton` primitive so its shimmer inherits the global
 * `prefers-reduced-motion` reset (globals.css) rather than re-declaring one.
 */
export async function TimetableSkeleton() {
  const t = await getTranslations("timetable.conflicts");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-6 lg:p-8">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
