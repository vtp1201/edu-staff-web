import { describe, expect, it, vi } from "vitest";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesRepository } from "../repositories/i-grades.repository";
import { PublishGradesUseCase } from "./publish-grades.use-case";

function makeRepo(over: Partial<IGradesRepository> = {}): IGradesRepository {
  return {
    getGradeSheet: vi.fn(),
    saveScore: vi.fn(),
    publishGrades: vi.fn(),
    ...over,
  } as IGradesRepository;
}

describe("PublishGradesUseCase", () => {
  it("returns ok when publish succeeds", async () => {
    const publishGrades = vi.fn().mockResolvedValue(undefined);
    const uc = new PublishGradesUseCase(makeRepo({ publishGrades }));
    const result = await uc.execute("cs-001", "HK1");
    expect(publishGrades).toHaveBeenCalledWith("cs-001", "HK1");
    expect(result).toEqual({ ok: true });
  });

  it("passes through already-published failure", async () => {
    const failure: GradesFailure = { type: "already-published" };
    const publishGrades = vi.fn().mockRejectedValue(failure);
    const uc = new PublishGradesUseCase(makeRepo({ publishGrades }));
    const result = await uc.execute("cs-001", "HK1");
    expect(result).toEqual({ type: "already-published" });
  });

  it("maps a generic thrown error to network-error", async () => {
    const publishGrades = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new PublishGradesUseCase(makeRepo({ publishGrades }));
    const result = await uc.execute("cs-001", "HK1");
    expect(result).toEqual({ type: "network-error" });
  });
});
