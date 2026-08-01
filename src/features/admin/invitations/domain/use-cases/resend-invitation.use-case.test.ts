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

  it("propagates invitation-not-resendable (409 — row is ACCEPTED/REVOKED)", async () => {
    const resend = vi
      .fn()
      .mockResolvedValue(fail({ type: "invitation-not-resendable" }));
    const result = await new ResendInvitationUseCase(repoWith(resend)).execute(
      "inv-3",
    );
    expect(!result.ok && result.failure.type).toBe("invitation-not-resendable");
  });

  it("propagates rate-limited (429) WITH its retryAfterSeconds intact", async () => {
    const resend = vi
      .fn()
      .mockResolvedValue(
        fail({ type: "rate-limited", retryAfterSeconds: 900 }),
      );
    const result = await new ResendInvitationUseCase(repoWith(resend)).execute(
      "inv-4",
    );
    expect(!result.ok && result.failure).toEqual({
      type: "rate-limited",
      retryAfterSeconds: 900,
    });
  });

  it("propagates rate-limited with no seconds when the server sent no Retry-After", async () => {
    const resend = vi.fn().mockResolvedValue(fail({ type: "rate-limited" }));
    const result = await new ResendInvitationUseCase(repoWith(resend)).execute(
      "inv-4",
    );
    expect(!result.ok && result.failure).toEqual({ type: "rate-limited" });
  });
});
