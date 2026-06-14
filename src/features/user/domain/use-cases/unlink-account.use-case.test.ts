import { describe, expect, it, vi } from "vitest";
import type { ILinkedAccountsRepository } from "../repositories/i-linked-accounts.repository";
import { UnlinkAccountUseCase } from "./unlink-account.use-case";

function makeRepo(
  overrides: Partial<ILinkedAccountsRepository> = {},
): ILinkedAccountsRepository {
  return {
    getLinkedAccounts: vi.fn(),
    linkAccount: vi.fn(),
    unlinkAccount: vi.fn(),
    ...overrides,
  };
}

describe("UnlinkAccountUseCase", () => {
  it("returns success when the repository unlinks the account", async () => {
    const repo = makeRepo({
      unlinkAccount: vi.fn().mockResolvedValue({ success: true }),
    });
    const useCase = new UnlinkAccountUseCase(repo);

    await expect(useCase.execute("vneId")).resolves.toEqual({ success: true });
    expect(repo.unlinkAccount).toHaveBeenCalledWith("vneId");
  });

  it("propagates an unlink-failed failure from the repository", async () => {
    const repo = makeRepo({
      unlinkAccount: vi.fn().mockResolvedValue({
        success: false,
        failure: { type: "unlink-failed", message: "boom" },
      }),
    });
    const useCase = new UnlinkAccountUseCase(repo);

    await expect(useCase.execute("google")).resolves.toEqual({
      success: false,
      failure: { type: "unlink-failed", message: "boom" },
    });
  });
});
