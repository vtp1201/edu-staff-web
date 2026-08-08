import "server-only";

import type { ILmsRepository } from "@/features/lms/domain/repositories/i-lms.repository";
import { AskQuestionUseCase } from "@/features/lms/domain/use-cases/ask-question.use-case";
import { GetCourseLessonsUseCase } from "@/features/lms/domain/use-cases/get-course-lessons.use-case";
import { GetNoteUseCase } from "@/features/lms/domain/use-cases/get-note.use-case";
import { ListAssignmentsUseCase } from "@/features/lms/domain/use-cases/list-assignments.use-case";
import { ListCoursesUseCase } from "@/features/lms/domain/use-cases/list-courses.use-case";
import { ListQuestionsUseCase } from "@/features/lms/domain/use-cases/list-questions.use-case";
import { MarkLessonCompleteUseCase } from "@/features/lms/domain/use-cases/mark-lesson-complete.use-case";
import { SaveNoteUseCase } from "@/features/lms/domain/use-cases/save-note.use-case";
import { SubmitAssignmentUseCase } from "@/features/lms/domain/use-cases/submit-assignment.use-case";
import { MockLmsRepository } from "@/features/lms/infrastructure/repositories/mocks/lms.mock.repository";

/**
 * LMS student-consumption repository factory (per-request).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** (US-E18.60, ADR 0073) —
 * same shape as `grades.di.ts`'s `makeApprovalRepo()` (ADR 0054) and
 * `teaching-plan.di.ts` (US-E18.9).
 *
 * **Reason.** Ground-truthed 2026-08-08 against edu-api `f5ed5a86` + the live
 * stack: the `lms` service is a SCAFFOLD — `services/lms/docs/openapi.yaml`
 * declares only `/health`, and every `/lms/api/v1/*` route (courses, lessons,
 * assignments) 404s from the `lms` service itself, not from Kong. With the old
 * `USE_MOCK ? Mock : Real` branch, real mode degraded the two student screens
 * built on this DI — **Khoá học** (US-E11.6) and **Bài tập** (US-E11.7) — into
 * a permanent error card, because there is no recoverable request shape: the
 * endpoints do not exist. Pinning the mock keeps both screens on stable data
 * until the contract lands.
 *
 * **Removal condition.** BE ships the LMS consumption contract for student
 * courses/lessons/assignments — cross-repo ask **#51**, filed in
 * `docs/reports/2026-08-08-fe-to-be-asks-lms.md`. At that point restore the
 * `USE_MOCK ? Mock : Real` gate (or wire real directly, per the epic's usual
 * un-force-mock pattern) and re-import `LmsRepository` +
 * `createServerHttpClient` here — the real `LmsRepository` class is kept
 * DORMANT, not deleted (ADR 0073 alternative #3), so it is reachable only by
 * removing this pin.
 *
 * See `docs/decisions/0073-force-mock-lms-student-consumption.md` (and the
 * precedent `docs/decisions/0054-grades-wiring-contract-remap.md`).
 *
 * Out of scope: `exam` / `exam-bank` / `lesson-bank` / `lesson-plan` /
 * `question-bank` live in separate `bootstrap/di/*.di.ts` factories that wire
 * the real `core` service and are unaffected.
 */
async function makeRepo(): Promise<ILmsRepository> {
  return new MockLmsRepository();
}

export async function makeListCoursesUseCase() {
  return new ListCoursesUseCase(await makeRepo());
}

export async function makeGetCourseLessonsUseCase() {
  return new GetCourseLessonsUseCase(await makeRepo());
}

export async function makeMarkLessonCompleteUseCase() {
  return new MarkLessonCompleteUseCase(await makeRepo());
}

export async function makeGetNoteUseCase() {
  return new GetNoteUseCase(await makeRepo());
}

export async function makeSaveNoteUseCase() {
  return new SaveNoteUseCase(await makeRepo());
}

export async function makeListQuestionsUseCase() {
  return new ListQuestionsUseCase(await makeRepo());
}

export async function makeAskQuestionUseCase() {
  return new AskQuestionUseCase(await makeRepo());
}

export async function makeListAssignmentsUseCase() {
  return new ListAssignmentsUseCase(await makeRepo());
}

export async function makeSubmitAssignmentUseCase() {
  return new SubmitAssignmentUseCase(await makeRepo());
}
