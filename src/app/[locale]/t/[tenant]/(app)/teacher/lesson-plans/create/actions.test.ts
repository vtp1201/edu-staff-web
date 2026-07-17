import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonPlanEntity } from "@/features/lesson-plan/domain/entities/lesson-plan.entity";

const createExec = vi.fn();
const updateExec = vi.fn();
const publishExec = vi.fn();
const getExec = vi.fn();

vi.mock("@/bootstrap/di/lesson-plan.di", () => ({
  makeCreateLessonPlanUseCase: async () => ({ execute: createExec }),
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
  title: "Giáo án",
  objectives: "o",
  contentOutline: "c",
  activities: "a",
  assessmentMethod: "m",
  status: "DRAFT",
  tags: [],
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
};

const draft = {
  subjectId: "sub-math",
  gradeLevel: "11",
  title: "Giáo án",
  tags: [],
  objectives: "o",
  contentOutline: "c",
  activities: "a",
  assessmentMethod: "m",
};

beforeEach(() => vi.clearAllMocks());

describe("create-route lesson-plan actions", () => {
  it("saveDraftAction with no id creates and returns the plan", async () => {
    createExec.mockResolvedValue({ ok: true, value: plan });
    const res = await saveDraftAction(draft);
    expect(res).toEqual({ ok: true, plan });
    expect(createExec).toHaveBeenCalledWith(draft);
    expect(updateExec).not.toHaveBeenCalled();
  });

  it("saveDraftAction with an id updates instead of creating", async () => {
    updateExec.mockResolvedValue({ ok: true, value: plan });
    await saveDraftAction({ ...draft, id: "lp-9" });
    expect(updateExec).toHaveBeenCalledWith("lp-9", { ...draft, id: "lp-9" });
    expect(createExec).not.toHaveBeenCalled();
  });

  it("saveDraftAction maps a create failure to an errorKey", async () => {
    createExec.mockResolvedValue({
      ok: false,
      failure: { type: "subject-not-found" },
    });
    expect(await saveDraftAction(draft)).toEqual({
      ok: false,
      errorKey: "subject-not-found",
    });
  });

  it("publishAction returns the published plan", async () => {
    publishExec.mockResolvedValue({
      ok: true,
      value: { ...plan, status: "PUBLISHED" },
    });
    const res = await publishAction("lp-9");
    expect(res.ok).toBe(true);
    expect(publishExec).toHaveBeenCalledWith("lp-9");
  });

  it("publishAction maps already-published", async () => {
    publishExec.mockResolvedValue({
      ok: false,
      failure: { type: "already-published" },
    });
    expect(await publishAction("lp-9")).toEqual({
      ok: false,
      errorKey: "already-published",
    });
  });

  it("refetchAction re-gets the plan", async () => {
    getExec.mockResolvedValue({ ok: true, value: plan });
    const res = await refetchAction("lp-9");
    expect(res).toEqual({ ok: true, plan });
    expect(getExec).toHaveBeenCalledWith("lp-9");
  });
});
