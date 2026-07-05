import { describe, expect, it, vi } from "vitest";
import type { ChildEntity } from "../entities/child.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { GetChildrenUseCase } from "./get-children.use-case";

const children: ChildEntity[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    className: "11A2",
    avatar: "NK",
    avatarColor: "#5D87FF",
    gvcnName: "Nguyễn Thị Hương",
  },
];

function makeRepo(
  over: Partial<IDisciplineRepository> = {},
): IDisciplineRepository {
  return {
    getViolations: vi.fn(),
    recordViolation: vi.fn(),
    deleteViolation: vi.fn(),
    getConductSummary: vi.fn(),
    overrideConductGrade: vi.fn(),
    getLeaveRequests: vi.fn(),
    approveLeave: vi.fn(),
    rejectLeave: vi.fn(),
    getMyConductSummary: vi.fn(),
    getMyViolations: vi.fn(),
    getMyLeaveRequests: vi.fn(),
    submitLeaveRequest: vi.fn(),
    getChildren: vi.fn(),
    getChildConductSummary: vi.fn(),
    getChildViolations: vi.fn(),
    getChildLeaveRequests: vi.fn(),
    submitLeaveForChild: vi.fn(),
    ...over,
  };
}

describe("GetChildrenUseCase", () => {
  it("returns the parent's children from the repo", async () => {
    const getChildren = vi.fn().mockResolvedValue(children);
    const useCase = new GetChildrenUseCase(makeRepo({ getChildren }));

    const res = await useCase.execute();

    expect(getChildren).toHaveBeenCalledOnce();
    expect(res).toEqual(children);
  });

  it("returns an empty list when no children are linked", async () => {
    const getChildren = vi.fn().mockResolvedValue([]);
    const useCase = new GetChildrenUseCase(makeRepo({ getChildren }));

    expect(await useCase.execute()).toEqual([]);
  });

  it("propagates a forbidden failure thrown by the repo", async () => {
    const failure: DisciplineFailure = { type: "forbidden" };
    const getChildren = vi.fn().mockRejectedValue(failure);
    const useCase = new GetChildrenUseCase(makeRepo({ getChildren }));

    await expect(useCase.execute()).rejects.toMatchObject({
      type: "forbidden",
    });
  });
});
