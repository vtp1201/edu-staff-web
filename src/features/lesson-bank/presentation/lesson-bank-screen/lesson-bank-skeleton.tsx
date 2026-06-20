"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils";

type LessonBankSkeletonProps = {
  layout?: "grid" | "list";
  count?: number;
};

/** Stable, non-index keys for static placeholder rows. */
function placeholderKeys(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `lb-skeleton-${i}`);
}

export function LessonBankSkeleton({
  layout = "grid",
  count = 8,
}: LessonBankSkeletonProps) {
  const t = useTranslations("lessonBank");
  const keys = placeholderKeys(count);

  if (layout === "list") {
    return (
      <div
        className="space-y-2"
        role="status"
        aria-label={t("loadingAriaLabel")}
      >
        <span className="sr-only">{t("loadingSR")}</span>
        {keys.map((key) => (
          <div
            key={key}
            className="flex items-center gap-4 rounded-[var(--edu-radius-card)] border border-border bg-card px-4 py-3"
          >
            <Skeleton className="size-12 shrink-0 rounded-[var(--edu-radius-btn)]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="hidden h-4 w-10 md:block" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      )}
      role="status"
      aria-label={t("loadingAriaLabel")}
    >
      <span className="sr-only">{t("loadingSR")}</span>
      {keys.map((key) => (
        <div
          key={key}
          className="flex flex-col overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card"
        >
          <Skeleton className="h-32 w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-1/3" />
            <div className="mt-1 flex gap-1.5">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
