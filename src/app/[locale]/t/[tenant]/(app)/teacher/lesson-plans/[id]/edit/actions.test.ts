import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonPlanEntity } from "@/features/lesson-plan/domain/entities/lesson-plan.entity";

const updateExec = vi.fn();
const publishExec = vi.fn();
const getExec = vi.fn();

vi.mock("@/bootstrap/di/lesson-plan.di", () => ({
  makeUpdateLessonPlanUseCase: async () => ({ execute: updateExec }),
  makePublishLessonPlanUseCase: async () => ({ execute: publishExec }),
  makeGetLessonPlanUseCase: async () => ({ execute: getExec }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { publishAction, refetchAction, saveDraftAction } from "./actions";

const plan: LessonPlanEntity = {
  planId: "lp-9",
  teacherId: "t-1",
  subjectId: "sub-math",
  gradeLevel: "11",
  title: "Giáo án v2",
  objectives: "o",
  contentOutline: "c",
  activities: "a",
  assessmentMethod: "m",
  status: "DRAFT",
  tags: [],
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-02T00:00:00Z",
};

const input = {
  id: "lp-9",
  subjectId: "sub-math",
  gradeLevel: "11",
  title: "Giáo án v2",
  tags: [],
  objectives: "o",
  contentOutline: "c",
  activities: "a",
  assessmentMethod: "m",
};

beforeEach(() => vi.clearAllMocks());

describe("edit-route lesson-plan actions", () => {
  it("saveDraftAction updates and returns the plan", async () => {
    updateExec.mockResolvedValue({ ok: true, value: plan });
    const res = await saveDraftAction(input);
    expect(res).toEqual({ ok: true, plan });
    expect(updateExec).toHaveBeenCalledWith("lp-9", input);
  });

  it("saveDraftAction guards a missing id (defensive)", async () => {
    const { id: _id, ...noId } = input;
    const res = await saveDraftAction(noId);
    expect(res).toEqual({ ok: false, errorKey: "invalid-id" });
    expect(updateExec).not.toHaveBeenCalled();
  });

  it("saveDraftAction maps the already-published race", async () => {
    updateExec.mockResolvedValue({
      ok: false,
      failure: { type: "already-published" },
    });
    expect(await saveDraftAction(input)).toEqual({
      ok: false,
      errorKey: "already-published",
    });
  });

  it("publishAction maps forbidden", async () => {
    publishExec.mockResolvedValue({
      ok: false,
      failure: { type: "forbidden" },
    });
    expect(await publishAction("lp-9")).toEqual({
      ok: false,
      errorKey: "forbidden",
    });
  });

  it("refetchAction re-gets the plan for race resync", async () => {
    getExec.mockResolvedValue({
      ok: true,
      value: { ...plan, status: "PUBLISHED" },
    });
    const res = await refetchAction("lp-9");
    expect(res.ok).toBe(true);
    expect(getExec).toHaveBeenCalledWith("lp-9");
  });
});
