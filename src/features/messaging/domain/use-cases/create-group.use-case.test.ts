import { describe, expect, it, vi } from "vitest";
import type { GroupEntity } from "../entities/group.entity";
import { CreateGroupUseCase } from "./create-group.use-case";
import { makeMessagingRepo } from "./group-test-utils";
import { ok } from "./result";

const group: GroupEntity = {
  id: "g-new",
  name: "Nhóm Toán",
  description: "",
  kind: "other",
  color: "primary",
  conversationId: "g-new",
  members: [],
};

describe("CreateGroupUseCase", () => {
  it("delegates to the repo for a valid group and returns it", async () => {
    const createGroup = vi.fn().mockResolvedValue(ok(group));
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({ name: "  Nhóm Toán  " });

    // US-E18.50: the wire body is `{name}` ONLY — the use-case must not smuggle
    // any extra key through to the repository.
    expect(createGroup).toHaveBeenCalledWith({ name: "Nhóm Toán" });
    expect(res).toEqual({ ok: true, value: group });
  });

  it("fails when the name is missing without calling the repo", async () => {
    const createGroup = vi.fn();
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({ name: "" });

    expect(res).toEqual({
      ok: false,
      failure: { type: "create-group-failed", cause: "validation" },
    });
    expect(createGroup).not.toHaveBeenCalled();
  });

  it("fails when the name is shorter than 2 characters", async () => {
    const createGroup = vi.fn();
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({ name: "A" });

    expect(res.ok).toBe(false);
    expect(createGroup).not.toHaveBeenCalled();
  });

  // The real contract caps `name` at 255 (`CreateGroupRoomRequest`) — reject
  // locally instead of spending a round trip on a guaranteed 422.
  it("fails when the name exceeds the contract's 255-character cap", async () => {
    const createGroup = vi.fn();
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({ name: "n".repeat(256) });

    expect(res).toEqual({
      ok: false,
      failure: { type: "create-group-failed", cause: "validation" },
    });
    expect(createGroup).not.toHaveBeenCalled();
  });

  it("accepts a name exactly at the 255-character cap", async () => {
    const createGroup = vi.fn().mockResolvedValue(ok(group));
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({ name: "n".repeat(255) });

    expect(res.ok).toBe(true);
    expect(createGroup).toHaveBeenCalledTimes(1);
  });

  // Members are no longer part of creation at all (no batch-add surface on the
  // real contract) — a name-only create must reach the repository.
  it("no longer requires members up front", async () => {
    const createGroup = vi.fn().mockResolvedValue(ok(group));
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({ name: "Nhóm Toán" });

    expect(res.ok).toBe(true);
    expect(createGroup).toHaveBeenCalled();
  });
});
