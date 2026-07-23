import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { NOTI_EP } from "@/bootstrap/endpoint/noti.endpoint";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { PresenceListResponseDto } from "../dtos/presence-response.dto";
import { PresenceRepository } from "./presence.repository";

const NOW = Date.parse("2026-07-14T10:00:00Z");

function makeHttp(get: ReturnType<typeof vi.fn>) {
  return { get } as unknown as AxiosInstance;
}

describe("PresenceRepository.getPresence (US-E18.18 real contract)", () => {
  it("sends userIds (not memberIds) and unwraps { items } into 3-state records", async () => {
    const body: PresenceListResponseDto = {
      items: [
        { userId: "u1", online: true, lastSeen: null },
        { userId: "u2", online: false, lastSeen: "2026-07-14T09:57:00Z" },
        { userId: "u3", online: false, lastSeen: "2026-07-14T09:40:00Z" },
      ],
    };
    const get = vi.fn().mockResolvedValue(body);
    const repo = new PresenceRepository(makeHttp(get), () => NOW);

    const res = await repo.getPresence(["u1", "u2", "u3"]);

    expect(get).toHaveBeenCalledWith(NOTI_EP.presence, {
      params: { userIds: "u1,u2,u3" },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toEqual([
      { memberId: "u1", presence: "online", lastActiveAt: "" },
      {
        memberId: "u2",
        presence: "recent",
        lastActiveAt: "2026-07-14T09:57:00Z",
      },
      {
        memberId: "u3",
        presence: "offline",
        lastActiveAt: "2026-07-14T09:40:00Z",
      },
    ]);
  });

  it("caps userIds at 50 (PRESENCE_USER_IDS_MAX_EXCEEDED guard)", async () => {
    const get = vi.fn().mockResolvedValue({ items: [] });
    const repo = new PresenceRepository(makeHttp(get), () => NOW);
    const many = Array.from({ length: 60 }, (_, i) => `u${i}`);

    await repo.getPresence(many);

    const sent = (get.mock.calls[0][1].params.userIds as string).split(",");
    expect(sent).toHaveLength(50);
  });

  it("maps any error to load-presence-failed (renders no dot)", async () => {
    const err = new ApiError({
      code: "PRESENCE_USER_IDS_REQUIRED",
      message: "x",
      retryable: false,
      status: 422,
    });
    const get = vi.fn().mockRejectedValue(err);
    const repo = new PresenceRepository(makeHttp(get), () => NOW);

    const res = await repo.getPresence([]);
    expect(res).toEqual({
      ok: false,
      failure: {
        type: "load-presence-failed",
        cause: "PRESENCE_USER_IDS_REQUIRED",
      },
    });
  });
});
