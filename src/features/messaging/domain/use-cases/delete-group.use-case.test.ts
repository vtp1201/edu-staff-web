import { describe, expect, it, vi } from "vitest";
import { DeleteGroupUseCase } from "./delete-group.use-case";
import { makeMessagingRepo } from "./group-test-utils";
import { fail, ok } from "./result";

describe("DeleteGroupUseCase", () => {
  it("deletes the group via the repo", async () => {
    const deleteGroup = vi.fn().mockResolvedValue(ok(true));
    const useCase = new DeleteGroupUseCase(makeMessagingRepo({ deleteGroup }));

    const res = await useCase.execute("g1");

    expect(deleteGroup).toHaveBeenCalledWith("g1");
    expect(res).toEqual({ ok: true, value: true });
  });

  it("surfaces not-group-admin when the caller is not an admin", async () => {
    const deleteGroup = vi
      .fn()
      .mockResolvedValue(fail({ type: "not-group-admin" }));
    const useCase = new DeleteGroupUseCase(makeMessagingRepo({ deleteGroup }));

    const res = await useCase.execute("g1");

    expect(res).toEqual({ ok: false, failure: { type: "not-group-admin" } });
  });
});
