import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeSubjectCatalogueRepository } from "@/bootstrap/di/subject-catalogue.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ILessonPlanRepository } from "@/features/lesson-plan/domain/repositories/i-lesson-plan.repository";
import { CreateLessonPlanUseCase } from "@/features/lesson-plan/domain/use-cases/create-lesson-plan.use-case";
import { GetLessonPlanUseCase } from "@/features/lesson-plan/domain/use-cases/get-lesson-plan.use-case";
import { ListLessonPlansBySubjectUseCase } from "@/features/lesson-plan/domain/use-cases/list-lesson-plans-by-subject.use-case";
import { ListMyLessonPlansUseCase } from "@/features/lesson-plan/domain/use-cases/list-my-lesson-plans.use-case";
import { PublishLessonPlanUseCase } from "@/features/lesson-plan/domain/use-cases/publish-lesson-plan.use-case";
import { UpdateLessonPlanUseCase } from "@/features/lesson-plan/domain/use-cases/update-lesson-plan.use-case";
import { LessonPlanRepository } from "@/features/lesson-plan/infrastructure/repositories/lesson-plan.repository";
import { MockLessonPlanRepository } from "@/features/lesson-plan/infrastructure/repositories/mocks/mock-lesson-plan.repository";

/** Subject option for the create-form picker + list filter dropdown. */
export interface SubjectOption {
  id: string;
  name: string;
}

async function makeRepo(): Promise<ILessonPlanRepository> {
  if (USE_MOCK) return new MockLessonPlanRepository();
  // Proactive refresh (decision 0018): rotate the access token BEFORE the
  // protected core call if it's about to expire, avoiding a wasted 401
  // (E18 playbook step 6, mirrors subject-catalogue.di.ts).
  await ensureFreshSession();
  return new LessonPlanRepository(await createServerHttpClient());
}

export async function makeCreateLessonPlanUseCase() {
  return new CreateLessonPlanUseCase(await makeRepo());
}

export async function makeUpdateLessonPlanUseCase() {
  return new UpdateLessonPlanUseCase(await makeRepo());
}

export async function makePublishLessonPlanUseCase() {
  return new PublishLessonPlanUseCase(await makeRepo());
}

export async function makeGetLessonPlanUseCase() {
  return new GetLessonPlanUseCase(await makeRepo());
}

export async function makeListMyLessonPlansUseCase() {
  return new ListMyLessonPlansUseCase(await makeRepo());
}

export async function makeListLessonPlansBySubjectUseCase() {
  return new ListLessonPlansBySubjectUseCase(await makeRepo());
}

/**
 * Subject options for the picker/filter — READ-ONLY reuse of the existing
 * `subject-catalogue` integration (story.md FE Resolution Notes #1; no second
 * subject-list integration). Flattens parents → subjects into `{ id, name }`.
 * Best-effort: any failure yields `[]` (the picker shows an inline retry/empty
 * sub-state, never crashes the form).
 */
export async function getSubjectOptions(): Promise<SubjectOption[]> {
  try {
    const repo = await makeSubjectCatalogueRepository();
    const parents = await repo.listParents();
    if (!parents.ok) return [];
    const options: SubjectOption[] = [];
    const seen = new Set<string>();
    for (const parent of parents.value) {
      const subjects = await repo.listSubjects(parent.id);
      if (!subjects.ok) continue;
      for (const s of subjects.value) {
        if (s.status !== "ACTIVE" || seen.has(s.id)) continue;
        seen.add(s.id);
        options.push({ id: s.id, name: s.name });
      }
    }
    return options;
  } catch {
    return [];
  }
}
