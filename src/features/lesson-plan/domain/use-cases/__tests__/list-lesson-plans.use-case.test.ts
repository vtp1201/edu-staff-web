import { describe, expect, it } from "vitest";
import { ListLessonPlansBySubjectUseCase } from "../list-lesson-plans-by-subject.use-case";
import { ListMyLessonPlansUseCase } from "../list-my-lesson-plans.use-case";
import { FakeLessonPlanRepository, makePlan } from "./fake-repo";

describe("ListMyLessonPlansUseCase", () => {
  it("returns a page and forwards cursor/limit params", async () => {
    const repo = new FakeLessonPlanRepository();
    repo.listMineResult = {
      items: [makePlan()],
      nextCursor: "c2",
      hasMore: true,
    };
    const result = await new ListMyLessonPlansUseCase(repo).execute({
      cursor: "c1",
      limit: 12,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.nextCursor).toBe("c2");
    }
    expect(repo.lastListMineParams).toEqual({ cursor: "c1", limit: 12 });
  });

  it("defaults params to {} when omitted", async () => {
    const repo = new FakeLessonPlanRepository();
    await new ListMyLessonPlansUseCase(repo).execute();
    expect(repo.lastListMineParams).toEqual({});
  });

  it.each([
    "invalid-cursor",
    "network-error",
    "forbidden",
  ] as const)("maps a thrown repo %s failure", async (key) => {
    const repo = new FakeLessonPlanRepository();
    repo.listMineResult = new Error(key);
    const result = await new ListMyLessonPlansUseCase(repo).execute();
    expect(result).toEqual({ ok: false, failure: { type: key } });
  });
});

describe("ListLessonPlansBySubjectUseCase", () => {
  it("returns a page and forwards subjectId/tag/cursor", async () => {
    const repo = new FakeLessonPlanRepository();
    repo.listBySubjectResult = { items: [makePlan()], hasMore: false };
    const result = await new ListLessonPlansBySubjectUseCase(repo).execute({
      subjectId: "sub-phys",
      tag: "Chương 3",
      cursor: "c1",
    });
    expect(result.ok).toBe(true);
    expect(repo.lastListBySubjectParams).toEqual({
      subjectId: "sub-phys",
      tag: "Chương 3",
      cursor: "c1",
    });
  });

  it.each([
    "invalid-cursor",
    "invalid-id",
    "network-error",
  ] as const)("maps a thrown repo %s failure", async (key) => {
    const repo = new FakeLessonPlanRepository();
    repo.listBySubjectResult = new Error(key);
    const result = await new ListLessonPlansBySubjectUseCase(repo).execute({
      subjectId: "sub-phys",
    });
    expect(result).toEqual({ ok: false, failure: { type: key } });
  });
});
