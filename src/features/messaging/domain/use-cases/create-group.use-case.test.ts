import { describe, expect, it, vi } from "vitest";
import type { GroupEntity } from "../entities/group.entity";
import { CreateGroupUseCase } from "./create-group.use-case";
import { makeMessagingRepo } from "./group-test-utils";
import { ok } from "./result";

const group: GroupEntity = {
  id: "g-new",
  name: "Nhóm Toán",
  description: "",
  kind: "class",
  color: "primary",
  conversationId: "g-new",
  members: [],
  pinnedMessages: [],
};

describe("CreateGroupUseCase", () => {
  it("delegates to the repo for a valid group and returns it", async () => {
    const createGroup = vi.fn().mockResolvedValue(ok(group));
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({
      name: "Nhóm Toán",
      kind: "class",
      color: "primary",
      memberIds: ["u1"],
    });

    expect(createGroup).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Nhóm Toán", memberIds: ["u1"] }),
    );
    expect(res).toEqual({ ok: true, value: group });
  });

  it("fails when the name is missing without calling the repo", async () => {
    const createGroup = vi.fn();
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({
      name: "",
      kind: "class",
      color: "primary",
      memberIds: ["u1"],
    });

    expect(res).toEqual({
      ok: false,
      failure: { type: "create-group-failed", cause: "validation" },
    });
    expect(createGroup).not.toHaveBeenCalled();
  });

  it("fails when the name is shorter than 2 characters", async () => {
    const createGroup = vi.fn();
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({
      name: "A",
      kind: "class",
      color: "primary",
      memberIds: ["u1"],
    });

    expect(res.ok).toBe(false);
    expect(createGroup).not.toHaveBeenCalled();
  });

  it("fails when no members are selected", async () => {
    const createGroup = vi.fn();
    const useCase = new CreateGroupUseCase(makeMessagingRepo({ createGroup }));

    const res = await useCase.execute({
      name: "Nhóm Toán",
      kind: "class",
      color: "primary",
      memberIds: [],
    });

    expect(res.ok).toBe(false);
    expect(createGroup).not.toHaveBeenCalled();
  });
});
