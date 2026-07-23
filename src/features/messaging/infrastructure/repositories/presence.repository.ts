import "server-only";
import type { AxiosInstance } from "axios";
import { NOTI_EP } from "@/bootstrap/endpoint/noti.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import type { PresenceRecord } from "@/features/messaging/domain/entities/presence";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import type { IPresenceRepository } from "@/features/messaging/domain/repositories/i-presence.repository";
import {
  fail,
  ok,
  type Result,
} from "@/features/messaging/domain/use-cases/result";
import type { PresenceListResponseDto } from "../dtos/presence-response.dto";
import { toPresenceRecord } from "../mappers/messaging.mapper";

/**
 * Real hard cap on `userIds` per call (`PRESENCE_USER_IDS_MAX_EXCEEDED`, 422).
 * Current callers (direct-conversation lists / open-group member panels) stay
 * well under this in practice, so we slice defensively rather than build unused
 * chunking machinery — see US-E18.18 finding.
 */
const PRESENCE_USER_IDS_MAX = 50;

/**
 * Real presence repository (US-E18.18, `notification` service via Kong).
 * `GET /api/v1/presence?userIds=` returns `{ items: [{userId, online,
 * lastSeen}] }` (2-state); the interceptor unwraps the envelope, so this repo
 * receives `{ items: [...] }` directly. The mapper derives the domain's 3-state
 * `PresenceState` from `{online, lastSeen}` using an injected clock. Every
 * failure maps to the generic `load-presence-failed` (the UI renders no dot).
 */
export class PresenceRepository implements IPresenceRepository {
  constructor(
    private readonly http: AxiosInstance,
    /** Injected clock (ms) for deterministic recent/offline derivation. */
    private readonly now: () => number = () => Date.now(),
  ) {}

  async getPresence(
    memberIds: string[],
  ): Promise<Result<PresenceRecord[], MessagingFailure>> {
    try {
      const userIds = memberIds.slice(0, PRESENCE_USER_IDS_MAX);
      const res = (await this.http.get(NOTI_EP.presence, {
        params: { userIds: userIds.join(",") },
      })) as unknown as PresenceListResponseDto;
      const nowMs = this.now();
      return ok(
        (res?.items ?? []).map((item) => toPresenceRecord(item, nowMs)),
      );
    } catch (err) {
      return fail({
        type: "load-presence-failed",
        cause: errorCodeOf(err) ?? "noti-service-not-available",
      });
    }
  }
}
