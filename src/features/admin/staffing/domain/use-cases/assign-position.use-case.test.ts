import { describe, expect, it, vi } from "vitest";
import type {
  CreateAssignmentInput,
  PositionAssignment,
} from "../entities/position-assignment.entity";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { AssignPositionUseCase } from "./assign-position.use-case";
import { ok } from "./result";

const assignment = (
  overrides: Partial<PositionAssignment> = {},
): PositionAssignment => ({
  id: "pa-1",
  memberId: "m-1",
  memberName: "Nguyễn Văn A",
  positionTitleId: "pt-1",
  positionTitleName: "Tổ trưởng",
  scopeEntityId: null,
  academicYearId: "ay-2025",
  status: "ACTIVE",
  assignedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const input: CreateAssignmentInput = {
  memberId: "m-1",
  positionTitleId: "pt-1",
  scopeEntityId: null,
  academicYearId: "ay-2025",
};

const makeRepo = () =>
  ({
    createAssignment: vi.fn().mockResolvedValue(ok(assignment())),
  }) as unknown as IStaffingRepository;

describe("AssignPositionUseCase", () => {
  it("returns academic-year-not-active when academicYearIsActive is false (no repo call)", async () => {
    const repo = makeRepo();
    const useCase = new AssignPositionUseCase(repo);
    const result = await useCase.execute(input, false);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.failure.type).toBe("academic-year-not-active");
    expect(repo.createAssignment).not.toHaveBeenCalled();
  });

  it("calls repo.createAssignment when academicYearIsActive is true", async () => {
    const repo = makeRepo();
    const useCase = new AssignPositionUseCase(repo);
    const result = await useCase.execute(input, true);
    expect(result.ok).toBe(true);
    expect(repo.createAssignment).toHaveBeenCalledWith(input);
  });
});
