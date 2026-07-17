"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/** 6-card loading grid (NFR-003 — skeleton before data, no layout shift). */
export function LessonPlanSkeleton() {
  const t = useTranslations("lessonPlan");
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("loadingAriaLabel")}
      className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4"
    >
      {Array.from({ length: 6 }, (_, i) => `sk-${i}`).map((key) => (
        <div
          key={key}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <Skeleton className="h-16 w-full rounded-none" />
          <div className="flex flex-col gap-2 p-3.5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="mt-2 h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
