import { describe, expect, it } from "vitest";
import { GetLessonPlanUseCase } from "../get-lesson-plan.use-case";
import { FakeLessonPlanRepository, makePlan } from "./fake-repo";

describe("GetLessonPlanUseCase", () => {
  it("returns the plan and forwards the id", async () => {
    const repo = new FakeLessonPlanRepository();
    repo.getResult = makePlan({ planId: "lp-7" });
    const result = await new GetLessonPlanUseCase(repo).execute("lp-7");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.planId).toBe("lp-7");
    expect(repo.lastGetId).toBe("lp-7");
  });

  it.each([
    "not-found",
    "not-visible",
    "invalid-id",
    "network-error",
  ] as const)("maps a thrown repo %s failure", async (key) => {
    const repo = new FakeLessonPlanRepository();
    repo.getResult = new Error(key);
    const result = await new GetLessonPlanUseCase(repo).execute("lp-7");
    expect(result).toEqual({ ok: false, failure: { type: key } });
  });
});
