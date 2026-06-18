import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for the exam list (used in Storybook + Suspense fallback). */
export function ExamListSkeleton() {
  const t = useTranslations("exam");
  return (
    <div className="space-y-6 p-6" aria-busy="true">
      <span className="sr-only">{t("skeleton.loading")}</span>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-[var(--edu-radius-card)]" />
        ))}
      </div>
      <Skeleton className="h-10 w-72 rounded-full" />
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 rounded-[var(--edu-radius-card)]" />
        ))}
      </div>
    </div>
  );
}
