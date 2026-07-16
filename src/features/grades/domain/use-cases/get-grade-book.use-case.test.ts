import { describe, expect, it, vi } from "vitest";
import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
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
    getChildList: vi.fn(),
    ...over,
  } as IGradeBookRepository;
}

const key: ClassSubjectTermKey = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

const book: GradeBook = {
  classId: "class-1",
  subjectId: "subj-1",
  termId: "HK1",
  academicYearLabel: "2025-2026",
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
    const result = await uc.execute(key);
    expect(getGradeBook).toHaveBeenCalledWith(key);
    expect(result).toEqual(book);
  });

  it("maps a thrown failure object", async () => {
    const getGradeBook = vi.fn().mockRejectedValue({ type: "forbidden" });
    const uc = new GetGradeBookUseCase(makeRepo({ getGradeBook }));
    expect(await uc.execute(key)).toEqual({ type: "forbidden" });
  });

  it("maps a generic error to network-error", async () => {
    const getGradeBook = vi.fn().mockRejectedValue(new Error("boom"));
    const uc = new GetGradeBookUseCase(makeRepo({ getGradeBook }));
    expect(await uc.execute(key)).toEqual({
      type: "network-error",
    });
  });
});
