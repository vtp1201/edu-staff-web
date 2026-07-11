import { describe, expect, it, vi } from "vitest";
import type { Department } from "../entities/department.entity";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { CreateDepartmentUseCase } from "./create-department.use-case";
import { fail, ok } from "./result";

const dept = (overrides: Partial<Department> = {}): Department => ({
  id: "dep-1",
  name: "Tổ Khoa học Tự nhiên",
  conceptLabelSuggested: null,
  conceptLabelCustom: null,
  subjectParentIds: [],
  status: "ACTIVE",
  activeAssignmentCount: 0,
  ...overrides,
});

describe("CreateDepartmentUseCase", () => {
  it("delegates to repo.createDepartment and returns the created department", async () => {
    const created = dept({ name: "Tổ Toán" });
    const repo = {
      createDepartment: vi.fn().mockResolvedValue(ok(created)),
    } as unknown as IStaffingRepository;
    const useCase = new CreateDepartmentUseCase(repo);

    const result = await useCase.execute({
      name: "Tổ Toán",
      conceptLabelSuggested: null,
      conceptLabelCustom: null,
      subjectParentIds: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(created);
    expect(repo.createDepartment).toHaveBeenCalledWith({
      name: "Tổ Toán",
      conceptLabelSuggested: null,
      conceptLabelCustom: null,
      subjectParentIds: [],
    });
  });

  it("propagates already-exists failure from repo", async () => {
    const repo = {
      createDepartment: vi
        .fn()
        .mockResolvedValue(fail({ type: "already-exists" })),
    } as unknown as IStaffingRepository;
    const useCase = new CreateDepartmentUseCase(repo);

    const result = await useCase.execute({
      name: "Tổ Toán",
      conceptLabelSuggested: null,
      conceptLabelCustom: null,
      subjectParentIds: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("already-exists");
  });
});
