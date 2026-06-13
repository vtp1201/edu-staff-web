import { describe, expect, it, vi } from "vitest";
import type { SubjectParent } from "../entities/subject-parent.entity";
import type { ISubjectCatalogueRepository } from "../repositories/i-subject-catalogue.repository";
import { ArchiveParentUseCase } from "./archive-parent.use-case";
import { ok } from "./result";

const mockParent = (overrides: Partial<SubjectParent> = {}): SubjectParent => ({
  id: "sp-1",
  name: "Toán học",
  conceptType: "BO_MON",
  conceptLabelCustom: null,
  status: "ACTIVE",
  childCount: 3,
  activeChildCount: 3,
  ...overrides,
});

const makeRepo = (parent: SubjectParent) =>
  ({
    getParent: vi.fn().mockResolvedValue(ok(parent)),
    archiveParent: vi.fn().mockResolvedValue(ok(undefined)),
  }) as unknown as ISubjectCatalogueRepository;

describe("ArchiveParentUseCase", () => {
  it("returns archive-blocked-parent failure when activeChildCount > 0", async () => {
    const parent = mockParent({ activeChildCount: 3 });
    const repo = makeRepo(parent);
    const useCase = new ArchiveParentUseCase(repo);
    const result = await useCase.execute("sp-1", parent);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("archive-blocked-parent");
  });

  it("calls repo.archiveParent when activeChildCount is 0", async () => {
    const parent = mockParent({ activeChildCount: 0 });
    const repo = makeRepo(parent);
    const useCase = new ArchiveParentUseCase(repo);
    const result = await useCase.execute("sp-1", parent);
    expect(result.ok).toBe(true);
    expect(repo.archiveParent).toHaveBeenCalledWith("sp-1");
  });
});
