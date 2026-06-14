import { describe, expect, it, vi } from "vitest";
import type { Class } from "../entities/class.entity";
import type { IClassManagementRepository } from "../repositories/i-class-management.repository";
import { RenameClassUseCase } from "./rename-class.use-case";
import { fail, ok } from "./result";

const renamed: Class = {
  id: "c-1",
  name: "10A2",
  gradeLevel: 10,
  status: "ACTIVE",
  academicYear: "2025-2026",
  studentCount: 3,
  homeroomTeacherId: null,
  homeroomTeacherName: null,
};

describe("RenameClassUseCase", () => {
  it("renames a class via the repository", async () => {
    const repo = {
      renameClass: vi.fn().mockResolvedValue(ok(renamed)),
    } as unknown as IClassManagementRepository;
    const useCase = new RenameClassUseCase(repo);
    const result = await useCase.execute("c-1", { name: "10A2" });
    expect(result.ok).toBe(true);
    expect(repo.renameClass).toHaveBeenCalledWith("c-1", { name: "10A2" });
  });

  it("propagates not-found failure", async () => {
    const repo = {
      renameClass: vi.fn().mockResolvedValue(fail({ type: "not-found" })),
    } as unknown as IClassManagementRepository;
    const useCase = new RenameClassUseCase(repo);
    const result = await useCase.execute("missing", { name: "X" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("not-found");
  });
});
