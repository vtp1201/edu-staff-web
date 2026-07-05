import { describe, expect, it, vi } from "vitest";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { DeleteViolationUseCase } from "./delete-violation.use-case";

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

async function expectFailure(
  fn: () => Promise<unknown>,
  type: DisciplineFailure["type"],
) {
  await expect(fn()).rejects.toMatchObject({ type });
}

describe("DeleteViolationUseCase", () => {
  it("deletes a violation via the repo", async () => {
    const deleteViolation = vi.fn().mockResolvedValue(undefined);
    const useCase = new DeleteViolationUseCase(makeRepo({ deleteViolation }));

    await useCase.execute("v-1");

    expect(deleteViolation).toHaveBeenCalledWith("v-1");
  });

  it("rejects with not-found when the id is blank", async () => {
    const deleteViolation = vi.fn();
    const useCase = new DeleteViolationUseCase(makeRepo({ deleteViolation }));

    await expectFailure(() => useCase.execute("  "), "not-found");
    expect(deleteViolation).not.toHaveBeenCalled();
  });
});
