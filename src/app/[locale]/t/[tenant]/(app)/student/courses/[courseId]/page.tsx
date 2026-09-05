import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeGetCourseUseCase,
  makeListCourseItemsUseCase,
} from "@/bootstrap/di/lms.di";
import { summarizeCourse } from "@/features/lms/domain/use-cases/summarize-course";
import { CourseTimeline } from "@/features/lms/presentation/course-timeline/course-timeline";
import { toWeekVms } from "@/features/lms/presentation/course-timeline/course-timeline.derive";
import type {
  CourseTimelineActions,
  CourseTimelineVm,
} from "@/features/lms/presentation/course-timeline/course-timeline.i-vm";
import { toneForId } from "@/features/lms/presentation/tone";
import { retryListItemsAction } from "./actions";

interface Props {
  params: Promise<{ locale: string; tenant: string; courseId: string }>;
}

/**
 * `/student/courses/[courseId]` — the course timeline (US-E24.3 layout).
 *
 * Two reads, issued IN PARALLEL: the course itself (title, which the
 * class-scoped list row does carry, plus the description) and its ordered
 * items. A denial on the course collapses to `not-found` server-side
 * (existence-oracle rule), so the page 404s rather than hinting the course
 * exists. The timeline degrades independently — a readable course with an
 * unreadable timeline still renders its header plus a retry banner.
 */
export default async function StudentCourseTimelinePage({ params }: Props) {
  const { locale, tenant, courseId } = await params;
  const t = await getTranslations("courses");

  const guard = await requireRole(["student"]);
  if (!guard.ok) {
    return (
      <div role="alert" className="p-8 text-center text-edu-error-text text-sm">
        {t("errors.forbidden")}
      </div>
    );
  }

  const [courseResult, itemsResult] = await Promise.all([
    (await makeGetCourseUseCase()).execute(courseId),
    (await makeListCourseItemsUseCase()).execute(courseId),
  ]);

  if (!courseResult.ok) {
    if (courseResult.failure.type === "not-found") notFound();
    return (
      <div role="alert" className="p-8 text-center text-edu-error-text text-sm">
        {t(`errors.${courseResult.failure.type}`)}
      </div>
    );
  }

  const items = itemsResult.ok ? itemsResult.data : [];

  const vm: CourseTimelineVm = {
    courseId,
    courseName: courseResult.data.title,
    tone: toneForId(courseId),
    // `now` only orders deadlines; `openCount` counts the BE-computed state.
    openCount: summarizeCourse(items, new Date()).openCount,
    weeks: toWeekVms(items),
    errorKey: itemsResult.ok ? null : itemsResult.failure.type,
    mode: "student",
  };

  const actions: CourseTimelineActions = {
    // `.bind` (not an inline closure) — a plain local async function passed
    // from an RSC is not a Server Action and 500s at call time.
    retryListItems: retryListItemsAction.bind(null, courseId),
  };

  return (
    <CourseTimeline
      // Keyed by course: the client root seeds local state from `vm`, so moving
      // between two courses must REMOUNT it rather than keep the previous
      // course's rows.
      key={courseId}
      vm={vm}
      actions={actions}
      itemHrefBase={`/${locale}/t/${tenant}/student/courses/${courseId}/items`}
    />
  );
}
