"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/** 4-row loading list (NFR-006 — skeleton before data, no layout shift). */
export function QBSkeleton() {
  const t = useTranslations("questionBank");
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("loadingAriaLabel")}
      className="flex flex-col gap-3"
    >
      {Array.from({ length: 4 }, (_, i) => `qb-sk-${i}`).map((key) => (
        <div
          key={key}
          className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
        >
          <Skeleton className="size-13 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="mt-1 h-8 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
