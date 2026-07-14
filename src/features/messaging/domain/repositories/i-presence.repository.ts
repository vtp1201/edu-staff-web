import type { PresenceRecord } from "../entities/presence";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { Result } from "../use-cases/result";

/**
 * Presence snapshot contract (INT-401, US-E10.6). Deliberately a small sibling
 * of `IMessagingRepository` — presence is served by `noti`, not `social`, so it
 * is NOT bolted onto that 12-method contract. Mock-first (decision 0014) until
 * `noti`'s REST surface confirms.
 */
export interface IPresenceRepository {
  getPresence(
    memberIds: string[],
  ): Promise<Result<PresenceRecord[], MessagingFailure>>;
}
