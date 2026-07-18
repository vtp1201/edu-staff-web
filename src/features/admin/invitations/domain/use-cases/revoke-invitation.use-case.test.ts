import { describe, expect, it, vi } from "vitest";
import type { IInvitationRepository } from "../repositories/i-invitation.repository";
import { fail, ok } from "./result";
import { RevokeInvitationUseCase } from "./revoke-invitation.use-case";

function repoWith(
  revoke: IInvitationRepository["revokeInvitation"],
): IInvitationRepository {
  return {
    listInvitations: vi.fn(),
    sendInvitationBatch: vi.fn(),
    resendInvitation: vi.fn(),
    revokeInvitation: revoke,
  };
}

describe("RevokeInvitationUseCase", () => {
  it("resolves ok on success", async () => {
    const revoke = vi.fn().mockResolvedValue(ok(undefined));
    const result = await new RevokeInvitationUseCase(repoWith(revoke)).execute(
      "inv-1",
    );
    expect(revoke).toHaveBeenCalledWith("inv-1");
    expect(result.ok).toBe(true);
  });

  it("propagates the invitation-invalid not-found race (ground-truth #6, not a new not-found type)", async () => {
    const revoke = vi
      .fn()
      .mockResolvedValue(fail({ type: "invitation-invalid" }));
    const result = await new RevokeInvitationUseCase(repoWith(revoke)).execute(
      "inv-1",
    );
    expect(!result.ok && result.failure.type).toBe("invitation-invalid");
  });
});
