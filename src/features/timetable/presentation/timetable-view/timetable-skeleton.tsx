import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { DAY_KEYS, PERIODS } from "./timetable-view.constants";

/** Loading placeholder that outlines the grid (rows × day columns). AC5. */
export function TimetableSkeleton() {
  const t = useTranslations("timetableView");
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("loading")}
      className="overflow-hidden rounded-xl border border-edu-border bg-edu-card p-3 shadow-card"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-[100px] shrink-0" />
          {DAY_KEYS.map((d) => (
            <Skeleton key={d} className="h-8 flex-1" />
          ))}
        </div>
        {PERIODS.map((p) => (
          <div key={p.n} className="flex gap-1.5">
            <Skeleton className="h-[76px] w-[100px] shrink-0" />
            {DAY_KEYS.map((d) => (
              <Skeleton key={d} className="h-[76px] flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
