import type { LinkedAccount } from "@/features/user/domain/entities/linked-account.entity";

export interface ProfileSession {
  id: string;
  device: string;
  lastActive: string;
  current: boolean;
}

export interface ProfileScreenVM {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  sessions: ProfileSession[];
  linkedAccounts: LinkedAccount[];
  /**
   * Present (literal `true`) only when the resolved session role is `parent`
   * — server-driven gate (AC-007.2). Absent (not `false`) for every other role;
   * never carries the fetched children/consent data (that flows through the
   * `onFetchParentConsent`/`onToggleParentConsent` action props, fetched
   * client-side on mount).
   */
  parentConsent?: true;
}
