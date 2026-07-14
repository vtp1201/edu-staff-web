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
import type { PresenceResponseDto } from "../dtos/presence-response.dto";
import { toPresenceRecord } from "../mappers/messaging.mapper";

/**
 * Real presence repository (INT-401, `noti` service). Not shipped yet
 * (mock-first, decision 0014) — the DI factory selects the mock when USE_MOCK.
 * The HTTP interceptor unwraps the envelope; this repo receives the payload
 * directly and maps every failure to the generic `load-presence-failed` (the UI
 * treats all presence failures identically: render no dot).
 */
export class PresenceRepository implements IPresenceRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getPresence(
    memberIds: string[],
  ): Promise<Result<PresenceRecord[], MessagingFailure>> {
    try {
      const dtos = (await this.http.get(NOTI_EP.presence, {
        params: { memberIds: memberIds.join(",") },
      })) as unknown as PresenceResponseDto[];
      return ok(dtos.map(toPresenceRecord));
    } catch (err) {
      return fail({
        type: "load-presence-failed",
        cause: errorCodeOf(err) ?? "noti-service-not-available",
      });
    }
  }
}
