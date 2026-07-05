import { getTranslations } from "next-intl/server";
import { StatCardSkeletonGrid } from "@/components/shared/stat-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-segment loading skeleton for the student dashboard (US-E17.10 FR-003).
 *
 * Like the teacher dashboard, `StudentDashboard` is a pure async RSC with no
 * client `isLoading` flag, so the skeleton is delivered via the Next.js
 * `loading.tsx` Suspense convention rather than a boolean gate.
 *
 * KNOWN LIMITATION: the student dashboard's content is currently fully
 * static/mock (hardcoded COURSES array, only `getTranslations` is awaited), so
 * this Suspense boundary resolves near-instantly today. It is forward-looking
 * correct scaffolding for when real data-fetching lands (matches FR-003 intent)
 * and guarantees zero blank-flash / CLS at that point.
 *
 * The stat grid mirrors the real 4 cards (courses, assignments, avgScore,
 * attendance); the card shell below matches the "courses" section footprint.
 */
export default async function Loading() {
  const t = await getTranslations("Common");
  const srLabel = t("skeleton.loadingAriaLabel");

  return (
    <div className="space-y-6">
      <StatCardSkeletonGrid count={4} srLabel={srLabel} />
      <Skeleton className="h-64 rounded-[var(--edu-radius-card)]" />
    </div>
  );
}
