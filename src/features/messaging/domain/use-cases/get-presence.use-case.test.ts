import { describe, expect, it, vi } from "vitest";
import type { PresenceRecord } from "../entities/presence";
import type { IPresenceRepository } from "../repositories/i-presence.repository";
import { GetPresenceUseCase } from "./get-presence.use-case";
import { fail, ok } from "./result";

const records: PresenceRecord[] = [
  { memberId: "u1", presence: "online", lastActiveAt: "2026-07-14T10:00:00Z" },
];

function makeRepo(
  getPresence: IPresenceRepository["getPresence"],
): IPresenceRepository {
  return { getPresence };
}

describe("GetPresenceUseCase", () => {
  it("delegates to the repo and passes through the ok result", async () => {
    const getPresence = vi.fn().mockResolvedValue(ok(records));
    const useCase = new GetPresenceUseCase(makeRepo(getPresence));

    const res = await useCase.execute(["u1", "u3"]);

    expect(getPresence).toHaveBeenCalledWith(["u1", "u3"]);
    expect(res).toEqual({ ok: true, value: records });
  });

  it("passes through a failure result unchanged", async () => {
    const getPresence = vi
      .fn()
      .mockResolvedValue(fail({ type: "load-presence-failed", cause: "boom" }));
    const useCase = new GetPresenceUseCase(makeRepo(getPresence));

    const res = await useCase.execute(["u1"]);

    expect(res).toEqual({
      ok: false,
      failure: { type: "load-presence-failed", cause: "boom" },
    });
  });

  it("short-circuits to an empty ok result for an empty id set (no repo call)", async () => {
    const getPresence = vi.fn();
    const useCase = new GetPresenceUseCase(makeRepo(getPresence));

    const res = await useCase.execute([]);

    expect(res).toEqual({ ok: true, value: [] });
    expect(getPresence).not.toHaveBeenCalled();
  });
});
