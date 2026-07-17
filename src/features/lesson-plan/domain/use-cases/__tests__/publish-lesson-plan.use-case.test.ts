import { describe, expect, it } from "vitest";
import { PublishLessonPlanUseCase } from "../publish-lesson-plan.use-case";
import { FakeLessonPlanRepository, makePlan } from "./fake-repo";

describe("PublishLessonPlanUseCase", () => {
  it("returns the PUBLISHED plan and forwards the id", async () => {
    const repo = new FakeLessonPlanRepository();
    repo.publishResult = makePlan({
      planId: "lp-2",
      status: "PUBLISHED",
      publishedAt: "2026-07-02T00:00:00Z",
    });
    const result = await new PublishLessonPlanUseCase(repo).execute("lp-2");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("PUBLISHED");
      expect(result.value.publishedAt).toBe("2026-07-02T00:00:00Z");
    }
    expect(repo.lastPublishId).toBe("lp-2");
  });

  it.each([
    "already-published",
    "not-found",
    "not-visible",
    "forbidden",
    "title-required",
    "network-error",
  ] as const)("maps a thrown repo %s failure", async (key) => {
    const repo = new FakeLessonPlanRepository();
    repo.publishResult = new Error(key);
    const result = await new PublishLessonPlanUseCase(repo).execute("lp-2");
    expect(result).toEqual({ ok: false, failure: { type: key } });
  });
});
