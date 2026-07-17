import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  CreateQuestionInput,
  ListMyQuestionsParams,
  QuestionEntity,
  QuestionPage,
  SearchQuestionsParams,
  UpdateQuestionInput,
} from "../../../domain/entities/question.entity";
import type { IQuestionBankRepository } from "../../../domain/repositories/i-question-bank.repository";
import { isSearchFilterSatisfied } from "../../../domain/use-cases/is-search-filter-satisfied";
import { MOCK_CURRENT_TEACHER_ID, MOCK_QUESTIONS } from "./fixtures";

const DEFAULT_LIMIT = 6;

// Module-level mutable store (mock-first wiring — mutate-in-place so toggling
// NEXT_PUBLIC_USE_MOCK off requires zero UI change).
const store = new Map<string, QuestionEntity>(
  MOCK_QUESTIONS.map((q) => [q.id, { ...q }]),
);
let idCounter = 100;

/** Trivial index-based cursor sufficient to exercise useInfiniteQuery wiring. */
function paginate(
  all: QuestionEntity[],
  cursor: string | undefined,
  limit: number,
): QuestionPage {
  const start = cursor ? Number.parseInt(cursor, 10) : 0;
  if (Number.isNaN(start) || start < 0) throw new Error("invalid-cursor");
  const slice = all.slice(start, start + limit);
  const nextIndex = start + limit;
  const hasMore = nextIndex < all.length;
  return {
    items: slice.map((q) => structuredClone(q)),
    nextCursor: hasMore ? String(nextIndex) : undefined,
    hasMore,
  };
}

function byUpdatedDesc(a: QuestionEntity, b: QuestionEntity): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export class MockQuestionBankRepository implements IQuestionBankRepository {
  async search(params: SearchQuestionsParams): Promise<QuestionPage> {
    await mockDelay(300);
    // Defense-in-depth: the client gate should prevent this, but a bypassed
    // call maps to the same failure key (spec §6.7 / AC-902.8).
    if (!isSearchFilterSatisfied(params.subjectId ?? "", params.tag ?? "")) {
      throw new Error("search-filter-required");
    }
    let items = Array.from(store.values())
      .filter((q) => q.status === "PUBLISHED")
      .sort(byUpdatedDesc);
    if (params.subjectId)
      items = items.filter((q) => q.subjectId === params.subjectId);
    if (params.gradeLevel)
      items = items.filter((q) => q.gradeLevel === params.gradeLevel);
    if (params.difficulty)
      items = items.filter((q) => q.difficulty === params.difficulty);
    if (params.tag) {
      const tag = params.tag.toLowerCase();
      items = items.filter(
        (q) =>
          q.tags.some((x) => x.toLowerCase().includes(tag)) ||
          q.body.toLowerCase().includes(tag),
      );
    }
    return paginate(items, params.cursor, params.limit ?? DEFAULT_LIMIT);
  }

  async listMine(params: ListMyQuestionsParams): Promise<QuestionPage> {
    await mockDelay(200);
    const mine = Array.from(store.values())
      .filter((q) => q.authorId === MOCK_CURRENT_TEACHER_ID)
      .sort(byUpdatedDesc);
    return paginate(mine, params.cursor, params.limit ?? DEFAULT_LIMIT);
  }

  async create(input: CreateQuestionInput): Promise<QuestionEntity> {
    await mockDelay(300);
    idCounter += 1;
    const now = new Date().toISOString();
    const question: QuestionEntity = {
      id: `q-mock-${idCounter}`,
      tenantId: "tn-1",
      authorId: MOCK_CURRENT_TEACHER_ID,
      questionType: input.questionType,
      subjectId: input.subjectId,
      gradeLevel: input.gradeLevel,
      difficulty: input.difficulty,
      body: input.body,
      expectedAnswer: input.expectedAnswer ? input.expectedAnswer : null,
      status: "DRAFT",
      tags: input.tags ?? [],
      // publishedAt intentionally absent for DRAFT.
      createdAt: now,
      updatedAt: now,
    };
    store.set(question.id, question);
    return structuredClone(question);
  }

  async getById(id: string): Promise<QuestionEntity> {
    await mockDelay(150);
    const found = store.get(id);
    if (!found) throw new Error("not-found");
    // Visibility gate (INT-204): a DRAFT is only visible to its author.
    if (
      found.status === "DRAFT" &&
      found.authorId !== MOCK_CURRENT_TEACHER_ID
    ) {
      throw new Error("not-visible");
    }
    return structuredClone(found);
  }

  async update(
    id: string,
    input: UpdateQuestionInput,
  ): Promise<QuestionEntity> {
    await mockDelay(280);
    const existing = store.get(id);
    if (!existing) throw new Error("not-found");
    // Ownership check BEFORE status — exercises the forbidden-edit call-site
    // branch (spec §6.7).
    if (existing.authorId !== MOCK_CURRENT_TEACHER_ID) {
      throw new Error("forbidden-edit");
    }
    if (existing.status === "PUBLISHED") throw new Error("already-published");
    const updated: QuestionEntity = {
      ...existing,
      body: input.body,
      expectedAnswer: input.expectedAnswer ? input.expectedAnswer : null,
      tags: input.tags ?? [],
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return structuredClone(updated);
  }

  async publish(id: string): Promise<QuestionEntity> {
    await mockDelay(250);
    const existing = store.get(id);
    if (!existing) throw new Error("not-found");
    if (existing.authorId !== MOCK_CURRENT_TEACHER_ID) {
      throw new Error("forbidden-edit");
    }
    if (existing.status === "PUBLISHED") throw new Error("already-published");
    const now = new Date().toISOString();
    const published: QuestionEntity = {
      ...existing,
      status: "PUBLISHED",
      publishedAt: now,
      updatedAt: now,
    };
    store.set(id, published);
    return structuredClone(published);
  }
}
