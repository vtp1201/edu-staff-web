"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = [0, 1, 2, 3, 4];
const COLS = [0, 1, 2, 3, 4];

export function GradeBookSkeleton() {
  const t = useTranslations("gradeBook");
  return (
    <div
      role="status"
      aria-label={t("loading")}
      aria-live="polite"
      className="rounded-[12px] border border-border bg-card p-5 shadow-card"
    >
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="mb-2 h-6 w-40" />
        {ROWS.map((r) => (
          <div key={`gb-skel-row-${r}`} className="flex gap-3">
            {COLS.map((c) => (
              <Skeleton key={`gb-skel-${r}-${c}`} className="h-9 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
