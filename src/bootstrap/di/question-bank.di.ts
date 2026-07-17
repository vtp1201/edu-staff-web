import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeSubjectCatalogueRepository } from "@/bootstrap/di/subject-catalogue.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IQuestionBankRepository } from "@/features/question-bank/domain/repositories/i-question-bank.repository";
import { CreateQuestionUseCase } from "@/features/question-bank/domain/use-cases/create-question.use-case";
import { GetQuestionUseCase } from "@/features/question-bank/domain/use-cases/get-question.use-case";
import { ListMyQuestionsUseCase } from "@/features/question-bank/domain/use-cases/list-my-questions.use-case";
import { PublishQuestionUseCase } from "@/features/question-bank/domain/use-cases/publish-question.use-case";
import { SearchQuestionsUseCase } from "@/features/question-bank/domain/use-cases/search-questions.use-case";
import { UpdateQuestionUseCase } from "@/features/question-bank/domain/use-cases/update-question.use-case";
import { MockQuestionBankRepository } from "@/features/question-bank/infrastructure/repositories/mocks/mock-question-bank.repository";
import { QuestionBankRepository } from "@/features/question-bank/infrastructure/repositories/question-bank.repository";

/** Subject option for the builder/filter dropdowns (redeclared per-feature). */
export interface SubjectOption {
  id: string;
  name: string;
}

async function makeRepo(): Promise<IQuestionBankRepository> {
  if (USE_MOCK) return new MockQuestionBankRepository();
  // Proactive refresh (decision 0018): rotate the access token BEFORE the
  // protected core call if it's about to expire, avoiding a wasted 401
  // (mirrors lesson-plan.di.ts / subject-catalogue.di.ts).
  await ensureFreshSession();
  return new QuestionBankRepository(await createServerHttpClient());
}

export async function makeSearchQuestionsUseCase() {
  return new SearchQuestionsUseCase(await makeRepo());
}

export async function makeListMyQuestionsUseCase() {
  return new ListMyQuestionsUseCase(await makeRepo());
}

export async function makeCreateQuestionUseCase() {
  return new CreateQuestionUseCase(await makeRepo());
}

export async function makeGetQuestionUseCase() {
  return new GetQuestionUseCase(await makeRepo());
}

export async function makeUpdateQuestionUseCase() {
  return new UpdateQuestionUseCase(await makeRepo());
}

export async function makePublishQuestionUseCase() {
  return new PublishQuestionUseCase(await makeRepo());
}

/**
 * Subject options for the builder picker + list filter — READ-ONLY reuse of the
 * existing `subject-catalogue` integration (plan.md §0 item 1; no second
 * subject-list integration, no new mock). Flattens parents → subjects into
 * `{ id, name }`. Best-effort: any failure yields `[]` (the picker degrades to
 * an empty/inline state, never crashes the form). Mirrors lesson-plan's own
 * thin `getSubjectOptions` (the same small duplication it accepts).
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
