import { describe, expect, it, vi } from "vitest";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { CopyAssignmentsUseCase } from "./copy-assignments.use-case";
import { fail, ok } from "./result";

describe("CopyAssignmentsUseCase", () => {
  it("delegates to repo.copyAssignments and returns the CopyResult", async () => {
    const repo = {
      copyAssignments: vi
        .fn()
        .mockResolvedValue(ok({ copiedCount: 7, skippedCount: 2 })),
    } as unknown as IStaffingRepository;
    const useCase = new CopyAssignmentsUseCase(repo);

    const result = await useCase.execute({
      sourceAcademicYearId: "ay-2024",
      targetAcademicYearId: "ay-2025",
    });

    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value).toEqual({ copiedCount: 7, skippedCount: 2 });
    expect(repo.copyAssignments).toHaveBeenCalledWith({
      sourceAcademicYearId: "ay-2024",
      targetAcademicYearId: "ay-2025",
    });
  });

  it("propagates failure from repo", async () => {
    const repo = {
      copyAssignments: vi.fn().mockResolvedValue(fail({ type: "not-found" })),
    } as unknown as IStaffingRepository;
    const useCase = new CopyAssignmentsUseCase(repo);

    const result = await useCase.execute({
      sourceAcademicYearId: "ay-2024",
      targetAcademicYearId: "ay-2025",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("not-found");
  });
});
