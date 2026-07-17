import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonPlanEntity } from "@/features/lesson-plan/domain/entities/lesson-plan.entity";

const listMineExec = vi.fn();
const listBySubjectExec = vi.fn();

vi.mock("@/bootstrap/di/lesson-plan.di", () => ({
  makeListMyLessonPlansUseCase: async () => ({ execute: listMineExec }),
  makeListLessonPlansBySubjectUseCase: async () => ({
    execute: listBySubjectExec,
  }),
}));

import { listBySubjectAction, listMineAction } from "./actions";

const plan: LessonPlanEntity = {
  planId: "lp-1",
  teacherId: "t-1",
  subjectId: "sub-math",
  gradeLevel: "11",
  title: "x",
  objectives: "",
  contentOutline: "",
  activities: "",
  assessmentMethod: "",
  status: "DRAFT",
  tags: [],
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("teacher lesson-plans list actions", () => {
  it("listMineAction returns the page on success", async () => {
    listMineExec.mockResolvedValue({
      ok: true,
      value: { items: [plan], hasMore: false },
    });
    const res = await listMineAction();
    expect(res).toEqual({ ok: true, page: { items: [plan], hasMore: false } });
    expect(listMineExec).toHaveBeenCalledWith({ cursor: undefined });
  });

  it("listMineAction maps a failure to a stable errorKey", async () => {
    listMineExec.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    const res = await listMineAction("c1");
    expect(res).toEqual({ ok: false, errorKey: "network-error" });
    expect(listMineExec).toHaveBeenCalledWith({ cursor: "c1" });
  });

  it("listBySubjectAction forwards subjectId/tag/cursor", async () => {
    listBySubjectExec.mockResolvedValue({
      ok: true,
      value: { items: [], hasMore: false },
    });
    await listBySubjectAction("sub-phys", { tag: "Chương 3", cursor: "c2" });
    expect(listBySubjectExec).toHaveBeenCalledWith({
      subjectId: "sub-phys",
      tag: "Chương 3",
      cursor: "c2",
    });
  });

  it("listBySubjectAction maps a failure to an errorKey", async () => {
    listBySubjectExec.mockResolvedValue({
      ok: false,
      failure: { type: "invalid-id" },
    });
    const res = await listBySubjectAction("bad");
    expect(res).toEqual({ ok: false, errorKey: "invalid-id" });
  });
});
