import { describe, expect, it, vi } from "vitest";
import type { ILessonBankRepository } from "../repositories/i-lesson-bank.repository";
import { DeleteLessonUseCase } from "./delete-lesson.use-case";

function makeRepo(
  overrides: Partial<ILessonBankRepository> = {},
): ILessonBankRepository {
  return {
    listLessons: vi.fn(),
    getLessonDetail: vi.fn(),
    uploadLesson: vi.fn(),
    updateLesson: vi.fn(),
    deleteLesson: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("DeleteLessonUseCase", () => {
  it("ok — deletes lesson successfully", async () => {
    const repo = makeRepo();
    const uc = new DeleteLessonUseCase(repo);
    const result = await uc.execute("l-1");
    expect(result.ok).toBe(true);
    expect(repo.deleteLesson).toHaveBeenCalledWith("l-1");
  });

  it("not-found — returns failure when id is empty", async () => {
    const repo = makeRepo();
    const uc = new DeleteLessonUseCase(repo);
    const result = await uc.execute("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("not-found");
    expect(repo.deleteLesson).not.toHaveBeenCalled();
  });

  it("not-found — wraps repo 'not-found' error", async () => {
    const repo = makeRepo({
      deleteLesson: vi.fn().mockRejectedValue(new Error("not-found")),
    });
    const uc = new DeleteLessonUseCase(repo);
    const result = await uc.execute("l-99");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("not-found");
  });

  it("forbidden — wraps repo 'forbidden' error", async () => {
    const repo = makeRepo({
      deleteLesson: vi.fn().mockRejectedValue(new Error("forbidden")),
    });
    const uc = new DeleteLessonUseCase(repo);
    const result = await uc.execute("l-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("forbidden");
  });

  it("unknown — wraps unexpected repo error", async () => {
    const repo = makeRepo({
      deleteLesson: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const uc = new DeleteLessonUseCase(repo);
    const result = await uc.execute("l-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("unknown");
  });
});
