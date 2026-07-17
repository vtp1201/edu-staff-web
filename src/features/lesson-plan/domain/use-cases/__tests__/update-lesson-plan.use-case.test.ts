import { describe, expect, it } from "vitest";
import type { UpdateLessonPlanInput } from "../../entities/lesson-plan.entity";
import { UpdateLessonPlanUseCase } from "../update-lesson-plan.use-case";
import { FakeLessonPlanRepository, makePlan } from "./fake-repo";

const validInput: UpdateLessonPlanInput = {
  gradeLevel: "11",
  title: "Giáo án — Đạo hàm (v2)",
};

describe("UpdateLessonPlanUseCase", () => {
  it("returns the updated plan and forwards id + input", async () => {
    const repo = new FakeLessonPlanRepository();
    repo.updateResult = makePlan({ planId: "lp-9", title: validInput.title });
    const result = await new UpdateLessonPlanUseCase(repo).execute(
      "lp-9",
      validInput,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.title).toBe(validInput.title);
    expect(repo.lastUpdate).toEqual({ id: "lp-9", input: validInput });
  });

  it("blocks an empty title before hitting the repo", async () => {
    const repo = new FakeLessonPlanRepository();
    const result = await new UpdateLessonPlanUseCase(repo).execute("lp-9", {
      ...validInput,
      title: "",
    });
    expect(result).toEqual({ ok: false, failure: { type: "title-required" } });
    expect(repo.lastUpdate).toBeUndefined();
  });

  it.each([
    "already-published",
    "not-found",
    "not-visible",
    "forbidden",
    "network-error",
  ] as const)("maps a thrown repo %s failure", async (key) => {
    const repo = new FakeLessonPlanRepository();
    repo.updateResult = new Error(key);
    const result = await new UpdateLessonPlanUseCase(repo).execute(
      "lp-9",
      validInput,
    );
    expect(result).toEqual({ ok: false, failure: { type: key } });
  });
});
