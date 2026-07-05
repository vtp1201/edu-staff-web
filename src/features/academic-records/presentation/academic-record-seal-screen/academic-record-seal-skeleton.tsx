import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/** AC-1 — page-level loading skeleton for the seal screen. */
export function AcademicRecordSealSkeleton() {
  const t = useTranslations("Common.skeleton");
  return (
    <output aria-label={t("loadingAriaLabel")} className="block space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </output>
  );
}
