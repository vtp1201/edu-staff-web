"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeGetLessonUseCase,
  makeListCourseItemsUseCase,
} from "@/bootstrap/di/lms.di";
import { summarizeCourse } from "@/features/lms/domain/use-cases/summarize-course";
import { toWeekVms } from "@/features/lms/presentation/course-timeline/course-timeline.derive";
import type {
  GetLessonResult,
  RetryListItemsResult,
} from "@/features/lms/presentation/course-timeline/course-timeline.i-vm";

/**
 * Lazily reads ONE lesson's body. The timeline endpoint (and the lesson LIST
 * endpoint) omit `content` by design, so the body is a separate round trip made
 * when the student opens a lesson tile.
 *
 * `courseId` is bound by the page (the route owns it) so the client cannot ask
 * for a lesson under a course it did not navigate to.
 */
export async function getLessonAction(
  courseId: string,
  lessonId: string,
): Promise<GetLessonResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeGetLessonUseCase()).execute(
    courseId,
    lessonId,
  );
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return {
    ok: true,
    data: {
      id: result.data.id,
      title: result.data.title,
      content: result.data.content,
    },
  };
}

/**
 * Re-runs the timeline read behind the "Thử lại" button (US-E24.3).
 *
 * An RSC cannot re-run its own failed read, and the page's OTHER read (the
 * course header) succeeded — so a full route refresh would be the wrong
 * granularity. This re-does exactly the read that failed and hands back the
 * same VM shape the page derived, so the client swaps data without knowing
 * anything about entities.
 *
 * `courseId` is bound by the page for the same reason as above.
 */
export async function retryListItemsAction(
  courseId: string,
): Promise<RetryListItemsResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeListCourseItemsUseCase()).execute(courseId);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };

  return {
    ok: true,
    data: {
      weeks: toWeekVms(result.data),
      // `now` only decides which deadline is still ahead; `openCount` reads the
      // BE-computed state, so the clock read here cannot affect availability.
      openCount: summarizeCourse(result.data, new Date()).openCount,
    },
  };
}
