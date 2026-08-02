"use client";

import { useTranslations } from "next-intl";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for the principal roster (US-E13.10). Extracted so the
 * RSC route's `Suspense` fallback and the Storybook loading story render the
 * exact same markup. Uses the canonical shared `ListSkeleton` (decision 0026)
 * rather than a screen-local shimmer.
 */
export function PrincipalRosterSkeleton() {
  const t = useTranslations("Common");

  return (
    <main className="flex-1 overflow-y-auto bg-edu-bg px-8 py-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-[18px]">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-[92px] w-full rounded-xl" />
        <ListSkeleton
          loadingAriaLabel={t("skeleton.loadingAriaLabel")}
          rows={8}
          variant="inline"
          renderRow={() => (
            <div className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          )}
        />
      </div>
    </main>
  );
}
