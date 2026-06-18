import { describe, expect, it, vi } from "vitest";
import type { StudentScoreRow } from "../entities/grade-sheet.entity";
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

function row(scores: Record<string, number | null>): StudentScoreRow {
  return {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores,
    average: null,
    publishStatus: "DRAFT",
  };
}

const COMPLETE_ROWS: StudentScoreRow[] = [row({ tx: 8, gk: 7.5, ck: 9 })];

describe("PublishGradesUseCase", () => {
  it("returns ok when publish succeeds", async () => {
    const publishGrades = vi.fn().mockResolvedValue(undefined);
    const uc = new PublishGradesUseCase(makeRepo({ publishGrades }));
    const result = await uc.execute("cs-001", "HK1", COMPLETE_ROWS);
    expect(publishGrades).toHaveBeenCalledWith("cs-001", "HK1");
    expect(result).toEqual({ ok: true });
  });

  it("returns incomplete-scores failure when any row has null scores", async () => {
    const publishGrades = vi.fn().mockResolvedValue(undefined);
    const uc = new PublishGradesUseCase(makeRepo({ publishGrades }));
    const rows = [
      row({ tx: 8, gk: 7.5, ck: 9 }),
      row({ tx: 4, gk: 5, ck: null }),
    ];
    const result = await uc.execute("cs-001", "HK1", rows);
    expect(result).toEqual({ type: "incomplete-scores" });
    expect(publishGrades).not.toHaveBeenCalled();
  });

  it("passes through already-published failure", async () => {
    const failure: GradesFailure = { type: "already-published" };
    const publishGrades = vi.fn().mockRejectedValue(failure);
    const uc = new PublishGradesUseCase(makeRepo({ publishGrades }));
    const result = await uc.execute("cs-001", "HK1", COMPLETE_ROWS);
    expect(result).toEqual({ type: "already-published" });
  });

  it("maps a generic thrown error to network-error", async () => {
    const publishGrades = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new PublishGradesUseCase(makeRepo({ publishGrades }));
    const result = await uc.execute("cs-001", "HK1", COMPLETE_ROWS);
    expect(result).toEqual({ type: "network-error" });
  });
});
