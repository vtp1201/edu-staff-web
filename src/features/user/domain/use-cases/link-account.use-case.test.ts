import { describe, expect, it, vi } from "vitest";
import type { ILinkedAccountsRepository } from "../repositories/i-linked-accounts.repository";
import { LinkAccountUseCase } from "./link-account.use-case";

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

describe("LinkAccountUseCase", () => {
  it("returns success when the repository links the account", async () => {
    const repo = makeRepo({
      linkAccount: vi.fn().mockResolvedValue({ success: true }),
    });
    const useCase = new LinkAccountUseCase(repo);

    await expect(useCase.execute("google")).resolves.toEqual({ success: true });
    expect(repo.linkAccount).toHaveBeenCalledWith("google");
  });

  it("propagates a network-error failure from the repository", async () => {
    const repo = makeRepo({
      linkAccount: vi.fn().mockResolvedValue({
        success: false,
        failure: { type: "network-error" },
      }),
    });
    const useCase = new LinkAccountUseCase(repo);

    await expect(useCase.execute("vneId")).resolves.toEqual({
      success: false,
      failure: { type: "network-error" },
    });
  });
});
