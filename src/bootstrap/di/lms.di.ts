import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { resolveMyClassId } from "@/bootstrap/lib/resolve-my-class";
import type { ILmsRepository } from "@/features/lms/domain/repositories/i-lms.repository";
import { GetAssignmentDetailUseCase } from "@/features/lms/domain/use-cases/get-assignment.use-case";
import { GetCourseUseCase } from "@/features/lms/domain/use-cases/get-course.use-case";
import { GetLessonUseCase } from "@/features/lms/domain/use-cases/get-lesson.use-case";
import { ListAssignmentsUseCase } from "@/features/lms/domain/use-cases/list-assignments.use-case";
import { ListCourseItemsUseCase } from "@/features/lms/domain/use-cases/list-course-items.use-case";
import { ListCoursesUseCase } from "@/features/lms/domain/use-cases/list-courses.use-case";
import { ListCoursesWithSummaryUseCase } from "@/features/lms/domain/use-cases/list-courses-with-summary.use-case";
import { SubmitAssignmentUseCase } from "@/features/lms/domain/use-cases/submit-assignment.use-case";
import { LmsRepository } from "@/features/lms/infrastructure/repositories/lms.repository";
import { MOCK_CLASS_ID } from "@/features/lms/infrastructure/repositories/mocks/lms.fixtures";
import { MockLmsRepository } from "@/features/lms/infrastructure/repositories/mocks/lms.mock.repository";

/**
 * `lms` repository factory (per-request) — back on the STANDARD
 * `USE_MOCK ? Mock : Real` gate as of US-E24.1.
 *
 * The permanent force-mock this factory carried since US-E18.60 is GONE: it
 * existed because `services/lms` was a scaffold whose only route was
 * `/health`, so a real branch turned the two student screens into a permanent
 * error card. BE has since shipped the course/lesson/item/assignment/
 * submission surface and Kong routes it, so the real branch is now the honest
 * one. See `docs/decisions/0075-adopt-course-items-supersede-0073.md`
 * (superseding `0073-force-mock-lms-student-consumption.md`).
 *
 * Out of scope: `exam` / `exam-bank` / `lesson-bank` / `lesson-plan` /
 * `question-bank` live in separate `bootstrap/di/*.di.ts` factories wiring the
 * real `core` service and are unaffected.
 */
async function makeRepo(): Promise<ILmsRepository> {
  if (USE_MOCK) return new MockLmsRepository();
  // Proactive refresh (decision 0018) before the request goes out.
  await ensureFreshSession();
  return new LmsRepository(await createServerHttpClient());
}

export async function makeListCoursesUseCase() {
  return new ListCoursesUseCase(await makeRepo());
}

/** Course list + the per-course timeline summary the cards show (US-E24.2). */
export async function makeListCoursesWithSummaryUseCase() {
  return new ListCoursesWithSummaryUseCase(await makeRepo());
}

export async function makeGetCourseUseCase() {
  return new GetCourseUseCase(await makeRepo());
}

export async function makeListCourseItemsUseCase() {
  return new ListCourseItemsUseCase(await makeRepo());
}

export async function makeGetLessonUseCase() {
  return new GetLessonUseCase(await makeRepo());
}

export async function makeListAssignmentsUseCase() {
  return new ListAssignmentsUseCase(await makeRepo());
}

export async function makeGetAssignmentDetailUseCase() {
  return new GetAssignmentDetailUseCase(await makeRepo());
}

export async function makeSubmitAssignmentUseCase() {
  return new SubmitAssignmentUseCase(await makeRepo());
}

/**
 * The signed-in student's own `classId`, for the class-scoped `lms` reads.
 *
 * The generic helper lives in `bootstrap/lib` (it composes core's enrollment
 * read), but the MOCK seed belongs to this feature — so the LMS composition
 * root, not the helper, supplies `MOCK_CLASS_ID`. Keeps `bootstrap/lib` free
 * of any feature's fixtures.
 */
export async function resolveMyLmsClassId(): Promise<string | null> {
  return resolveMyClassId(MOCK_CLASS_ID);
}
