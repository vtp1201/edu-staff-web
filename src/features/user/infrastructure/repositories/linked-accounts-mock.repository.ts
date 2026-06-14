import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  LinkedAccount,
  SocialProvider,
} from "../../domain/entities/linked-account.entity";
import type {
  ILinkedAccountsRepository,
  LinkedAccountResult,
} from "../../domain/repositories/i-linked-accounts.repository";
import type { LinkedAccountDto } from "../dtos/linked-account-response.dto";
import { toLinkedAccounts } from "../mappers/linked-account.mapper";

// Mock-first (decision 0014): IAM exposes no linkedAccounts[] field nor
// link/unlink endpoints. State held in-memory per server lifetime — VNeID linked
// by default, Google unlinked. Swap for a real repo when IAM ships the contract.
const MOCK_STATE: LinkedAccountDto[] = [
  { provider: "vneId", linked: true, email: "a@school.edu.vn" },
  { provider: "google", linked: false },
];

const LINKED_EMAIL: Record<SocialProvider, string> = {
  vneId: "a@school.edu.vn",
  google: "a.nguyen@gmail.com",
};

export class LinkedAccountsMockRepository implements ILinkedAccountsRepository {
  async getLinkedAccounts(): Promise<LinkedAccount[]> {
    await mockDelay(200);
    return toLinkedAccounts(MOCK_STATE);
  }

  async linkAccount(provider: SocialProvider): Promise<LinkedAccountResult> {
    await mockDelay(400);
    const row = MOCK_STATE.find((a) => a.provider === provider);
    if (row) {
      row.linked = true;
      row.email = LINKED_EMAIL[provider];
    }
    return { success: true };
  }

  async unlinkAccount(provider: SocialProvider): Promise<LinkedAccountResult> {
    await mockDelay(400);
    const row = MOCK_STATE.find((a) => a.provider === provider);
    if (row) {
      row.linked = false;
      row.email = undefined;
    }
    return { success: true };
  }
}
