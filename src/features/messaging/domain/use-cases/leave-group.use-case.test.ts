import { describe, expect, it, vi } from "vitest";
import { makeMessagingRepo } from "./group-test-utils";
import { LeaveGroupUseCase } from "./leave-group.use-case";
import { fail, ok } from "./result";

describe("LeaveGroupUseCase", () => {
  it("leaves the group via the repo", async () => {
    const leaveGroup = vi.fn().mockResolvedValue(ok(true));
    const useCase = new LeaveGroupUseCase(makeMessagingRepo({ leaveGroup }));

    const res = await useCase.execute("g1");

    expect(leaveGroup).toHaveBeenCalledWith("g1");
    expect(res).toEqual({ ok: true, value: true });
  });

  it("surfaces the leave-group-failed failure", async () => {
    const leaveGroup = vi
      .fn()
      .mockResolvedValue(fail({ type: "leave-group-failed" }));
    const useCase = new LeaveGroupUseCase(makeMessagingRepo({ leaveGroup }));

    const res = await useCase.execute("g1");

    expect(res).toEqual({ ok: false, failure: { type: "leave-group-failed" } });
  });
});
