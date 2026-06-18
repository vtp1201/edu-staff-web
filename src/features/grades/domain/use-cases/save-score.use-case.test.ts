import { describe, expect, it, vi } from "vitest";
import type { StudentScoreRow } from "../entities/grade-sheet.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesRepository } from "../repositories/i-grades.repository";
import { SaveScoreUseCase } from "./save-score.use-case";

function makeRepo(over: Partial<IGradesRepository> = {}): IGradesRepository {
  return {
    getGradeSheet: vi.fn(),
    saveScore: vi.fn(),
    publishGrades: vi.fn(),
    ...over,
  } as IGradesRepository;
}

const okRow: StudentScoreRow = {
  studentId: "s1",
  studentName: "Nguyễn Văn An",
  studentCode: "HS001",
  scores: { tx: 8, gk: 7, ck: 9 },
  average: 8.2,
  publishStatus: "DRAFT",
};

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x && !("scores" in x);
}

describe("SaveScoreUseCase", () => {
  it("saves a valid score and returns the updated row", async () => {
    const saveScore = vi.fn().mockResolvedValue(okRow);
    const uc = new SaveScoreUseCase(makeRepo({ saveScore }));
    const result = await uc.execute("cs-001", "s1", "ck", 9, 10);
    expect(saveScore).toHaveBeenCalledWith("cs-001", "s1", "ck", 9);
    expect(result).toEqual(okRow);
  });

  it("returns score-out-of-range failure for an invalid value", async () => {
    const saveScore = vi.fn();
    const uc = new SaveScoreUseCase(makeRepo({ saveScore }));
    const result = await uc.execute("cs-001", "s1", "ck", 11, 10);
    expect(saveScore).not.toHaveBeenCalled();
    expect(isFailure(result) && result.type).toBe("score-out-of-range");
    if (isFailure(result) && result.type === "score-out-of-range") {
      expect(result.columnId).toBe("ck");
    }
  });

  it("maps a thrown transport error to network-error", async () => {
    const saveScore = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new SaveScoreUseCase(makeRepo({ saveScore }));
    const result = await uc.execute("cs-001", "s1", "ck", 9, 10);
    expect(isFailure(result) && result.type).toBe("network-error");
  });

  it("passes through an already-published failure thrown by the repo", async () => {
    const failure: GradesFailure = { type: "already-published" };
    const saveScore = vi.fn().mockRejectedValue(failure);
    const uc = new SaveScoreUseCase(makeRepo({ saveScore }));
    const result = await uc.execute("cs-001", "s1", "ck", 9, 10);
    expect(isFailure(result) && result.type).toBe("already-published");
  });
});
