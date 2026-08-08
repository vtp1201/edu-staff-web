/**
 * Unit tests — `lms.di.ts` env matrix (US-E18.60, ADR 0073).
 *
 * The LMS student-consumption factory is **force-mocked regardless of
 * `NEXT_PUBLIC_USE_MOCK`**: the `lms` BE service is a scaffold (only `/health`
 * exists; every `/lms/api/v1/*` route 404s from the service itself), so a real
 * branch would turn the two student screens (Khoá học US-E11.6, Bài tập
 * US-E11.7) into a permanent error card the moment the app-wide flag flips.
 *
 * Every use-case factory is exercised because each calls `makeRepo()`
 * independently — a partial pin would leak one path back to the dead real repo.
 * The `calls` recorder proves `createServerHttpClient` is NEVER reached in
 * either mode (the real branch is unreachable, not merely losing a race).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

/** Ordered record of the server-side side effects the factory would perform. */
const calls: string[] = [];

beforeEach(() => {
  vi.resetModules();
  calls.length = 0;
  vi.doMock("@/bootstrap/lib/http.server", () => ({
    createServerHttpClient: vi.fn(async () => {
      calls.push("http");
      return {};
    }),
  }));
  vi.doMock("@/bootstrap/di/auth.di", () => ({
    ensureFreshSession: vi.fn(async () => {
      calls.push("refresh");
    }),
  }));
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
  vi.doUnmock("@/bootstrap/lib/http.server");
  vi.doUnmock("@/bootstrap/di/auth.di");
});

/**
 * `vi.resetModules()` gives each import a fresh class identity, so `instanceof`
 * is unusable — every use-case holds its repository as its ONLY object-valued
 * field, so read it back and compare `constructor.name`.
 */
function repoOf(useCase: object): { constructor: { name: string } } {
  const objects = Object.values(useCase).filter(
    (v): v is object => typeof v === "object" && v !== null,
  );
  expect(objects).toHaveLength(1);
  return objects[0];
}

async function importDiWithEnv(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = value;
  return import("./lms.di");
}

async function allUseCases(value: string | undefined) {
  const di = await importDiWithEnv(value);
  return Promise.all([
    di.makeListCoursesUseCase(),
    di.makeGetCourseLessonsUseCase(),
    di.makeMarkLessonCompleteUseCase(),
    di.makeGetNoteUseCase(),
    di.makeSaveNoteUseCase(),
    di.makeListQuestionsUseCase(),
    di.makeAskQuestionUseCase(),
    di.makeListAssignmentsUseCase(),
    di.makeSubmitAssignmentUseCase(),
  ]);
}

describe("lms.di — force-mocked regardless of USE_MOCK (ADR 0073)", () => {
  for (const value of ["true", "false", undefined] as const) {
    it(`every factory resolves MockLmsRepository when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      const useCases = await allUseCases(value);
      expect(useCases).toHaveLength(9);
      for (const useCase of useCases) {
        expect(repoOf(useCase).constructor.name).toBe("MockLmsRepository");
      }
    });

    it(`never creates a server http client when NEXT_PUBLIC_USE_MOCK=${String(value)}`, async () => {
      await allUseCases(value);
      expect(calls).toEqual([]);
    });
  }
});
