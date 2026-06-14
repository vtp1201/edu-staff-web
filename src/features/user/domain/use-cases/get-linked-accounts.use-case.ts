import type { LinkedAccount } from "../entities/linked-account.entity";
import type { ILinkedAccountsRepository } from "../repositories/i-linked-accounts.repository";

export class GetLinkedAccountsUseCase {
  constructor(private readonly repo: ILinkedAccountsRepository) {}

  async execute(): Promise<LinkedAccount[]> {
    return this.repo.getLinkedAccounts();
  }
}
