import { describe, expect, it } from "vitest";
import type { CreateLessonPlanInput } from "../../entities/lesson-plan.entity";
import { CreateLessonPlanUseCase } from "../create-lesson-plan.use-case";
import { FakeLessonPlanRepository, makePlan } from "./fake-repo";

const validInput: CreateLessonPlanInput = {
  subjectId: "sub-math",
  gradeLevel: "11",
  title: "Giáo án — Đạo hàm",
};

describe("CreateLessonPlanUseCase", () => {
  it("returns the created plan on success and forwards the input to the repo", async () => {
    const repo = new FakeLessonPlanRepository();
    repo.createResult = makePlan({ planId: "lp-new", title: validInput.title });
    const result = await new CreateLessonPlanUseCase(repo).execute(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.planId).toBe("lp-new");
    expect(repo.lastCreateInput).toEqual(validInput);
  });

  it("blocks an empty/whitespace title with title-required (no repo call)", async () => {
    const repo = new FakeLessonPlanRepository();
    const result = await new CreateLessonPlanUseCase(repo).execute({
      ...validInput,
      title: "   ",
    });
    expect(result).toEqual({ ok: false, failure: { type: "title-required" } });
    expect(repo.lastCreateInput).toBeUndefined();
  });

  it("blocks a >200-char title with title-too-long", async () => {
    const repo = new FakeLessonPlanRepository();
    const result = await new CreateLessonPlanUseCase(repo).execute({
      ...validInput,
      title: "x".repeat(201),
    });
    expect(result).toEqual({ ok: false, failure: { type: "title-too-long" } });
  });

  it("blocks >10 tags with tag-limit-exceeded", async () => {
    const repo = new FakeLessonPlanRepository();
    const result = await new CreateLessonPlanUseCase(repo).execute({
      ...validInput,
      tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
    });
    expect(result).toEqual({
      ok: false,
      failure: { type: "tag-limit-exceeded" },
    });
  });

  it("blocks a >50-char tag with tag-too-long", async () => {
    const repo = new FakeLessonPlanRepository();
    const result = await new CreateLessonPlanUseCase(repo).execute({
      ...validInput,
      tags: ["x".repeat(51)],
    });
    expect(result).toEqual({ ok: false, failure: { type: "tag-too-long" } });
  });

  it.each([
    "subject-not-found",
    "invalid-id",
    "forbidden",
    "network-error",
  ] as const)("maps a thrown repo %s failure", async (key) => {
    const repo = new FakeLessonPlanRepository();
    repo.createResult = new Error(key);
    const result = await new CreateLessonPlanUseCase(repo).execute(validInput);
    expect(result).toEqual({ ok: false, failure: { type: key } });
  });

  it("maps an unmatched thrown message to unknown (preserving it)", async () => {
    const repo = new FakeLessonPlanRepository();
    repo.createResult = new Error("boom-503");
    const result = await new CreateLessonPlanUseCase(repo).execute(validInput);
    expect(result).toEqual({
      ok: false,
      failure: { type: "unknown", message: "boom-503" },
    });
  });
});
