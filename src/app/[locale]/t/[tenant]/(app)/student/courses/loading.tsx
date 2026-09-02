import { getTranslations } from "next-intl/server";
import { CoursesSkeleton } from "@/features/lms/presentation/student-courses/courses-skeleton";

/**
 * Route-segment loading skeleton for `/student/courses` (US-E24.1 fix round).
 *
 * `StudentCoursesPage` is a pure async RSC (class resolution + the class-scoped
 * course list are both awaited server-side), so there is no client `isLoading`
 * flag to gate a skeleton on — Next.js' `loading.tsx` Suspense convention is
 * the only place it can live. Without this the route had NO loading state at
 * all and `CoursesSkeleton` was dead code.
 *
 * The grid itself is `aria-hidden`, so the announcement is the sr-only status.
 */
export default async function Loading() {
  const t = await getTranslations("courses");

  return (
    <div className="flex flex-col gap-5">
      <span className="sr-only" role="status">
        {t("skeleton.loading")}
      </span>
      <CoursesSkeleton />
    </div>
  );
}
