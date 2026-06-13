import { describe, expect, it, vi } from "vitest";
import type { Subject } from "../entities/subject.entity";
import type { ISubjectCatalogueRepository } from "../repositories/i-subject-catalogue.repository";
import { CreateSubjectUseCase } from "./create-subject.use-case";
import { ok } from "./result";

const mockCreatedSubject: Subject = {
  id: "sub-new",
  parentId: "sp-1",
  name: "Toán lớp 10",
  code: "MATH10",
  gradeLevel: 10,
  status: "ACTIVE",
  inUse: false,
  periodCount: null,
  requiredAssessmentCount: null,
  outcomeTargets: "",
  masterSyllabus: "",
  exerciseBankRef: "",
  examBankRef: "",
};

const makeRepo = () =>
  ({
    createSubject: vi.fn().mockResolvedValue(ok(mockCreatedSubject)),
  }) as unknown as ISubjectCatalogueRepository;

describe("CreateSubjectUseCase", () => {
  it("returns code-format failure for invalid code", async () => {
    const repo = makeRepo();
    const useCase = new CreateSubjectUseCase(repo);
    const result = await useCase.execute({
      parentId: "sp-1",
      name: "Toán lớp 10",
      code: "math10", // lowercase — invalid
      gradeLevel: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("code-format");
    expect(repo.createSubject).not.toHaveBeenCalled();
  });

  it("creates subject with valid code", async () => {
    const repo = makeRepo();
    const useCase = new CreateSubjectUseCase(repo);
    const result = await useCase.execute({
      parentId: "sp-1",
      name: "Toán lớp 10",
      code: "MATH10",
      gradeLevel: 10,
    });
    expect(result.ok).toBe(true);
    expect(repo.createSubject).toHaveBeenCalled();
  });

  it("creates subject with null code (optional)", async () => {
    const repo = makeRepo();
    const useCase = new CreateSubjectUseCase(repo);
    const result = await useCase.execute({
      parentId: "sp-1",
      name: "Toán lớp 10",
      code: null,
      gradeLevel: 10,
    });
    expect(result.ok).toBe(true);
  });
});
