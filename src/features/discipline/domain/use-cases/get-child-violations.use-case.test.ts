import { describe, expect, it, vi } from "vitest";
import type { ViolationEntity } from "../entities/violation.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { GetChildViolationsUseCase } from "./get-child-violations.use-case";

const violations: ViolationEntity[] = [
  {
    id: "v-c1-1",
    studentId: "c1",
    studentName: "Nguyễn Minh Khoa",
    initials: "NK",
    avatarTone: "primary",
    classId: "11A2",
    className: "11A2",
    type: "late",
    date: "2026-04-29",
    period: 1,
    description: "Vào lớp muộn",
    severity: "low",
    handledBy: "Nguyễn Thị Hương",
    status: "recorded",
  },
];

function makeRepo(
  over: Partial<IDisciplineRepository> = {},
): IDisciplineRepository {
  return {
    getViolations: vi.fn(),
    recordViolation: vi.fn(),
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

describe("GetChildViolationsUseCase", () => {
  it("returns the child's violations", async () => {
    const getChildViolations = vi.fn().mockResolvedValue(violations);
    const useCase = new GetChildViolationsUseCase(
      makeRepo({ getChildViolations }),
    );

    const res = await useCase.execute("c1");

    expect(getChildViolations).toHaveBeenCalledWith("c1");
    expect(res).toHaveLength(1);
  });

  it("returns an empty list for a child with no violations", async () => {
    const getChildViolations = vi.fn().mockResolvedValue([]);
    const useCase = new GetChildViolationsUseCase(
      makeRepo({ getChildViolations }),
    );

    expect(await useCase.execute("c2")).toEqual([]);
  });

  it("rejects with invalid-child when childId is empty", async () => {
    const getChildViolations = vi.fn();
    const useCase = new GetChildViolationsUseCase(
      makeRepo({ getChildViolations }),
    );

    await expect(useCase.execute("")).rejects.toMatchObject({
      type: "invalid-child",
    });
    expect(getChildViolations).not.toHaveBeenCalled();
  });

  it("propagates a not-found failure thrown by the repo", async () => {
    const getChildViolations = vi.fn().mockRejectedValue({ type: "not-found" });
    const useCase = new GetChildViolationsUseCase(
      makeRepo({ getChildViolations }),
    );

    await expect(useCase.execute("c9")).rejects.toMatchObject({
      type: "not-found",
    });
  });
});
