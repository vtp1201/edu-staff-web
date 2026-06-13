import { describe, expect, it, vi } from "vitest";
import type { Subject } from "../entities/subject.entity";
import type { ISubjectCatalogueRepository } from "../repositories/i-subject-catalogue.repository";
import { ArchiveSubjectUseCase } from "./archive-subject.use-case";
import { ok } from "./result";

const mockSubject = (overrides: Partial<Subject> = {}): Subject => ({
  id: "sub-1",
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
  ...overrides,
});

const makeRepo = () =>
  ({
    archiveSubject: vi.fn().mockResolvedValue(ok(undefined)),
  }) as unknown as ISubjectCatalogueRepository;

describe("ArchiveSubjectUseCase", () => {
  it("returns archive-blocked-subject failure when inUse is true", async () => {
    const subject = mockSubject({ inUse: true });
    const repo = makeRepo();
    const useCase = new ArchiveSubjectUseCase(repo);
    const result = await useCase.execute("sub-1", subject);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("archive-blocked-subject");
  });

  it("calls repo.archiveSubject when inUse is false", async () => {
    const subject = mockSubject({ inUse: false });
    const repo = makeRepo();
    const useCase = new ArchiveSubjectUseCase(repo);
    const result = await useCase.execute("sub-1", subject);
    expect(result.ok).toBe(true);
    expect(repo.archiveSubject).toHaveBeenCalledWith("sub-1");
  });
});
