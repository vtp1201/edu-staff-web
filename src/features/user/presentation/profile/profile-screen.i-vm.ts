export interface ProfileSession {
  id: string;
  device: string;
  lastActive: string;
  current: boolean;
}

import type { LinkedAccount } from "@/features/user/domain/entities/linked-account.entity";

export interface ProfileScreenVM {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  sessions: ProfileSession[];
  linkedAccounts: LinkedAccount[];
}
