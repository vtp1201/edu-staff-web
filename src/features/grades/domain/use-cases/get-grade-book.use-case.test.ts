import { describe, expect, it, vi } from "vitest";
import type { GradeBook } from "../entities/grade-book.entity";
import type { IGradeBookRepository } from "../repositories/i-grade-book.repository";
import { GetGradeBookUseCase } from "./get-grade-book.use-case";

function makeRepo(
  over: Partial<IGradeBookRepository> = {},
): IGradeBookRepository {
  return {
    getGradeBook: vi.fn(),
    getMyGrades: vi.fn(),
    getChildGrades: vi.fn(),
    ...over,
  } as IGradeBookRepository;
}

const book: GradeBook = {
  classSubjectId: "cs-001",
  term: "HK1",
  className: "10A1",
  subjectName: "Toán",
  scheme: {
    subjectId: "subj-1",
    yearLabel: "2024-2025",
    termId: "HK1",
    columns: [],
  },
  rows: [],
  publishMode: "SELF_PUBLISH",
};

describe("GetGradeBookUseCase", () => {
  it("returns the grade book on success", async () => {
    const getGradeBook = vi.fn().mockResolvedValue(book);
    const uc = new GetGradeBookUseCase(makeRepo({ getGradeBook }));
    const result = await uc.execute("cs-001", "HK1");
    expect(getGradeBook).toHaveBeenCalledWith("cs-001", "HK1");
    expect(result).toEqual(book);
  });

  it("maps a thrown failure object", async () => {
    const getGradeBook = vi.fn().mockRejectedValue({ type: "forbidden" });
    const uc = new GetGradeBookUseCase(makeRepo({ getGradeBook }));
    expect(await uc.execute("cs-x", "HK1")).toEqual({ type: "forbidden" });
  });

  it("maps a generic error to network-error", async () => {
    const getGradeBook = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new GetGradeBookUseCase(makeRepo({ getGradeBook }));
    expect(await uc.execute("cs-001", "HK1")).toEqual({
      type: "network-error",
    });
  });
});
