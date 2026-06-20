import { describe, expect, it, vi } from "vitest";
import type { GroupEntity } from "../entities/group.entity";
import { makeMessagingRepo } from "./group-test-utils";
import { RemoveGroupMemberUseCase } from "./remove-group-member.use-case";
import { fail, ok } from "./result";

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

describe("RemoveGroupMemberUseCase", () => {
  it("removes a member via the repo", async () => {
    const removeGroupMember = vi.fn().mockResolvedValue(ok(group));
    const useCase = new RemoveGroupMemberUseCase(
      makeMessagingRepo({ removeGroupMember }),
    );

    const res = await useCase.execute("g1", "u2");

    expect(removeGroupMember).toHaveBeenCalledWith("g1", "u2");
    expect(res).toEqual({ ok: true, value: group });
  });

  it("surfaces not-group-admin when the caller is not an admin", async () => {
    const removeGroupMember = vi
      .fn()
      .mockResolvedValue(fail({ type: "not-group-admin" }));
    const useCase = new RemoveGroupMemberUseCase(
      makeMessagingRepo({ removeGroupMember }),
    );

    const res = await useCase.execute("g1", "u2");

    expect(res).toEqual({ ok: false, failure: { type: "not-group-admin" } });
  });

  it("surfaces not-group-admin when removing another admin", async () => {
    const removeGroupMember = vi
      .fn()
      .mockResolvedValue(fail({ type: "not-group-admin" }));
    const useCase = new RemoveGroupMemberUseCase(
      makeMessagingRepo({ removeGroupMember }),
    );

    const res = await useCase.execute("g1", "admin-2");

    expect(res.ok).toBe(false);
  });
});
