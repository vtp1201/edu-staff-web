import { describe, expect, it, vi } from "vitest";
import type { GroupEntity } from "../entities/group.entity";
import { makeMessagingRepo } from "./group-test-utils";
import { fail, ok } from "./result";
import { UpdateGroupUseCase } from "./update-group.use-case";

const group: GroupEntity = {
  id: "g1",
  name: "Nhóm Lý 2026",
  description: "",
  kind: "class",
  color: "primary",
  conversationId: "g1",
  members: [],
  pinnedMessages: [],
};

describe("UpdateGroupUseCase", () => {
  it("updates the group when the name is valid", async () => {
    const updateGroup = vi.fn().mockResolvedValue(ok(group));
    const useCase = new UpdateGroupUseCase(makeMessagingRepo({ updateGroup }));

    const res = await useCase.execute({ groupId: "g1", name: "Nhóm Lý 2026" });

    expect(updateGroup).toHaveBeenCalled();
    expect(res).toEqual({ ok: true, value: group });
  });

  it("fails locally when the name is too short", async () => {
    const updateGroup = vi.fn();
    const useCase = new UpdateGroupUseCase(makeMessagingRepo({ updateGroup }));

    const res = await useCase.execute({ groupId: "g1", name: "A" });

    expect(res.ok).toBe(false);
    expect(updateGroup).not.toHaveBeenCalled();
  });

  it("surfaces not-group-admin from the repo", async () => {
    const updateGroup = vi
      .fn()
      .mockResolvedValue(fail({ type: "not-group-admin" }));
    const useCase = new UpdateGroupUseCase(makeMessagingRepo({ updateGroup }));

    const res = await useCase.execute({ groupId: "g1", name: "Nhóm mới" });

    expect(res).toEqual({ ok: false, failure: { type: "not-group-admin" } });
  });
});
