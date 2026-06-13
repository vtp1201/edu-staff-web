import { describe, expect, it, vi } from "vitest";
import type { Department } from "../entities/department.entity";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { ArchiveDepartmentUseCase } from "./archive-department.use-case";
import { ok } from "./result";

const dept = (overrides: Partial<Department> = {}): Department => ({
  id: "dep-1",
  name: "Tổ Toán",
  conceptLabel: null,
  subjectParentIds: [],
  status: "ACTIVE",
  activeAssignmentCount: 0,
  ...overrides,
});

const makeRepo = () =>
  ({
    archiveDepartment: vi.fn().mockResolvedValue(ok(undefined)),
  }) as unknown as IStaffingRepository;

describe("ArchiveDepartmentUseCase", () => {
  it("returns has-active-assignments failure when activeAssignmentCount > 0 (no repo call)", async () => {
    const repo = makeRepo();
    const useCase = new ArchiveDepartmentUseCase(repo);
    const result = await useCase.execute(
      "dep-1",
      dept({ activeAssignmentCount: 2 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("has-active-assignments");
    expect(repo.archiveDepartment).not.toHaveBeenCalled();
  });

  it("calls repo.archiveDepartment when activeAssignmentCount is 0", async () => {
    const repo = makeRepo();
    const useCase = new ArchiveDepartmentUseCase(repo);
    const result = await useCase.execute(
      "dep-1",
      dept({ activeAssignmentCount: 0 }),
    );
    expect(result.ok).toBe(true);
    expect(repo.archiveDepartment).toHaveBeenCalledWith("dep-1");
  });
});
