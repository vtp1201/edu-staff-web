import { describe, expect, it, vi } from "vitest";
import type { GroupEntity } from "../entities/group.entity";
import { AddGroupMembersUseCase } from "./add-group-members.use-case";
import { makeMessagingRepo } from "./group-test-utils";
import { ok } from "./result";

const group: GroupEntity = {
  id: "g1",
  name: "Nhóm",
  description: "",
  kind: "class",
  color: "primary",
  conversationId: "g1",
  members: [],
  pinnedMessages: [],
};

describe("AddGroupMembersUseCase", () => {
  it("adds members via the repo", async () => {
    const addGroupMembers = vi.fn().mockResolvedValue(ok(group));
    const useCase = new AddGroupMembersUseCase(
      makeMessagingRepo({ addGroupMembers }),
    );

    const res = await useCase.execute("g1", ["u2", "u3"]);

    expect(addGroupMembers).toHaveBeenCalledWith("g1", ["u2", "u3"]);
    expect(res).toEqual({ ok: true, value: group });
  });

  it("fails when no members are provided", async () => {
    const addGroupMembers = vi.fn();
    const useCase = new AddGroupMembersUseCase(
      makeMessagingRepo({ addGroupMembers }),
    );

    const res = await useCase.execute("g1", []);

    expect(res.ok).toBe(false);
    expect(addGroupMembers).not.toHaveBeenCalled();
  });
});
