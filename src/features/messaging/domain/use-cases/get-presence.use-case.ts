import type { PresenceRecord } from "../entities/presence";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { IPresenceRepository } from "../repositories/i-presence.repository";
import { ok, type Result } from "./result";

/**
 * INT-401 — fetch a presence snapshot for a bounded set of member ids (batched
 * per render site, never a global fetch). Thin orchestration over
 * `IPresenceRepository`; an empty id set short-circuits without a network call.
 */
export class GetPresenceUseCase {
  constructor(private readonly repo: IPresenceRepository) {}

  execute(
    memberIds: string[],
  ): Promise<Result<PresenceRecord[], MessagingFailure>> {
    if (memberIds.length === 0) return Promise.resolve(ok([]));
    return this.repo.getPresence(memberIds);
  }
}
