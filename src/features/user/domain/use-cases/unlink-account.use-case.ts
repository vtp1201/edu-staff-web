import type { SocialProvider } from "../entities/linked-account.entity";
import type {
  ILinkedAccountsRepository,
  LinkedAccountResult,
} from "../repositories/i-linked-accounts.repository";

export class UnlinkAccountUseCase {
  constructor(private readonly repo: ILinkedAccountsRepository) {}

  async execute(provider: SocialProvider): Promise<LinkedAccountResult> {
    return this.repo.unlinkAccount(provider);
  }
}
