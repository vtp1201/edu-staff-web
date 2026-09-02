import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeGetCourseUseCase,
  makeListCourseItemsUseCase,
} from "@/bootstrap/di/lms.di";
import { LessonPlayer } from "@/features/lms/presentation/lesson-player/lesson-player";
import {
  pickInitialLessonId,
  toTimelineItems,
} from "@/features/lms/presentation/lesson-player/lesson-player.derive";
import type {
  LessonPlayerActions,
  LessonPlayerVm,
} from "@/features/lms/presentation/lesson-player/lesson-player.i-vm";
import { toneForId } from "@/features/lms/presentation/tone";
import { getLessonAction } from "./actions";

interface Props {
  params: Promise<{ locale: string; tenant: string; courseId: string }>;
}

/**
 * `/student/courses/[courseId]` — the course timeline.
 *
 * Two reads: the course itself (title + description, which the class-scoped
 * list row does not carry) and its ordered items. A denial on either collapses
 * to `not-found` server-side (existence-oracle rule), so the page 404s rather
 * than hinting the course exists. The timeline degrades independently — a
 * readable course with an unreadable timeline still renders its header.
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

  const courseResult = await (await makeGetCourseUseCase()).execute(courseId);
  if (!courseResult.ok) {
    if (courseResult.failure.type === "not-found") notFound();
    return (
      <div role="alert" className="p-8 text-center text-edu-error-text text-sm">
        {t(`errors.${courseResult.failure.type}`)}
      </div>
    );
  }

  const itemsResult = await (await makeListCourseItemsUseCase()).execute(
    courseId,
  );
  const items = itemsResult.ok ? toTimelineItems(itemsResult.data) : [];

  const vm: LessonPlayerVm = {
    courseId,
    courseName: courseResult.data.title,
    courseDescription: courseResult.data.description,
    coursesListHref: `/${locale}/t/${tenant}/student/courses`,
    tone: toneForId(courseId),
    items,
    initialLessonId: pickInitialLessonId(items),
    errorKey: itemsResult.ok ? null : itemsResult.failure.type,
  };

  const actions: LessonPlayerActions = {
    // `.bind` (not an inline closure) — a plain local async function passed
    // from an RSC is not a Server Action and 500s at call time.
    getLesson: getLessonAction.bind(null, courseId),
  };

  return (
    <LessonPlayer
      vm={vm}
      actions={actions}
      assignmentsHref={`/${locale}/t/${tenant}/student/assignments`}
    />
  );
}
