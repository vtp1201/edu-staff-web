import { describe, expect, it, vi } from "vitest";
import type { PositionTitle } from "../entities/position-title.entity";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { ArchivePositionTitleUseCase } from "./archive-position-title.use-case";
import { ok } from "./result";

const title = (overrides: Partial<PositionTitle> = {}): PositionTitle => ({
  id: "pt-1",
  name: "Tổ trưởng chuyên môn",
  scopeType: "SUBJECT_PARENT",
  permissions: [],
  status: "ACTIVE",
  activeAssignmentCount: 0,
  ...overrides,
});

const makeRepo = () =>
  ({
    archivePositionTitle: vi.fn().mockResolvedValue(ok(undefined)),
  }) as unknown as IStaffingRepository;

describe("ArchivePositionTitleUseCase", () => {
  it("returns has-active-assignments failure when activeAssignmentCount > 0 (no repo call)", async () => {
    const repo = makeRepo();
    const useCase = new ArchivePositionTitleUseCase(repo);
    const result = await useCase.execute(
      "pt-1",
      title({ activeAssignmentCount: 5 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("has-active-assignments");
    expect(repo.archivePositionTitle).not.toHaveBeenCalled();
  });

  it("calls repo.archivePositionTitle when activeAssignmentCount is 0", async () => {
    const repo = makeRepo();
    const useCase = new ArchivePositionTitleUseCase(repo);
    const result = await useCase.execute(
      "pt-1",
      title({ activeAssignmentCount: 0 }),
    );
    expect(result.ok).toBe(true);
    expect(repo.archivePositionTitle).toHaveBeenCalledWith("pt-1");
  });
});
