import type {
  LinkedAccount,
  SocialProvider,
} from "../entities/linked-account.entity";
import type { LinkedAccountFailure } from "../failures/linked-account.failure";

export type LinkedAccountResult =
  | { success: true }
  | { success: false; failure: LinkedAccountFailure };

export interface ILinkedAccountsRepository {
  getLinkedAccounts(): Promise<LinkedAccount[]>;
  linkAccount(provider: SocialProvider): Promise<LinkedAccountResult>;
  unlinkAccount(provider: SocialProvider): Promise<LinkedAccountResult>;
}
