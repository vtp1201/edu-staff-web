import { getTranslations } from "next-intl/server";
import { StatCardSkeletonGrid } from "@/components/shared/stat-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-segment loading skeleton for the teacher dashboard (US-E17.10 FR-002).
 *
 * `TeacherDashboard` is a pure async RSC with NO client `isLoading` flag (it
 * awaits a DI use-case server-side, no TanStack Query), so the BA spec's
 * "isLoading boolean" framing does not apply to this screen. The Next.js App
 * Router `loading.tsx` Suspense-boundary convention achieves the same UX
 * outcome — Next auto-wraps `page.tsx` in `<Suspense fallback={<Loading/>}>`,
 * so this renders while the RSC's data fetch is pending, with zero CLS.
 *
 * The stat grid mirrors `TeacherDashboardHomeClient`'s real 6 cards; the body
 * card shells below match the ScheduleCard / PendingGrades+Notifications
 * columns so the below-the-fold sections don't jump when they mount.
 */
export default async function Loading() {
  const t = await getTranslations("Common");
  const srLabel = t("skeleton.loadingAriaLabel");

  return (
    <div className="space-y-5">
      <StatCardSkeletonGrid count={6} srLabel={srLabel} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-80 rounded-[var(--edu-radius-card)]" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-[var(--edu-radius-card)]" />
          <Skeleton className="h-36 rounded-[var(--edu-radius-card)]" />
        </div>
      </div>
    </div>
  );
}
