import { describe, expect, it, vi } from "vitest";
import type {
  CreatePositionTitleInput,
  PositionTitle,
} from "../entities/position-title.entity";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { CreatePositionTitleUseCase } from "./create-position-title.use-case";
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
    createPositionTitle: vi.fn().mockResolvedValue(ok(title())),
  }) as unknown as IStaffingRepository;

const input = (
  overrides: Partial<CreatePositionTitleInput> = {},
): CreatePositionTitleInput => ({
  name: "Tổ trưởng",
  scopeType: "SUBJECT_PARENT",
  permissions: [],
  ...overrides,
});

describe("CreatePositionTitleUseCase", () => {
  it("blocks MANAGE_SUBJECT_CONTENT when scopeType is not SUBJECT_PARENT", async () => {
    const repo = makeRepo();
    const useCase = new CreatePositionTitleUseCase(repo);
    const result = await useCase.execute(
      input({
        scopeType: "DEPARTMENT",
        permissions: ["MANAGE_SUBJECT_CONTENT", "VIEW_GRADE_DATA"],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("invalid-permissions");
    expect(repo.createPositionTitle).not.toHaveBeenCalled();
  });

  it("allows MANAGE_SUBJECT_CONTENT when scopeType is SUBJECT_PARENT", async () => {
    const repo = makeRepo();
    const useCase = new CreatePositionTitleUseCase(repo);
    const result = await useCase.execute(
      input({
        scopeType: "SUBJECT_PARENT",
        permissions: ["MANAGE_SUBJECT_CONTENT"],
      }),
    );
    expect(result.ok).toBe(true);
    expect(repo.createPositionTitle).toHaveBeenCalled();
  });

  it("allows DEPARTMENT scope without MANAGE_SUBJECT_CONTENT", async () => {
    const repo = makeRepo();
    const useCase = new CreatePositionTitleUseCase(repo);
    const result = await useCase.execute(
      input({ scopeType: "DEPARTMENT", permissions: ["APPROVE_LESSON_PLAN"] }),
    );
    expect(result.ok).toBe(true);
    expect(repo.createPositionTitle).toHaveBeenCalled();
  });
});
