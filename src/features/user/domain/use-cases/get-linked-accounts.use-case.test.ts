import { describe, expect, it, vi } from "vitest";
import type { LinkedAccount } from "../entities/linked-account.entity";
import type { ILinkedAccountsRepository } from "../repositories/i-linked-accounts.repository";
import { GetLinkedAccountsUseCase } from "./get-linked-accounts.use-case";

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

describe("GetLinkedAccountsUseCase", () => {
  it("returns the accounts array from the repository", async () => {
    const accounts: LinkedAccount[] = [
      { provider: "vneId", linked: true, email: "a@school.edu.vn" },
      { provider: "google", linked: false },
    ];
    const repo = makeRepo({
      getLinkedAccounts: vi.fn().mockResolvedValue(accounts),
    });
    const useCase = new GetLinkedAccountsUseCase(repo);

    await expect(useCase.execute()).resolves.toEqual(accounts);
    expect(repo.getLinkedAccounts).toHaveBeenCalledTimes(1);
  });
});
