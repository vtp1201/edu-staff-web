import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { resolveMyClassId } from "@/bootstrap/lib/resolve-my-class";
import type { IClassSubjectsRepository } from "@/features/lms/domain/repositories/i-class-subjects.repository";
import type { ILmsRepository } from "@/features/lms/domain/repositories/i-lms.repository";
import { AddDocumentItemUseCase } from "@/features/lms/domain/use-cases/add-document-item.use-case";
import { CreateAssignmentUseCase } from "@/features/lms/domain/use-cases/create-assignment.use-case";
import { CreateLessonUseCase } from "@/features/lms/domain/use-cases/create-lesson.use-case";
import { DeleteItemUseCase } from "@/features/lms/domain/use-cases/delete-item.use-case";
import { GetAssignmentDetailUseCase } from "@/features/lms/domain/use-cases/get-assignment.use-case";
import { GetCourseUseCase } from "@/features/lms/domain/use-cases/get-course.use-case";
import { GetLessonUseCase } from "@/features/lms/domain/use-cases/get-lesson.use-case";
import { ListClassSubjectsUseCase } from "@/features/lms/domain/use-cases/list-class-subjects.use-case";
import { ListCourseItemsUseCase } from "@/features/lms/domain/use-cases/list-course-items.use-case";
import { ListCoursesUseCase } from "@/features/lms/domain/use-cases/list-courses.use-case";
import { ListCoursesWithItemsUseCase } from "@/features/lms/domain/use-cases/list-courses-with-items.use-case";
import { ListCoursesWithSummaryUseCase } from "@/features/lms/domain/use-cases/list-courses-with-summary.use-case";
import { PatchItemUseCase } from "@/features/lms/domain/use-cases/patch-item.use-case";
import { PublishCourseUseCase } from "@/features/lms/domain/use-cases/publish-course.use-case";
import { ReorderItemsUseCase } from "@/features/lms/domain/use-cases/reorder-items.use-case";
import { SubmitAssignmentUseCase } from "@/features/lms/domain/use-cases/submit-assignment.use-case";
import { ClassSubjectsRepository } from "@/features/lms/infrastructure/repositories/class-subjects.repository";
import { LmsRepository } from "@/features/lms/infrastructure/repositories/lms.repository";
import { MockClassSubjectsRepository } from "@/features/lms/infrastructure/repositories/mocks/class-subjects.mock.repository";
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

/** Course list + every course's RAW timeline — the cross-subject filter
 *  `/student/courses?view=assignment|exam` (US-E24.4). */
export async function makeListCoursesWithItemsUseCase() {
  return new ListCoursesWithItemsUseCase(await makeRepo());
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

export async function makeGetAssignmentDetailUseCase() {
  return new GetAssignmentDetailUseCase(await makeRepo());
}

export async function makeSubmitAssignmentUseCase() {
  return new SubmitAssignmentUseCase(await makeRepo());
}

/* ── teacher course authoring (US-E24.10) ────────────────────────────────────
 *
 * Plain `new X(await makeRepo())` factories, NOT the `{ useCase, authCtx }`
 * tuple `period-log.di.ts` uses. The authorization these mutations need is
 * "does this course's subject belong to the caller in THIS class", which is a
 * two-read derivation the Server Action already performs for its own reasons
 * (`assertOwnCourseSubject`); threading it through the factory would only
 * duplicate those reads. Same reasoning as the `assertHomeroomOf()` precedent
 * in `teacher/classes/[classId]/actions.ts`.
 */

export async function makeReorderItemsUseCase() {
  return new ReorderItemsUseCase(await makeRepo());
}

export async function makePatchItemUseCase() {
  return new PatchItemUseCase(await makeRepo());
}

export async function makeCreateLessonUseCase() {
  return new CreateLessonUseCase(await makeRepo());
}

export async function makeCreateAssignmentUseCase() {
  return new CreateAssignmentUseCase(await makeRepo());
}

export async function makeAddDocumentItemUseCase() {
  return new AddDocumentItemUseCase(await makeRepo());
}

export async function makePublishCourseUseCase() {
  return new PublishCourseUseCase(await makeRepo());
}

export async function makeDeleteItemUseCase() {
  return new DeleteItemUseCase(await makeRepo());
}

/**
 * The GVCN subject picker's options. A SECOND repository on purpose: this call
 * goes to `core`, and a repository never spans two services
 * (`.claude/rules/api-integration.md`). It rides the same `USE_MOCK` flag so a
 * mock session cannot end up with a real picker over a mock course list.
 */
async function makeClassSubjectsRepo(): Promise<IClassSubjectsRepository> {
  if (USE_MOCK) return new MockClassSubjectsRepository();
  await ensureFreshSession();
  return new ClassSubjectsRepository(await createServerHttpClient());
}

export async function makeListClassSubjectsUseCase() {
  return new ListClassSubjectsUseCase(await makeClassSubjectsRepo());
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
