"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import { makeGetLessonUseCase } from "@/bootstrap/di/lms.di";
import type { GetLessonResult } from "@/features/lms/presentation/lesson-player/lesson-player.i-vm";

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
