import { describe, expect, it, vi } from "vitest";
import type { Class } from "../entities/class.entity";
import type { IClassManagementRepository } from "../repositories/i-class-management.repository";
import { CreateClassUseCase } from "./create-class.use-case";
import { ok } from "./result";

const created: Class = {
  id: "c-new",
  name: "10A1",
  gradeLevel: 10,
  status: "ACTIVE",
  academicYear: "2025-2026",
  studentCount: 0,
  homeroomTeacherId: null,
  homeroomTeacherName: null,
};

const makeRepo = () =>
  ({
    createClass: vi.fn().mockResolvedValue(ok(created)),
  }) as unknown as IClassManagementRepository;

describe("CreateClassUseCase", () => {
  it("creates a class with a valid grade level (no range configured)", async () => {
    const repo = makeRepo();
    const useCase = new CreateClassUseCase(repo);
    const result = await useCase.execute(
      { name: "10A1", gradeLevel: 10, academicYear: "2025-2026" },
      null,
    );
    expect(result.ok).toBe(true);
    expect(repo.createClass).toHaveBeenCalledWith({
      name: "10A1",
      gradeLevel: 10,
      academicYear: "2025-2026",
    });
  });

  it("creates a class when grade level is within configured range", async () => {
    const repo = makeRepo();
    const useCase = new CreateClassUseCase(repo);
    const result = await useCase.execute(
      { name: "10A1", gradeLevel: 10, academicYear: "2025-2026" },
      { minGrade: 10, maxGrade: 12 },
    );
    expect(result.ok).toBe(true);
    expect(repo.createClass).toHaveBeenCalled();
  });

  it("returns grade-level-out-of-range when grade is outside configured range", async () => {
    const repo = makeRepo();
    const useCase = new CreateClassUseCase(repo);
    const result = await useCase.execute(
      { name: "6A1", gradeLevel: 6, academicYear: "2025-2026" },
      { minGrade: 10, maxGrade: 12 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.failure.type).toBe("grade-level-out-of-range");
    expect(repo.createClass).not.toHaveBeenCalled();
  });

  it("propagates duplicate-class failure from the repository", async () => {
    const repo = {
      createClass: vi
        .fn()
        .mockResolvedValue({ ok: false, failure: { type: "duplicate-class" } }),
    } as unknown as IClassManagementRepository;
    const useCase = new CreateClassUseCase(repo);
    const result = await useCase.execute(
      { name: "10A1", gradeLevel: 10, academicYear: "2025-2026" },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("duplicate-class");
  });
});
