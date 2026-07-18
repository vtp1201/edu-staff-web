import { describe, expect, it, vi } from "vitest";
import type { Invitation } from "../entities/invitation.entity";
import type { IInvitationRepository } from "../repositories/i-invitation.repository";
import { ListInvitationsUseCase } from "./list-invitations.use-case";
import { fail, ok } from "./result";

const rows: Invitation[] = [
  {
    id: "inv-1",
    email: "a@x.com",
    role: "teacher",
    status: "pending",
    invitedBy: "Admin",
    sentAt: "2026-07-01T00:00:00Z",
    expiresAt: "2026-07-15T00:00:00Z",
  },
];

describe("ListInvitationsUseCase", () => {
  it("returns the repo's invitation list on success", async () => {
    const list = vi.fn().mockResolvedValue(ok(rows));
    const repo: IInvitationRepository = {
      listInvitations: list,
      sendInvitationBatch: vi.fn(),
      resendInvitation: vi.fn(),
      revokeInvitation: vi.fn(),
    };
    const result = await new ListInvitationsUseCase(repo).execute();
    expect(result).toEqual(ok(rows));
  });

  it("propagates a network failure", async () => {
    const repo: IInvitationRepository = {
      listInvitations: vi
        .fn()
        .mockResolvedValue(fail({ type: "network-error" })),
      sendInvitationBatch: vi.fn(),
      resendInvitation: vi.fn(),
      revokeInvitation: vi.fn(),
    };
    const result = await new ListInvitationsUseCase(repo).execute();
    expect(!result.ok && result.failure.type).toBe("network-error");
  });
});
