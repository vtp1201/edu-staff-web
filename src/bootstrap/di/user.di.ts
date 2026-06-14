import "server-only";
import { GetLinkedAccountsUseCase } from "@/features/user/domain/use-cases/get-linked-accounts.use-case";
import { LinkAccountUseCase } from "@/features/user/domain/use-cases/link-account.use-case";
import { UnlinkAccountUseCase } from "@/features/user/domain/use-cases/unlink-account.use-case";
import { LinkedAccountsMockRepository } from "@/features/user/infrastructure/repositories/linked-accounts-mock.repository";

// Mock-first wiring (decision 0014): no real IAM endpoint for linked accounts.
function makeLinkedAccountsRepository() {
  return new LinkedAccountsMockRepository();
}

export function makeGetLinkedAccountsUseCase() {
  return new GetLinkedAccountsUseCase(makeLinkedAccountsRepository());
}

export function makeLinkedAccountsUseCases() {
  const repo = makeLinkedAccountsRepository();
  return {
    get: new GetLinkedAccountsUseCase(repo),
    link: new LinkAccountUseCase(repo),
    unlink: new UnlinkAccountUseCase(repo),
  };
}
