import { describe, expect, it } from "vitest";
import type { ChildSummary, GradeBook } from "../entities/grade-book.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradeBookRepository } from "../repositories/i-grade-book.repository";
import { GetChildListUseCase } from "./get-child-list.use-case";

const CHILDREN: ChildSummary[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    className: "11A2",
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "c2",
    name: "Nguyễn Thu Hà",
    className: "8B1",
    avatar: "NH",
    color: "success",
  },
];

function makeRepo(over: Partial<IGradeBookRepository>): IGradeBookRepository {
  return {
    getGradeBook: async () => ({}) as GradeBook,
    getMyGrades: async () => ({}) as GradeBook,
    getChildGrades: async () => ({}) as GradeBook,
    getChildList: async () => CHILDREN,
    ...over,
  };
}

describe("GetChildListUseCase", () => {
  it("returns the children list on success", async () => {
    const useCase = new GetChildListUseCase(makeRepo({}));
    const result = await useCase.execute();
    expect(result).toEqual({ ok: true, data: CHILDREN });
  });

  it("maps a thrown failure to { ok: false, error }", async () => {
    const failure: GradesFailure = { type: "not-found" };
    const useCase = new GetChildListUseCase(
      makeRepo({
        getChildList: async () => {
          throw failure;
        },
      }),
    );
    const result = await useCase.execute();
    expect(result).toEqual({ ok: false, error: { type: "not-found" } });
  });

  it("maps a non-failure throw to { ok: false, error: { type: 'unknown' } }", async () => {
    const useCase = new GetChildListUseCase(
      makeRepo({
        getChildList: async () => {
          throw new Error("boom");
        },
      }),
    );
    const result = await useCase.execute();
    expect(result).toEqual({ ok: false, error: { type: "unknown" } });
  });
});
