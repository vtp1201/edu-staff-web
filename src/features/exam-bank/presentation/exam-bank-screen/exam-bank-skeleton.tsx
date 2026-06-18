"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

function placeholderKeys(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `eb-skeleton-${i}`);
}

export function ExamBankSkeleton({ count = 6 }: { count?: number }) {
  const t = useTranslations("examBank");
  const keys = placeholderKeys(count);

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-label={t("loadingAriaLabel")}
    >
      <span className="sr-only">{t("loading")}</span>
      {keys.map((key) => (
        <div
          key={key}
          className="flex flex-col gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-5"
        >
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
