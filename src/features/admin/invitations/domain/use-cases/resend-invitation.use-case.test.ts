import { describe, expect, it, vi } from "vitest";
import type { Invitation } from "../entities/invitation.entity";
import type { IInvitationRepository } from "../repositories/i-invitation.repository";
import { ResendInvitationUseCase } from "./resend-invitation.use-case";
import { fail, ok } from "./result";

const row: Invitation = {
  id: "inv-4",
  email: "van.minh@email.com",
  role: "teacher",
  status: "pending",
  invitedBy: "Trần Minh Quân",
  sentAt: "2026-07-18T00:00:00Z",
  expiresAt: "2026-08-01T00:00:00Z",
};

function repoWith(
  resend: IInvitationRepository["resendInvitation"],
): IInvitationRepository {
  return {
    listInvitations: vi.fn(),
    sendInvitationBatch: vi.fn(),
    resendInvitation: resend,
    revokeInvitation: vi.fn(),
  };
}

describe("ResendInvitationUseCase", () => {
  it("returns the refreshed row on success", async () => {
    const resend = vi.fn().mockResolvedValue(ok(row));
    const result = await new ResendInvitationUseCase(repoWith(resend)).execute(
      "inv-4",
    );
    expect(resend).toHaveBeenCalledWith("inv-4");
    expect(result).toEqual(ok(row));
  });

  it("propagates the invitation-invalid race failure", async () => {
    const resend = vi
      .fn()
      .mockResolvedValue(fail({ type: "invitation-invalid" }));
    const result = await new ResendInvitationUseCase(repoWith(resend)).execute(
      "inv-4",
    );
    expect(!result.ok && result.failure.type).toBe("invitation-invalid");
  });
});
